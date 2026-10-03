import { parseBackendDateTime } from "~/lib/datetime";
import type { DroneJourneyEvent, DroneOrderTracking } from "~/stores/apis/admin/droneOrders";

// Phép tính dùng chung cho timeline và bản đồ hành trình drone — khớp logic màn
// theo dõi trên app (drone_delivery_detail.dart, drone_route_geometry.dart).

/** Các chặng của timeline, theo thứ tự. */
export const TIMELINE_STAGES = [
  "AWAITING_DISPATCH",
  "ACCEPTED",
  "LAUNCHING",
  "DEPARTED",
  "EN_ROUTE",
  "APPROACHING",
  "ARRIVED",
  "READY_FOR_PICKUP",
] as const;

export type TimelineStage = (typeof TIMELINE_STAGES)[number];

/** Backend ghi việc gửi mã nhận hàng thành dòng READY_FOR_PICKUP → READY_FOR_PICKUP. */
export function isPickupCodeEvent(event: DroneJourneyEvent): boolean {
  return event.fromStage === "READY_FOR_PICKUP" && event.toStage === "READY_FOR_PICKUP";
}

/** Lần ĐẦU đạt mỗi chặng (nhật ký backend trả mới nhất trước). */
export function stageTimes(order: DroneOrderTracking): Map<string, Date> {
  const times = new Map<string, Date>();
  for (const event of [...order.journeyEvents].reverse()) {
    const at = parseBackendDateTime(event.occurredAt);
    if (!at || isPickupCodeEvent(event) || times.has(event.toStage)) continue;
    times.set(event.toStage, at);
  }
  const created = parseBackendDateTime(order.createdAt);
  if (created && !times.has("AWAITING_DISPATCH")) times.set("AWAITING_DISPATCH", created);
  return times;
}

export function pickupCodeEvent(order: DroneOrderTracking): DroneJourneyEvent | null {
  return order.journeyEvents.find(isPickupCodeEvent) ?? null;
}

/** Gửi hàng = lúc drone rời trạm; chưa có thì lúc khởi phóng. */
export function sentAt(order: DroneOrderTracking): Date | null {
  return stageTimes(order).get("DEPARTED") ?? parseBackendDateTime(order.launchingAt);
}

/** `45 giây`, `3 phút 20 giây`, `1 giờ 5 phút`, `2 ngày 3 giờ`. */
export function durationLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return hours ? `${days} ngày ${hours} giờ` : `${days} ngày`;
  if (hours > 0) return minutes ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  if (minutes > 0) return seconds ? `${minutes} phút ${seconds} giây` : `${minutes} phút`;
  return `${seconds} giây`;
}

/** Khoảng cách đường chim bay, km (haversine). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function kmLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} km`;
}

/**
 * Phần quãng đường đã bay ước theo chặng (điểm giữa mỗi chặng, cùng bảng với
 * `DronePositionBroadcaster`); null khi drone không ở trên không.
 */
export function stageProgress(stage: string | null): number | null {
  switch (stage) {
    case "LAUNCHING":
      return 0;
    case "DEPARTED":
      return 0.125;
    case "EN_ROUTE":
      return 0.525;
    case "APPROACHING":
      return 0.9;
    case "ARRIVED":
      return 1;
    default:
      return null;
  }
}

/** Hướng from → to, độ (0 = Bắc, thuận kim đồng hồ). */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const y = Math.sin(rad(lng2 - lng1)) * Math.cos(rad(lat2));
  const x =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
