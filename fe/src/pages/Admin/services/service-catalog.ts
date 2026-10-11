import { Box, Package, Plane } from "lucide-react";
import { OrderSettingsKeys } from "~/constants/order-settings-keys";
import type { AdminOrderType } from "~/types/admin/reporting";

/// Ba dịch vụ Lock.R đang bán. Đây KHÔNG phải bản ghi trong cơ sở dữ liệu — mỗi dịch
/// vụ là một loại đơn (`OrderType`) mà giá và quy tắc nằm ở `system_settings` của
/// order-service (ADR-0005). Vì vậy "quản lý dịch vụ" = sửa quy tắc + xem hiệu quả,
/// không phải thêm/xoá bản ghi.
///
/// Trang cũ gọi `/api/admin/services` — endpoint đó **không tồn tại** (404, không có
/// cả route ở gateway), là tàn dư từ thời sản phẩm còn là dịch vụ giặt ủi.

export interface ServiceRuleGroup {
  /// Khoá i18n của tiêu đề nhóm.
  titleKey: string;
  /// Key trong scope `order`. Key nào backend chưa có thì bị bỏ qua, không làm vỡ trang.
  keys: string[];
}

export interface ServiceDefinition {
  /// Trùng `OrderType` backend sinh ra — dùng để nối với báo cáo doanh thu và lọc đơn.
  type: AdminOrderType;
  /// Khoá i18n (nameKey/taglineKey/descriptionKey/headlineSuffixKey) — dịch lúc render.
  nameKey: string;
  taglineKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  /// Key giá chính, hiện to ở đầu thẻ.
  headlineKey: string;
  headlineSuffixKey?: string;
  ruleGroups: ServiceRuleGroup[];
}

const OVERTIME_KEYS = [
  OrderSettingsKeys.OVERTIME_FEE_PER_HOUR,
  OrderSettingsKeys.MAX_OVERTIME_FEE,
  OrderSettingsKeys.MAX_OVERTIME_PERCENT,
  OrderSettingsKeys.OVERTIME_GRACE_PERIOD_MINUTES,
];

export const SERVICE_CATALOG: ServiceDefinition[] = [
  {
    type: "SEND",
    nameKey: "admin.services.catalog.send.name",
    taglineKey: "admin.services.catalog.send.tagline",
    descriptionKey: "admin.services.catalog.send.description",
    icon: Package,
    headlineKey: OrderSettingsKeys.SEND_BASE_FEE,
    headlineSuffixKey: "admin.services.catalog.send.headlineSuffix",
    ruleGroups: [
      { titleKey: "admin.services.ruleGroup.price", keys: [OrderSettingsKeys.SEND_BASE_FEE] },
      { titleKey: "admin.services.ruleGroup.duration", keys: [OrderSettingsKeys.SEND_PICKUP_HOURS] },
      { titleKey: "admin.services.ruleGroup.overtime", keys: OVERTIME_KEYS },
    ],
  },
  {
    type: "RENTAL",
    nameKey: "admin.services.catalog.rental.name",
    taglineKey: "admin.services.catalog.rental.tagline",
    descriptionKey: "admin.services.catalog.rental.description",
    icon: Box,
    headlineKey: OrderSettingsKeys.RENTAL_RATE_STANDARD,
    headlineSuffixKey: "admin.services.catalog.rental.headlineSuffix",
    ruleGroups: [
      {
        titleKey: "admin.services.ruleGroup.priceByBoxType",
        keys: [
          OrderSettingsKeys.RENTAL_RATE_STANDARD,
          OrderSettingsKeys.RENTAL_RATE_XL,
        ],
      },
      {
        titleKey: "admin.services.ruleGroup.rentalHours",
        keys: [
          OrderSettingsKeys.RENTAL_MIN_HOURS,
          OrderSettingsKeys.RENTAL_MAX_HOURS,
          OrderSettingsKeys.RENTAL_DEFAULT_HOURS,
          OrderSettingsKeys.RENTAL_QUICK_HOURS,
        ],
      },
      {
        titleKey: "admin.services.ruleGroup.extension",
        keys: [
          OrderSettingsKeys.EXTEND_DEFAULT_HOURS,
          OrderSettingsKeys.EXTEND_MAX_HOURS,
          OrderSettingsKeys.BLOCK_UNPAID_RENTAL_ACCESS,
          OrderSettingsKeys.RENTAL_AUTO_RELEASE_ENABLED,
        ],
      },
      { titleKey: "admin.services.ruleGroup.overtime", keys: OVERTIME_KEYS },
    ],
  },
  {
    type: "DRONE_DELIVERY",
    nameKey: "admin.services.catalog.drone.name",
    taglineKey: "admin.services.catalog.drone.tagline",
    descriptionKey: "admin.services.catalog.drone.description",
    icon: Plane,
    headlineKey: OrderSettingsKeys.DRONE_DELIVERY_FEE,
    headlineSuffixKey: "admin.services.catalog.drone.headlineSuffix",
    ruleGroups: [
      { titleKey: "admin.services.ruleGroup.price", keys: [OrderSettingsKeys.DRONE_DELIVERY_FEE] },
      { titleKey: "admin.services.ruleGroup.duration", keys: [OrderSettingsKeys.DRONE_PICKUP_HOURS] },
      {
        titleKey: "admin.services.ruleGroup.parcelSafety",
        keys: [
          OrderSettingsKeys.DRONE_DEFAULT_PARCEL_WEIGHT,
          OrderSettingsKeys.DRONE_MIN_PREFLIGHT_BATTERY,
        ],
      },
      { titleKey: "admin.services.ruleGroup.overtime", keys: OVERTIME_KEYS },
    ],
  },
];

/// Quy tắc dùng chung cho cả ba dịch vụ, hiện riêng một khối để không lặp ba lần.
export const SHARED_RULE_GROUP: ServiceRuleGroup = {
  titleKey: "admin.services.ruleGroup.shared",
  keys: [
    OrderSettingsKeys.REQUIRE_PAYMENT_BEFORE_DROP,
    OrderSettingsKeys.AUTO_CANCEL_HOURS,
    OrderSettingsKeys.OVERDUE_RELEASE_HOURS,
    OrderSettingsKeys.REMINDER_COOLDOWN_MINUTES,
  ],
};
