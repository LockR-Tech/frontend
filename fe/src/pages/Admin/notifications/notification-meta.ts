import { NotificationType } from "~/types/admin/enums";
import i18n from "~/utils/i18n";

// Nhãn cho các loại thông báo backend thật sự gửi; loại lạ hiện nguyên mã.
const TYPE_LABEL_KEYS: Record<string, string> = {
  [NotificationType.SYSTEM]: "admin.notifications.type.systemAlert",
  [NotificationType.OPEN_PROMOTION_TAB]: "admin.notifications.type.promotion",
  [NotificationType.ORDER_CREATED]: "admin.notifications.type.orderCreated",
  [NotificationType.ORDER_STATUS]: "admin.notifications.type.orderStatus",
  [NotificationType.ORDER_PARCEL_READY]: "admin.notifications.type.orderParcelReady",
  [NotificationType.ORDER_PARCEL_STORED]: "admin.notifications.type.orderParcelStored",
  [NotificationType.ORDER_PICKUP_OVERDUE]: "admin.notifications.type.orderPickupOverdue",
  [NotificationType.ORDER_EXPIRED]: "admin.notifications.type.orderExpired",
  [NotificationType.ORDER_RENTAL_EXTENDED]: "admin.notifications.type.orderRentalExtended",
  [NotificationType.ORDER_RELOCATED]: "admin.notifications.type.orderRelocated",
  [NotificationType.ORDER_DELEGATED]: "admin.notifications.type.orderDelegated",
  [NotificationType.ORDER_ESCROWED]: "admin.notifications.type.orderEscrowed",
  [NotificationType.PAYMENT_COMPLETED]: "admin.notifications.type.paymentCompleted",
  [NotificationType.REFUND_COMPLETED]: "admin.notifications.type.refundCompleted",
  [NotificationType.REFUND_REJECTED]: "admin.notifications.type.refundRejected",
  [NotificationType.DRONE_ORDER_CREATED]: "admin.notifications.type.droneOrderCreated",
  [NotificationType.DRONE_DELIVERY_STATUS_CHANGED]: "admin.notifications.type.droneDeliveryStatusChanged",
  [NotificationType.DRONE_INCIDENT]: "admin.notifications.type.droneIncident",
  [NotificationType.DRONE_INCIDENT_RESOLUTION_PROPOSED]:
    "admin.notifications.type.droneIncidentResolutionProposed",
  [NotificationType.DRONE_PARCEL_DROP_REPORTED]: "admin.notifications.type.droneParcelDropReported",
  [NotificationType.DRONE_PARCEL_RECOVERY_ASSIGNED]:
    "admin.notifications.type.droneParcelRecoveryAssigned",
  [NotificationType.FEEDBACK_REPLY]: "admin.notifications.type.feedbackReply",
};

export function notificationTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  const key = TYPE_LABEL_KEYS[type];
  return key ? i18n.t(key) : type;
}

/** Nhóm màu theo tiền tố loại. */
export function notificationTypeStyle(type: string | null | undefined): string {
  const t = type ?? "";
  if (t === NotificationType.OPEN_PROMOTION_TAB) return "bg-pink-50 text-pink-700";
  if (t.startsWith("DRONE_INCIDENT") || t === NotificationType.DRONE_PARCEL_DROP_REPORTED)
    return "bg-red-50 text-red-700";
  if (t.startsWith("DRONE_")) return "bg-amber-50 text-amber-700";
  if (t.startsWith("PAYMENT_") || t.startsWith("REFUND_")) return "bg-green-50 text-green-700";
  if (t.startsWith("ORDER_")) return "bg-blue-50 text-blue-700";
  return "bg-muted/30 text-muted-foreground";
}

/** Loại admin được chọn khi tự soạn thông báo (app mobile điều hướng theo type). */
export const COMPOSE_TYPE_OPTIONS = [
  {
    value: NotificationType.SYSTEM,
    labelKey: "admin.notifications.type.systemAlert",
    hintKey: "admin.notifications.composeHint.system",
  },
  {
    value: NotificationType.OPEN_PROMOTION_TAB,
    labelKey: "admin.notifications.type.promotion",
    hintKey: "admin.notifications.composeHint.promotion",
  },
] as const;

/** Ưu tiên `message` backend trả. */
export function notificationErrorMessage(err: unknown, fallback: string): string {
  const e = err as { data?: { message?: unknown }; status?: unknown } | undefined;
  if (typeof e?.data?.message === "string" && e.data.message.trim()) return e.data.message;
  if (e?.status === "FETCH_ERROR") return i18n.t("common.serverUnreachable");
  if (e?.status === 404 || e?.status === 405) return i18n.t("admin.notifications.error.unsupported");
  return fallback;
}
