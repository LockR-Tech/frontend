const OPEN_STAGES = new Set([
  "AWAITING_DISPATCH", "PICKUP_ASSIGNED", "PICKED_UP", "ACCEPTED",
  "LAUNCHING", "DEPARTED", "EN_ROUTE", "APPROACHING", "ARRIVED",
]);

export function canCloseAsFailed(order: { status: string; deliveryStage: string | null; paymentStatus: string | null; paidAt?: string | null }): boolean {
  return order.status === "AWAITING_DISPATCH" && OPEN_STAGES.has(order.deliveryStage ?? "")
    && (order.paymentStatus === "PAID" || order.paidAt != null);
}

export function canAssignPickup(order: { status: string; deliveryStage: string | null }, pickup: { status: string | null }): boolean {
  return order.status === "AWAITING_DISPATCH"
    && ["AWAITING_DISPATCH", "PICKUP_ASSIGNED"].includes(order.deliveryStage ?? "")
    && ["SEARCHING", "OFFERED", "ACCEPTED"].includes(pickup.status ?? "");
}
