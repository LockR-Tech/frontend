import { NotificationType } from "~/types/admin/enums";

// Nhãn cho các loại thông báo backend thật sự gửi; loại lạ hiện nguyên mã.
const TYPE_LABELS: Record<string, string> = {
  [NotificationType.SYSTEM]: "Hệ thống",
  [NotificationType.OPEN_PROMOTION_TAB]: "Khuyến mãi",
  [NotificationType.ORDER_CREATED]: "Tạo đơn",
  [NotificationType.ORDER_STATUS]: "Đổi trạng thái đơn",
  [NotificationType.ORDER_PARCEL_READY]: "Hàng chờ nhận",
  [NotificationType.ORDER_PARCEL_STORED]: "Đã gửi hàng vào tủ",
  [NotificationType.ORDER_PICKUP_OVERDUE]: "Quá hạn lấy hàng",
  [NotificationType.ORDER_EXPIRED]: "Chuyển kho do quá hạn",
  [NotificationType.ORDER_RENTAL_EXTENDED]: "Gia hạn thuê ô",
  [NotificationType.ORDER_RELOCATED]: "Chuyển sang ô mới",
  [NotificationType.ORDER_DELEGATED]: "Uỷ quyền nhận hàng",
  [NotificationType.ORDER_ESCROWED]: "Niêm phong về Hub",
  [NotificationType.PAYMENT_COMPLETED]: "Thanh toán thành công",
  [NotificationType.REFUND_COMPLETED]: "Đã hoàn tiền",
  [NotificationType.REFUND_REJECTED]: "Từ chối hoàn tiền",
  [NotificationType.DRONE_ORDER_CREATED]: "Đơn drone mới",
  [NotificationType.DRONE_DELIVERY_STATUS_CHANGED]: "Trạng thái giao drone",
  [NotificationType.DRONE_INCIDENT]: "Sự cố drone",
  [NotificationType.DRONE_INCIDENT_RESOLUTION_PROPOSED]: "Đề xuất xử lý sự cố",
  [NotificationType.DRONE_PARCEL_DROP_REPORTED]: "Báo rơi kiện hàng",
  [NotificationType.DRONE_PARCEL_RECOVERY_ASSIGNED]: "Giao thu hồi kiện hàng",
  [NotificationType.FEEDBACK_REPLY]: "Phản hồi góp ý",
};

export function notificationTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return TYPE_LABELS[type] ?? type;
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
    label: "Hệ thống",
    hint: "Bấm vào mở chi tiết thông báo trên app.",
  },
  {
    value: NotificationType.OPEN_PROMOTION_TAB,
    label: "Khuyến mãi",
    hint: "Bấm vào mở tab Khuyến mãi trên app.",
  },
] as const;

/** Ưu tiên `message` backend trả. */
export function notificationErrorMessage(err: unknown, fallback: string): string {
  const e = err as { data?: { message?: unknown }; status?: unknown } | undefined;
  if (typeof e?.data?.message === "string" && e.data.message.trim()) return e.data.message;
  if (e?.status === "FETCH_ERROR") return "Không kết nối được máy chủ";
  if (e?.status === 404 || e?.status === 405) return "Máy chủ chưa hỗ trợ thao tác này";
  return fallback;
}
