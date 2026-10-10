// ============================================
// Admin Enums & Constants (from api.md)
// ============================================

// ============================================
// Auth Provider
// ============================================
export const AuthProvider = {
  LOCAL: "LOCAL",
  GOOGLE: "GOOGLE",
  FACEBOOK: "FACEBOOK",
  GITHUB: "GITHUB",
  ZALO: "ZALO",
  PHONE: "PHONE",
  EMAIL: "EMAIL",
} as const;

export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

// ============================================
// Role Name
// ============================================
export const RoleName = {
  USER: "USER",
  STAFF: "STAFF",
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  PARTNER: "PARTNER",
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

// ============================================
// Locker Status
// ============================================
export const LockerStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE",
  DISCONNECTED: "DISCONNECTED",
} as const;

export type LockerStatus = (typeof LockerStatus)[keyof typeof LockerStatus];

// ============================================
// Box Status
// ============================================
export const BoxStatus = {
  AVAILABLE: "AVAILABLE",
  OCCUPIED: "OCCUPIED",
  RESERVED: "RESERVED",
  MAINTENANCE: "MAINTENANCE",
} as const;

export type BoxStatus = (typeof BoxStatus)[keyof typeof BoxStatus];

// ============================================
// Order Type
// ============================================
export const OrderType = {
  LAUNDRY: "LAUNDRY",
  DRY_CLEAN: "DRY_CLEAN",
  STORAGE: "STORAGE",
} as const;

export type OrderType = (typeof OrderType)[keyof typeof OrderType];

// ============================================
// Order Status
// ============================================
export const OrderStatus = {
  INITIALIZED: "INITIALIZED",
  RESERVED: "RESERVED",
  WAITING: "WAITING",
  COLLECTED: "COLLECTED",
  PROCESSING: "PROCESSING",
  READY: "READY",
  RETURNED: "RETURNED",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// ============================================
// Payment Method
// ============================================
export const PaymentMethod = {
  CASH: "CASH",
  WALLET: "WALLET",
  BANK_TRANSFER: "BANK_TRANSFER",
  MOMO: "MOMO",
  VNPAY: "VNPAY",
  ZALOPAY: "ZALOPAY",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// ============================================
// Payment Status
// ============================================
export const PaymentStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELED: "CANCELED",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// ============================================
// Partner Status
// ============================================
export const PartnerStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;

export type PartnerStatus = (typeof PartnerStatus)[keyof typeof PartnerStatus];

// ============================================
// Point Transaction Type
// ============================================
export const PointTransactionType = {
  EARN: "EARN",
  REDEEM: "REDEEM",
  EXPIRE: "EXPIRE",
  ADJUST: "ADJUST",
  BONUS: "BONUS",
  REFUND: "REFUND",
} as const;

export type PointTransactionType =
  (typeof PointTransactionType)[keyof typeof PointTransactionType];

// ============================================
// Stamp Type
// ============================================
export const StampType = {
  BOX: "BOX",
  SERVICE: "SERVICE",
} as const;

export type StampType = (typeof StampType)[keyof typeof StampType];

// ============================================
// Notification Type
// ============================================
// Loại thông báo các service thật sự gửi (grep NotificationRequest ở order/payment-service);
// `type` là chuỗi tự do nên vẫn có thể gặp giá trị khác — UI phải có nhãn dự phòng.
// OPEN_PROMOTION_TAB: app mobile mở tab Khuyến mãi khi bấm (actionType = type).
export const NotificationType = {
  SYSTEM: "SYSTEM",
  OPEN_PROMOTION_TAB: "OPEN_PROMOTION_TAB",
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_STATUS: "ORDER_STATUS",
  ORDER_PARCEL_READY: "ORDER_PARCEL_READY",
  ORDER_PARCEL_STORED: "ORDER_PARCEL_STORED",
  ORDER_PICKUP_OVERDUE: "ORDER_PICKUP_OVERDUE",
  ORDER_EXPIRED: "ORDER_EXPIRED",
  ORDER_RENTAL_EXTENDED: "ORDER_RENTAL_EXTENDED",
  ORDER_RELOCATED: "ORDER_RELOCATED",
  ORDER_DELEGATED: "ORDER_DELEGATED",
  ORDER_ESCROWED: "ORDER_ESCROWED",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  REFUND_COMPLETED: "REFUND_COMPLETED",
  REFUND_REJECTED: "REFUND_REJECTED",
  DRONE_ORDER_CREATED: "DRONE_ORDER_CREATED",
  DRONE_DELIVERY_STATUS_CHANGED: "DRONE_DELIVERY_STATUS_CHANGED",
  DRONE_INCIDENT: "DRONE_INCIDENT",
  DRONE_INCIDENT_RESOLUTION_PROPOSED: "DRONE_INCIDENT_RESOLUTION_PROPOSED",
  DRONE_PARCEL_DROP_REPORTED: "DRONE_PARCEL_DROP_REPORTED",
  DRONE_PARCEL_RECOVERY_ASSIGNED: "DRONE_PARCEL_RECOVERY_ASSIGNED",
  FEEDBACK_REPLY: "FEEDBACK_REPLY",
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

// ============================================
// Notification Status
// ============================================
// notification-service chỉ có UNREAD/READ (không có lưu trữ).
export const NotificationStatus = {
  UNREAD: "UNREAD",
  READ: "READ",
} as const;

export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

// ============================================
// Notification Channel
// ============================================
export const NotificationChannel = {
  IN_APP: "IN_APP",
  EMAIL: "EMAIL",
  SMS: "SMS",
  PUSH: "PUSH",
} as const;

export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

// ============================================
// Discount Type
// ============================================
export const DiscountType = {
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
  FREE_SERVICE: "FREE_SERVICE",
} as const;

export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

// ============================================
// Acquisition Type
// ============================================
export const AcquisitionType = {
  CODE: "CODE",
  POINTS: "POINTS",
  AUTO: "AUTO",
} as const;

export type AcquisitionType =
  (typeof AcquisitionType)[keyof typeof AcquisitionType];

// ============================================
// Reward Type
// ============================================
export const RewardType = {
  DISCOUNT: "DISCOUNT",
  FREE_SERVICE: "FREE_SERVICE",
  MERCHANDISE: "MERCHANDISE",
  VOUCHER: "VOUCHER",
} as const;

export type RewardType = (typeof RewardType)[keyof typeof RewardType];

// ============================================
// Promotion Status (computed)
// ============================================
export const PromotionStatus = {
  ACTIVE: "ACTIVE",
  UPCOMING: "UPCOMING",
  EXPIRED: "EXPIRED",
  DEPLETED: "DEPLETED",
  INACTIVE: "INACTIVE",
} as const;

export type PromotionStatus =
  (typeof PromotionStatus)[keyof typeof PromotionStatus];

// ============================================
// Usage Type
// ============================================
export const UsageType = {
  PROMO_CODE: "PROMO_CODE",
  POINTS_REDEMPTION: "POINTS_REDEMPTION",
} as const;

export type UsageType = (typeof UsageType)[keyof typeof UsageType];

// ============================================
// Usage Status
// ============================================
export const UsageStatus = {
  ACTIVE: "ACTIVE",
  USED: "USED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

export type UsageStatus = (typeof UsageStatus)[keyof typeof UsageStatus];
