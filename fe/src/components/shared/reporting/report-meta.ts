// Nhãn, màu và biểu tượng cho các enum nghiệp vụ dùng ở 3 màn hình báo cáo admin.
//
// Giá trị enum lấy từ docs/01-overview/admin-reporting-api.md § 0.6 — đây là bộ
// backend THỰC SỰ sinh ra, khác bộ legacy giặt ủi ở `src/types/admin/enums.ts`
// (bộ cũ vẫn dùng cho các màn hình khác nên không xoá).
//
// Mọi hàm `…Meta` đều trả về giá trị dự phòng khi gặp mã lạ, để màn hình không vỡ
// nếu backend thêm trạng thái mới.

import {
  AlertTriangle,
  Ban,
  Banknote,
  Box,
  CheckCircle2,
  Clock,
  CreditCard,
  Hourglass,
  Package,
  PackageCheck,
  PiggyBank,
  Plane,
  RotateCcw,
  Smartphone,
  Timer,
  Undo2,
  Wallet,
  XCircle,
} from "lucide-react";
import type {
  AdminOrderPaymentStatus,
  AdminOrderStatus,
  AdminOrderType,
  AdminPaymentKind,
  AdminPaymentMethod,
  AdminPaymentStatus,
  AdminRefundStatus,
  DroneDeliveryStage,
  RevenueServiceType,
  WalletTransactionSource,
  WalletTransactionType,
} from "~/types/admin/reporting";

export interface BadgeMeta {
  label: string;
  /** Lớp Tailwind cho `Badge variant="outline"`. */
  style: string;
  icon: React.ElementType;
}

const NEUTRAL = "bg-secondary text-foreground border-border";
const MUTED = "bg-secondary text-muted-foreground border-border";
const GREEN =
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
const AMBER =
  "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
const BLUE = "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20";
const RED = "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
const VIOLET =
  "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20";

function fallback(value: string | null | undefined): BadgeMeta {
  return { label: value || "—", style: NEUTRAL, icon: Clock };
}

// ============================================
// Đơn hàng
// ============================================

const ORDER_STATUS_META: Record<string, BadgeMeta> = {
  INITIALIZED: { label: "Khởi tạo", style: MUTED, icon: Clock },
  STORING: { label: "Đang giữ hàng", style: BLUE, icon: Box },
  EXPIRED: { label: "Quá hạn", style: AMBER, icon: Timer },
  AWAITING_DISPATCH: { label: "Chờ điều phối", style: VIOLET, icon: Plane },
  COMPLETED: { label: "Hoàn thành", style: GREEN, icon: CheckCircle2 },
  CANCELED: { label: "Đã huỷ", style: RED, icon: XCircle },
  // Giá trị cũ còn sót trong dữ liệu lịch sử.
  RETURNED: { label: "Đã trả (cũ)", style: NEUTRAL, icon: PackageCheck },
};

export function orderStatusMeta(
  status: AdminOrderStatus | string | null | undefined,
): BadgeMeta {
  return ORDER_STATUS_META[status ?? ""] ?? fallback(status);
}

const ORDER_TYPE_META: Record<string, BadgeMeta> = {
  SEND: { label: "Gửi hàng", style: BLUE, icon: Package },
  RENTAL: { label: "Thuê ô tủ", style: VIOLET, icon: Box },
  DRONE_DELIVERY: { label: "Giao bằng drone", style: AMBER, icon: Plane },
  STORAGE: { label: "Lưu trữ (cũ)", style: NEUTRAL, icon: Box },
};

export function orderTypeMeta(
  type: AdminOrderType | string | null | undefined,
): BadgeMeta {
  return ORDER_TYPE_META[type ?? ""] ?? fallback(type);
}

const ORDER_PAYMENT_STATUS_META: Record<string, BadgeMeta> = {
  UNPAID: { label: "Chưa thanh toán", style: AMBER, icon: Hourglass },
  PAID: { label: "Đã thanh toán", style: GREEN, icon: CheckCircle2 },
  REFUNDED: { label: "Đã hoàn tiền", style: VIOLET, icon: Undo2 },
};

export function orderPaymentStatusMeta(
  status: AdminOrderPaymentStatus | string | null | undefined,
): BadgeMeta {
  return ORDER_PAYMENT_STATUS_META[status ?? ""] ?? fallback(status);
}

const DELIVERY_STAGE_META: Record<string, BadgeMeta> = {
  AWAITING_DISPATCH: { label: "Chờ điều phối", style: MUTED, icon: Hourglass },
  ACCEPTED: { label: "Đã nhận chuyến", style: NEUTRAL, icon: CheckCircle2 },
  LAUNCHING: { label: "Chuẩn bị cất cánh", style: BLUE, icon: Plane },
  DEPARTED: { label: "Đã cất cánh", style: BLUE, icon: Plane },
  EN_ROUTE: { label: "Đang bay", style: BLUE, icon: Plane },
  APPROACHING: { label: "Sắp tới nơi", style: BLUE, icon: Plane },
  ARRIVED: { label: "Đã tới nơi", style: GREEN, icon: CheckCircle2 },
  READY_FOR_PICKUP: { label: "Sẵn sàng lấy hàng", style: GREEN, icon: PackageCheck },
};

export function deliveryStageMeta(
  stage: DroneDeliveryStage | string | null | undefined,
): BadgeMeta {
  return DELIVERY_STAGE_META[stage ?? ""] ?? fallback(stage);
}

// ============================================
// Thanh toán
// ============================================

const PAYMENT_STATUS_META: Record<string, BadgeMeta> = {
  PENDING: { label: "Chờ thanh toán", style: AMBER, icon: Clock },
  COMPLETED: { label: "Thành công", style: GREEN, icon: CheckCircle2 },
  FAILED: { label: "Thất bại", style: RED, icon: XCircle },
};

export function paymentStatusMeta(
  status: AdminPaymentStatus | string | null | undefined,
): BadgeMeta {
  return PAYMENT_STATUS_META[status ?? ""] ?? fallback(status);
}

const PAYMENT_METHOD_META: Record<string, BadgeMeta> = {
  CASH: { label: "Tiền mặt", style: NEUTRAL, icon: Banknote },
  WALLET: { label: "Ví Lock.R", style: VIOLET, icon: Wallet },
  VNPAY: { label: "VNPay", style: BLUE, icon: CreditCard },
  MOMO: { label: "MoMo", style: VIOLET, icon: Smartphone },
  VNPAY_TOPUP: { label: "Nạp ví qua VNPay", style: AMBER, icon: PiggyBank },
};

export function paymentMethodMeta(
  method: AdminPaymentMethod | string | null | undefined,
): BadgeMeta {
  return PAYMENT_METHOD_META[method ?? ""] ?? fallback(method);
}

const PAYMENT_KIND_META: Record<string, BadgeMeta> = {
  ORDER: { label: "Thu theo đơn", style: BLUE, icon: Package },
  TOPUP: { label: "Nạp ví", style: AMBER, icon: PiggyBank },
};

export function paymentKindMeta(
  kind: AdminPaymentKind | string | null | undefined,
): BadgeMeta {
  return PAYMENT_KIND_META[kind ?? ""] ?? fallback(kind);
}

const REFUND_STATUS_META: Record<string, BadgeMeta> = {
  COMPLETED: { label: "Đã hoàn", style: GREEN, icon: Undo2 },
  PENDING: { label: "Chờ hoàn", style: AMBER, icon: Clock },
  FAILED: { label: "Hoàn thất bại", style: RED, icon: XCircle },
};

export function refundStatusMeta(
  status: AdminRefundStatus | string | null | undefined,
): BadgeMeta {
  return REFUND_STATUS_META[status ?? ""] ?? fallback(status);
}

const WALLET_TYPE_META: Record<string, BadgeMeta> = {
  CREDIT: { label: "Cộng tiền", style: GREEN, icon: CheckCircle2 },
  DEBIT: { label: "Trừ tiền", style: RED, icon: Ban },
};

export function walletTypeMeta(
  type: WalletTransactionType | string | null | undefined,
): BadgeMeta {
  return WALLET_TYPE_META[type ?? ""] ?? fallback(type);
}

const WALLET_SOURCE_META: Record<string, BadgeMeta> = {
  TOPUP: { label: "Nạp ví", style: AMBER, icon: PiggyBank },
  ORDER_PAYMENT: { label: "Thanh toán đơn", style: BLUE, icon: Package },
  REFUND: { label: "Hoàn tiền", style: VIOLET, icon: Undo2 },
  ADJUST: { label: "Điều chỉnh tay", style: NEUTRAL, icon: RotateCcw },
};

export function walletSourceMeta(
  source: WalletTransactionSource | string | null | undefined,
): BadgeMeta {
  return WALLET_SOURCE_META[source ?? ""] ?? fallback(source);
}

// ============================================
// Doanh thu
// ============================================

const REVENUE_SERVICE_META: Record<string, BadgeMeta> = {
  SEND: { label: "Gửi hàng", style: BLUE, icon: Package },
  RENTAL: { label: "Thuê ô tủ", style: VIOLET, icon: Box },
  DRONE_DELIVERY: { label: "Giao bằng drone", style: AMBER, icon: Plane },
  OVERTIME_FEE: { label: "Phí quá hạn", style: RED, icon: AlertTriangle },
  STORAGE: { label: "Lưu trữ (cũ)", style: NEUTRAL, icon: Box },
  OTHER: { label: "Khác", style: NEUTRAL, icon: Box },
  UNKNOWN: { label: "Không rõ đơn", style: MUTED, icon: AlertTriangle },
};

export function revenueServiceMeta(
  serviceType: RevenueServiceType | string | null | undefined,
): BadgeMeta {
  return REVENUE_SERVICE_META[serviceType ?? ""] ?? fallback(serviceType);
}
