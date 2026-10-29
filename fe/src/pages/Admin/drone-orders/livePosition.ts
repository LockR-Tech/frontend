import { useEffect, useState } from "react";
import { useWebSocket } from "~/hooks/useWebSocket";
import type { DroneOrderTracking } from "~/stores/apis/admin/droneOrders";

const IN_FLIGHT = new Set(["LAUNCHING", "DEPARTED", "EN_ROUTE", "APPROACHING", "ARRIVED"]);

/** Snapshot `/topic/deliveries/{orderId}/position` của notification-service. */
export interface PositionSnapshot {
  lat: number;
  lng: number;
  heading?: number | null;
  etaMinutes?: number | null;
  speed?: number | null;
  ts?: number | null;
}

export function isDroneInFlight(order: DroneOrderTracking): boolean {
  return !["COMPLETED", "CANCELED", "EXPIRED"].includes(order.status)
    && IN_FLIGHT.has(order.deliveryStage ?? "");
}

/** Vị trí trực tiếp của một đơn qua STOMP; chỉ kết nối khi drone đang bay. */
export function useLivePosition(orderId: number, enabled: boolean): PositionSnapshot | null {
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
