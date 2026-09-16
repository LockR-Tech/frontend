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
  title: string;
  /// Key trong scope `order`. Key nào backend chưa có thì bị bỏ qua, không làm vỡ trang.
  keys: string[];
}

export interface ServiceDefinition {
  /// Trùng `OrderType` backend sinh ra — dùng để nối với báo cáo doanh thu và lọc đơn.
  type: AdminOrderType;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  /// Key giá chính, hiện to ở đầu thẻ.
  headlineKey: string;
  headlineSuffix?: string;
  ruleGroups: ServiceRuleGroup[];
}

const OVERTIME_KEYS = [
  OrderSettingsKeys.OVERTIME_FEE_PER_HOUR,
  OrderSettingsKeys.MAX_OVERTIME_FEE,
  OrderSettingsKeys.MAX_OVERTIME_PERCENT,
];

export const SERVICE_CATALOG: ServiceDefinition[] = [
  {
    type: "SEND",
    name: "Gửi hàng qua tủ",
    tagline: "Gửi cho người khác",
    description:
      "Khách bỏ hàng vào ô bằng mã, hệ thống sinh mã mới gửi người nhận để họ tới lấy. "
      + "Thu một lần theo đơn, cộng phí quá giờ nếu người nhận lấy muộn.",
    icon: Package,
    headlineKey: OrderSettingsKeys.SEND_BASE_FEE,
    headlineSuffix: "mỗi đơn",
    ruleGroups: [
      { title: "Giá", keys: [OrderSettingsKeys.SEND_BASE_FEE] },
      { title: "Thời hạn", keys: [OrderSettingsKeys.SEND_PICKUP_HOURS] },
      { title: "Phí quá giờ", keys: OVERTIME_KEYS },
    ],
  },
  {
    type: "RENTAL",
    name: "Thuê ô theo giờ",
    tagline: "Tự gửi đồ của mình",
    description:
      "Khách thuê một ô trong khoảng thời gian chọn trước, có thể gia hạn hoặc uỷ quyền "
      + "người khác lấy hộ. Tính tiền theo giờ và theo loại ô.",
    icon: Box,
    headlineKey: OrderSettingsKeys.RENTAL_RATE_STANDARD,
    headlineSuffix: "mỗi giờ, ô tiêu chuẩn",
    ruleGroups: [
      {
        title: "Giá theo loại ô",
        keys: [
          OrderSettingsKeys.RENTAL_RATE_STANDARD,
          OrderSettingsKeys.RENTAL_RATE_XL,
        ],
      },
      {
        title: "Số giờ thuê",
        keys: [
          OrderSettingsKeys.RENTAL_MIN_HOURS,
          OrderSettingsKeys.RENTAL_MAX_HOURS,
          OrderSettingsKeys.RENTAL_DEFAULT_HOURS,
          OrderSettingsKeys.RENTAL_QUICK_HOURS,
        ],
      },
      {
        title: "Gia hạn",
        keys: [
          OrderSettingsKeys.EXTEND_DEFAULT_HOURS,
          OrderSettingsKeys.EXTEND_MAX_HOURS,
        ],
      },
      { title: "Phí quá giờ", keys: OVERTIME_KEYS },
    ],
  },
  {
    type: "DRONE_DELIVERY",
    name: "Giao hàng bằng drone",
    tagline: "Bay giữa hai tủ",
    description:
      "Drone chở kiện hàng từ tủ nguồn tới tủ đích, người nhận lấy bằng mã tại tủ đích. "
      + "Chỉ dùng được ở tủ có bãi đáp.",
    icon: Plane,
    headlineKey: OrderSettingsKeys.DRONE_DELIVERY_FEE,
    headlineSuffix: "mỗi chuyến",
    ruleGroups: [
      { title: "Giá", keys: [OrderSettingsKeys.DRONE_DELIVERY_FEE] },
      { title: "Thời hạn", keys: [OrderSettingsKeys.DRONE_PICKUP_HOURS] },
      {
        title: "Kiện hàng & an toàn bay",
        keys: [
          OrderSettingsKeys.DRONE_DEFAULT_PARCEL_WEIGHT,
          OrderSettingsKeys.DRONE_MIN_PREFLIGHT_BATTERY,
        ],
      },
      { title: "Phí quá giờ", keys: OVERTIME_KEYS },
    ],
  },
];

/// Quy tắc dùng chung cho cả ba dịch vụ, hiện riêng một khối để không lặp ba lần.
export const SHARED_RULE_GROUP: ServiceRuleGroup = {
  title: "Áp dụng cho mọi dịch vụ",
  keys: [
    OrderSettingsKeys.REQUIRE_PAYMENT_BEFORE_DROP,
    OrderSettingsKeys.AUTO_CANCEL_HOURS,
    OrderSettingsKeys.OVERDUE_RELEASE_HOURS,
    OrderSettingsKeys.REMINDER_COOLDOWN_MINUTES,
  ],
};
