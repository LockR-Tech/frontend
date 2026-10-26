// Tin realtime → các tag RTK Query cần tải lại trên web quản trị.
//
// Server (notification-service) đẩy lên các topic dưới đây mỗi khi dữ liệu đổi — bất kể ai đổi: khách
// trên app, KTV, kiosk, quét định kỳ hay admin khác. Trang nào đang hiện dữ liệu có tag tương ứng sẽ tự
// tải lại, không cần bấm làm mới.

export const ADMIN_REALTIME_TOPICS = [
  "/topic/orders",
  "/topic/notifications",
  "/topic/lockers",
  "/topic/public/locker-availability",
  "/topic/public/catalog",
  "/topic/staff/maintenance",
  "/topic/admin/changes",
] as const;

export type AdminRealtimeTopic = (typeof ADMIN_REALTIME_TOPICS)[number];

export interface RealtimeMessage {
  entity?: unknown;
  type?: unknown;
}

const ORDER_TAGS = ["Orders", "Dashboard", "Scheduler", "DroneOrders", "Payments", "PaymentStats", "Revenue"];

/** Tag cần tải lại khi [topic] nhận [message]; mảng rỗng = bỏ qua. */
export function tagsForRealtimeMessage(topic: string, message: RealtimeMessage | null | undefined): string[] {
  const entity = String(message?.entity ?? "").toUpperCase();
  switch (topic) {
    case "/topic/orders":
      return ORDER_TAGS;
    case "/topic/notifications":
      // Phản hồi/khiếu nại của khách (feedbackApi) dùng chung tag Notifications.
      return ["Notifications", "NotificationStats"];
    case "/topic/lockers":
    case "/topic/public/locker-availability":
      return ["Lockers"];
    case "/topic/public/catalog":
      if (entity === "PROMOTION") return ["Promotions"];
      if (entity === "STORE") return ["Stores", "Lockers"];
      if (entity === "LOCKER") return ["Lockers"];
      return [];
    case "/topic/staff/maintenance":
      if (entity === "DRONE") return ["Drones"];
      if (entity === "DRONE_ORDER") return ["DroneOrders", "DroneOrder"];
      if (entity === "DRONE_INCIDENT") return ["DroneIncidents", "DroneOrders"];
      // Phiếu sự cố, lịch kiểm tra, tủ, thiết bị IoT: lockerOps dùng tag Lockers.
      if (["REPORT", "SCHEDULE", "LOCKER", "DEVICE"].includes(entity)) return ["Lockers"];
      return [];
    case "/topic/admin/changes":
      switch (entity) {
        case "USER":
          return ["Users", "Dashboard"];
        case "ORDER":
          return ORDER_TAGS;
        case "PAYMENT":
          return ["Payments", "PaymentStats", "Revenue", "WalletTransactions", "Dashboard"];
        case "REFUND":
          return ["PaymentRefunds", "Payments", "PaymentStats", "Revenue"];
        case "WITHDRAWAL":
        case "WALLET":
          return ["Wallet", "WalletTransactions", "PaymentStats"];
        case "LOYALTY":
          return ["Loyalty"];
        case "FEEDBACK":
          return ["Notifications", "Orders"];
        default:
          return [];
      }
    default:
      return [];
  }
}
