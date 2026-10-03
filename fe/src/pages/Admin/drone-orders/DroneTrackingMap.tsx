import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import { useWebSocket } from "~/hooks/useWebSocket";
import { deliveryStageMeta } from "~/components/shared/reporting";
import { formatTime } from "~/lib/datetime";
import type { DroneOrderTracking } from "~/stores/apis/admin/droneOrders";
import { bearing, distanceKm, durationLabel, kmLabel, stageProgress } from "./journey";

const IN_FLIGHT = new Set(["LAUNCHING", "DEPARTED", "EN_ROUTE", "APPROACHING", "ARRIVED"]);

/** Snapshot `/topic/deliveries/{orderId}/position` của notification-service. */
interface PositionSnapshot {
  lat: number;
  lng: number;
  heading?: number | null;
  etaMinutes?: number | null;
  speed?: number | null;
  ts?: number | null;
}

function pointIcon(label: string, color: string) {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:${color};border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.3);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:13px">${label}</div>`,
  });
}

function droneIcon(heading: number, live: boolean) {
  const color = live ? "#0a2342" : "#64748b";
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div style="width:36px;height:36px;border-radius:9999px;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg)"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l7 19-7-4-7 4z"/></svg></div>`,
  });
}

const SOURCE_ICON = pointIcon("A", "#0f766e");
const DESTINATION_ICON = pointIcon("B", "#0a2342");

/**
 * Bản đồ hành trình trong dialog admin: tủ gửi A, tủ nhận B, lộ trình dự kiến, đoạn
 * đã bay và vị trí drone. Đơn đang bay thì nghe vị trí trực tiếp qua STOMP; chưa có
 * snapshot nào (vd drone thật chưa có telemetry) thì đặt drone theo chặng hiện tại.
 */
export function DroneTrackingMap({ order }: { order: DroneOrderTracking }) {
  const source = order.sourceLocker;
  const destination = order.destinationLocker;
  const inFlight = !["COMPLETED", "CANCELED", "EXPIRED"].includes(order.status)
    && IN_FLIGHT.has(order.deliveryStage ?? "");
  const live = useLivePosition(order.orderId, inFlight);
  const [, tick] = useState(0);

  // Đồng hồ đếm ngược ETA chạy theo giây giữa hai snapshot.
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  const a = source?.latitude != null && source.longitude != null
    ? ([source.latitude, source.longitude] as [number, number])
    : null;
  const b = destination?.latitude != null && destination.longitude != null
    ? ([destination.latitude, destination.longitude] as [number, number])
    : null;

  const bounds = useMemo(
    () => (a && b ? L.latLngBounds([a, b]).pad(0.3) : null),
    [a?.[0], a?.[1], b?.[0], b?.[1]],
  );

  if (!a || !b || !bounds) {
    return (
      <p className="text-sm text-muted-foreground">
        Tủ gửi hoặc tủ nhận chưa có toạ độ nên chưa vẽ được bản đồ hành trình.
      </p>
    );
  }

  const progress = inFlight ? stageProgress(order.deliveryStage) : null;
  const delivered = ["READY_FOR_PICKUP"].includes(order.deliveryStage ?? "")
    || order.status === "COMPLETED";
  const estimated = progress === null
    ? null
    : ([a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress] as [number, number]);
  const drone = live ? ([live.lat, live.lng] as [number, number]) : estimated;
  const heading = live?.heading ?? bearing(a[0], a[1], b[0], b[1]);
  const totalKm = distanceKm(a[0], a[1], b[0], b[1]);
  const remainingKm = drone ? distanceKm(drone[0], drone[1], b[0], b[1]) : null;
  const eta = live ? arrival(live, remainingKm) : null;
  const stage = deliveryStageMeta(order.deliveryStage);

  return (
    <div className="space-y-3">
      <div className="h-72 overflow-hidden rounded-lg border">
        <MapContainer
          key={order.orderId}
          bounds={bounds}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={[a, b]} pathOptions={{ color: "#94a3b8", weight: 3, dashArray: "8 6" }} />
          {(drone || delivered) && (
            <Polyline positions={[a, drone ?? b]} pathOptions={{ color: "#1e5a8a", weight: 4 }} />
          )}
          <Marker position={a} icon={SOURCE_ICON}>
            <Tooltip direction="top">Tủ gửi · {source?.name ?? source?.code}</Tooltip>
          </Marker>
          <Marker position={b} icon={DESTINATION_ICON}>
            <Tooltip direction="top">Tủ nhận · {destination?.name ?? destination?.code}</Tooltip>
          </Marker>
          {drone && (
            <Marker position={drone} icon={droneIcon(heading, Boolean(live))}>
              <Tooltip direction="top">
                {order.droneCode ?? "Drone"} · {live ? "vị trí trực tiếp" : "vị trí ước theo chặng"}
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Chặng hiện tại" value={stage.label} />
        <Metric label="Quãng đường A → B" value={kmLabel(totalKm)} />
        <Metric
          label="Còn lại"
          value={remainingKm === null ? (delivered ? "Đã tới nơi" : "—") : kmLabel(remainingKm)}
        />
        <Metric
          label="Dự kiến đến"
          value={
            eta
              ? `${formatTime(eta)} · còn ${durationLabel(eta.getTime() - Date.now())}`
              : order.etaMinutes != null && inFlight
                ? `khoảng ${order.etaMinutes} phút`
                : "—"
          }
        />
      </div>
      {drone && (
        <p className="font-mono text-[11px] text-muted-foreground">
          Vĩ độ, kinh độ: {drone[0].toFixed(6)}, {drone[1].toFixed(6)}
          {live ? " · trực tiếp" : " · ước theo chặng (chưa có tín hiệu vị trí)"}
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

/** Giờ tới nơi: còn lại / tốc độ nếu có tốc độ, không thì ETA theo chặng của snapshot. */
function arrival(snapshot: PositionSnapshot, remainingKm: number | null): Date | null {
  const base = snapshot.ts ? snapshot.ts : Date.now();
  if (remainingKm !== null && snapshot.speed && snapshot.speed > 0.5) {
    return new Date(base + (remainingKm * 1000 * 1000) / snapshot.speed);
  }
  if (snapshot.etaMinutes != null) return new Date(base + snapshot.etaMinutes * 60_000);
  return null;
}

/** Vị trí trực tiếp của một đơn qua STOMP; chỉ kết nối khi drone đang bay. */
function useLivePosition(orderId: number, enabled: boolean): PositionSnapshot | null {
  const { connected, connect, disconnect, subscribe } = useWebSocket();
  // Gắn snapshot với đơn của nó để đổi sang đơn khác không hiện nhầm vị trí cũ.
  const [latest, setLatest] = useState<{ orderId: number; snapshot: PositionSnapshot } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => disconnect();
  }, [orderId, enabled, connect, disconnect]);

  useEffect(() => {
    if (!enabled || !connected) return;
    const subscription = subscribe<PositionSnapshot>(
      `/topic/deliveries/${orderId}/position`,
      (next) => {
        if (typeof next?.lat === "number" && typeof next?.lng === "number") {
          setLatest({ orderId, snapshot: next });
        }
      },
    );
    return () => subscription?.unsubscribe();
  }, [orderId, enabled, connected, subscribe]);

  return enabled && latest?.orderId === orderId ? latest.snapshot : null;
}
