/// Key quy tắc nghiệp vụ của order-service (scope `order`).
///
/// Chép đúng tên hằng trong `backend/order-service/…/settings/OrderSettingsCatalog.java`.
/// Web KHÔNG tự suy ra danh sách key — nó đọc metadata từ `GET /api/admin/settings/order`;
/// các hằng ở đây chỉ để **chọn ra và xếp nhóm** những key thuộc về từng dịch vụ.
/// Backend đổi tên key thì trang dịch vụ chỉ mất dòng tương ứng, không vỡ.
export const OrderSettingsKeys = {
  SEND_BASE_FEE: "app.order.send-base-fee",
  DRONE_DELIVERY_FEE: "app.order.drone-delivery-fee",
  RENTAL_RATE_STANDARD: "app.order.rental-rate-standard",
  RENTAL_RATE_XL: "app.order.rental-rate-xl",

  OVERTIME_FEE_PER_HOUR: "app.order.pickup-overtime-fee-per-hour",
  MAX_OVERTIME_FEE: "app.order.pickup-max-overtime-fee",
  MAX_OVERTIME_PERCENT: "app.order.pickup-max-overtime-percent",

  SEND_PICKUP_HOURS: "app.order.send-pickup-hours-limit",
  DRONE_PICKUP_HOURS: "app.order.drone-pickup-hours-limit",
  AUTO_CANCEL_HOURS: "app.order.auto-cancel-hours",
  OVERDUE_RELEASE_HOURS: "app.order.overdue-release-hours",
  REMINDER_COOLDOWN_MINUTES: "app.order.reminder-cooldown-minutes",

  RENTAL_MIN_HOURS: "app.order.rental-min-hours",
  RENTAL_MAX_HOURS: "app.order.rental-max-hours",
  RENTAL_DEFAULT_HOURS: "app.order.rental-default-hours",
  RENTAL_QUICK_HOURS: "app.order.rental-quick-hours",
  EXTEND_DEFAULT_HOURS: "app.order.extend-default-hours",
  EXTEND_MAX_HOURS: "app.order.extend-max-hours",

  REQUIRE_PAYMENT_BEFORE_DROP: "app.order.require-payment-before-drop",

  DRONE_DEFAULT_PARCEL_WEIGHT: "app.order.drone-default-parcel-weight-grams",
  DRONE_MIN_PREFLIGHT_BATTERY: "app.order.drone-min-preflight-battery-percent",
} as const;
