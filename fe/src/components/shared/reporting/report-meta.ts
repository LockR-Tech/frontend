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
  ArrowUpFromLine,
  Ban,
  Banknote,
  Box,
  CheckCircle2,
  Clock,
  CreditCard,
  Hourglass,
  Landmark,
  Package,
  PackageCheck,
  PiggyBank,
  Plane,
  RotateCcw,
  Route,
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
import i18n from "~/utils/i18n";

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

/** Bảng tĩnh lưu khoá i18n; nhãn được dịch lúc gọi `…Meta` để theo ngôn ngữ hiện tại. */
interface MetaDef {
  labelKey: string;
  style: string;
  icon: React.ElementType;
}

function fallback(value: string | null | undefined): BadgeMeta {
  return { label: value || "—", style: NEUTRAL, icon: Clock };
}

function resolveMeta(
  table: Record<string, MetaDef>,
  value: string | null | undefined,
): BadgeMeta {
  const def = table[value ?? ""];
  if (!def) return fallback(value);
  return { label: i18n.t(def.labelKey), style: def.style, icon: def.icon };
}

// ============================================
// Đơn hàng
// ============================================

const ORDER_STATUS_META: Record<string, MetaDef> = {
  INITIALIZED: { labelKey: "shared.reportMeta.orderStatus.initialized", style: MUTED, icon: Clock },
  STORING: { labelKey: "shared.reportMeta.orderStatus.storing", style: BLUE, icon: Box },
  EXPIRED: { labelKey: "shared.reportMeta.orderStatus.expired", style: AMBER, icon: Timer },
  AWAITING_DISPATCH: { labelKey: "shared.reportMeta.orderStatus.awaitingDispatch", style: VIOLET, icon: Plane },
  COMPLETED: { labelKey: "shared.reportMeta.orderStatus.completed", style: GREEN, icon: CheckCircle2 },
  CANCELED: { labelKey: "shared.reportMeta.orderStatus.canceled", style: RED, icon: XCircle },
  // Giá trị cũ còn sót trong dữ liệu lịch sử.
  RETURNED: { labelKey: "shared.reportMeta.orderStatus.returned", style: NEUTRAL, icon: PackageCheck },
};

export function orderStatusMeta(
  status: AdminOrderStatus | string | null | undefined,
): BadgeMeta {
  return resolveMeta(ORDER_STATUS_META, status);
}

const ORDER_TYPE_META: Record<string, MetaDef> = {
  SEND: { labelKey: "shared.reportMeta.orderType.send", style: BLUE, icon: Package },
  RENTAL: { labelKey: "shared.reportMeta.orderType.rental", style: VIOLET, icon: Box },
  DRONE_DELIVERY: { labelKey: "shared.reportMeta.orderType.droneDelivery", style: AMBER, icon: Plane },
  STORAGE: { labelKey: "shared.reportMeta.orderType.storage", style: NEUTRAL, icon: Box },
};

export function orderTypeMeta(
  type: AdminOrderType | string | null | undefined,
): BadgeMeta {
  return resolveMeta(ORDER_TYPE_META, type);
}

const ORDER_PAYMENT_STATUS_META: Record<string, MetaDef> = {
  UNPAID: { labelKey: "shared.reportMeta.orderPaymentStatus.unpaid", style: AMBER, icon: Hourglass },
  PAID: { labelKey: "shared.reportMeta.orderPaymentStatus.paid", style: GREEN, icon: CheckCircle2 },
  REFUND_PENDING: { labelKey: "shared.reportMeta.orderPaymentStatus.refundPending", style: AMBER, icon: Clock },
  REFUNDED: { labelKey: "shared.reportMeta.orderPaymentStatus.refunded", style: VIOLET, icon: Undo2 },
};

export function orderPaymentStatusMeta(
  status: AdminOrderPaymentStatus | string | null | undefined,
): BadgeMeta {
  return resolveMeta(ORDER_PAYMENT_STATUS_META, status);
}

const DELIVERY_STAGE_META: Record<string, MetaDef> = {
    PICKUP_ASSIGNED: { labelKey: "shared.reportMeta.deliveryStage.pickupAssigned", style: VIOLET, icon: Route },
    PICKED_UP: { labelKey: "shared.reportMeta.deliveryStage.pickedUp", style: BLUE, icon: PackageCheck },
  AWAITING_DISPATCH: { labelKey: "shared.reportMeta.deliveryStage.awaitingDispatch", style: MUTED, icon: Hourglass },
  ACCEPTED: { labelKey: "shared.reportMeta.deliveryStage.accepted", style: NEUTRAL, icon: CheckCircle2 },
  LAUNCHING: { labelKey: "shared.reportMeta.deliveryStage.launching", style: BLUE, icon: Plane },
  DEPARTED: { labelKey: "shared.reportMeta.deliveryStage.departed", style: BLUE, icon: Plane },
  EN_ROUTE: { labelKey: "shared.reportMeta.deliveryStage.enRoute", style: BLUE, icon: Plane },
  APPROACHING: { labelKey: "shared.reportMeta.deliveryStage.approaching", style: BLUE, icon: Plane },
  ARRIVED: { labelKey: "shared.reportMeta.deliveryStage.arrived", style: GREEN, icon: CheckCircle2 },
  READY_FOR_PICKUP: { labelKey: "shared.reportMeta.deliveryStage.readyForPickup", style: GREEN, icon: PackageCheck },
  // Chặng kết thúc — backend đặt deliveryStage theo trạng thái đơn khi đơn drone đóng.
  CANCELED: { labelKey: "shared.reportMeta.deliveryStage.canceled", style: RED, icon: XCircle },
  // Chuyến bay không giao được hàng sau khi đã phóng; đơn đóng là CANCELED để hoàn tiền.
  FAILED: { labelKey: "shared.reportMeta.deliveryStage.failed", style: RED, icon: XCircle },
  COMPLETED: { labelKey: "shared.reportMeta.deliveryStage.completed", style: GREEN, icon: CheckCircle2 },
  EXPIRED: { labelKey: "shared.reportMeta.deliveryStage.expired", style: AMBER, icon: Timer },
  // Kiện bị báo rơi giữa chặng bay — máy trạng thái giao hàng dừng, chờ xử lý sự cố.
  DROP_REPORTED: { labelKey: "shared.reportMeta.deliveryStage.dropReported", style: RED, icon: AlertTriangle },
};

export function deliveryStageMeta(
  stage: DroneDeliveryStage | string | null | undefined,
): BadgeMeta {
  return resolveMeta(DELIVERY_STAGE_META, stage);
}

// ============================================
// Thanh toán
// ============================================

const PAYMENT_STATUS_META: Record<string, MetaDef> = {
  PENDING: { labelKey: "shared.reportMeta.paymentStatus.pending", style: AMBER, icon: Clock },
  COMPLETED: { labelKey: "shared.reportMeta.paymentStatus.completed", style: GREEN, icon: CheckCircle2 },
  FAILED: { labelKey: "shared.reportMeta.paymentStatus.failed", style: RED, icon: XCircle },
};

export function paymentStatusMeta(
  status: AdminPaymentStatus | string | null | undefined,
): BadgeMeta {
  return resolveMeta(PAYMENT_STATUS_META, status);
}

const PAYMENT_METHOD_META: Record<string, MetaDef> = {
  CASH: { labelKey: "shared.reportMeta.paymentMethod.cash", style: NEUTRAL, icon: Banknote },
  WALLET: { labelKey: "shared.reportMeta.paymentMethod.wallet", style: VIOLET, icon: Wallet },
  VNPAY: { labelKey: "shared.reportMeta.paymentMethod.vnpay", style: BLUE, icon: CreditCard },
  MOMO: { labelKey: "shared.reportMeta.paymentMethod.momo", style: VIOLET, icon: Smartphone },
  SEPAY: { labelKey: "shared.reportMeta.paymentMethod.sepay", style: BLUE, icon: Landmark },
  VNPAY_TOPUP: { labelKey: "shared.reportMeta.paymentMethod.vnpayTopup", style: AMBER, icon: PiggyBank },
  SEPAY_TOPUP: { labelKey: "shared.reportMeta.paymentMethod.sepayTopup", style: AMBER, icon: PiggyBank },
};

export function paymentMethodMeta(
  method: AdminPaymentMethod | string | null | undefined,
): BadgeMeta {
  return resolveMeta(PAYMENT_METHOD_META, method);
}

const PAYMENT_KIND_META: Record<string, MetaDef> = {
  ORDER: { labelKey: "shared.reportMeta.paymentKind.order", style: BLUE, icon: Package },
  TOPUP: { labelKey: "shared.reportMeta.paymentKind.topup", style: AMBER, icon: PiggyBank },
};

export function paymentKindMeta(
  kind: AdminPaymentKind | string | null | undefined,
): BadgeMeta {
  return resolveMeta(PAYMENT_KIND_META, kind);
}

const REFUND_STATUS_META: Record<string, MetaDef> = {
  COMPLETED: { labelKey: "shared.reportMeta.refundStatus.completed", style: GREEN, icon: Undo2 },
  PENDING: { labelKey: "shared.reportMeta.refundStatus.pending", style: AMBER, icon: Clock },
  REJECTED: { labelKey: "shared.reportMeta.refundStatus.rejected", style: RED, icon: XCircle },
  FAILED: { labelKey: "shared.reportMeta.refundStatus.failed", style: RED, icon: XCircle },
};

export function refundStatusMeta(
  status: AdminRefundStatus | string | null | undefined,
): BadgeMeta {
  return resolveMeta(REFUND_STATUS_META, status);
}

const WALLET_TYPE_META: Record<string, MetaDef> = {
  CREDIT: { labelKey: "shared.reportMeta.walletType.credit", style: GREEN, icon: CheckCircle2 },
  DEBIT: { labelKey: "shared.reportMeta.walletType.debit", style: RED, icon: Ban },
};

export function walletTypeMeta(
  type: WalletTransactionType | string | null | undefined,
): BadgeMeta {
  return resolveMeta(WALLET_TYPE_META, type);
}

const WALLET_SOURCE_META: Record<string, MetaDef> = {
  TOPUP: { labelKey: "shared.reportMeta.walletSource.topup", style: AMBER, icon: PiggyBank },
  ORDER_PAYMENT: { labelKey: "shared.reportMeta.walletSource.orderPayment", style: BLUE, icon: Package },
  REFUND: { labelKey: "shared.reportMeta.walletSource.refund", style: VIOLET, icon: Undo2 },
  ADJUST: { labelKey: "shared.reportMeta.walletSource.adjust", style: NEUTRAL, icon: RotateCcw },
  WITHDRAW: { labelKey: "shared.reportMeta.walletSource.withdraw", style: RED, icon: ArrowUpFromLine },
};

export function walletSourceMeta(
  source: WalletTransactionSource | string | null | undefined,
): BadgeMeta {
  return resolveMeta(WALLET_SOURCE_META, source);
}

// ============================================
// Doanh thu
// ============================================

const REVENUE_SERVICE_META: Record<string, MetaDef> = {
  SEND: { labelKey: "shared.reportMeta.revenueService.send", style: BLUE, icon: Package },
  RENTAL: { labelKey: "shared.reportMeta.revenueService.rental", style: VIOLET, icon: Box },
  DRONE_DELIVERY: { labelKey: "shared.reportMeta.revenueService.droneDelivery", style: AMBER, icon: Plane },
  OVERTIME_FEE: { labelKey: "shared.reportMeta.revenueService.overtimeFee", style: RED, icon: AlertTriangle },
  STORAGE: { labelKey: "shared.reportMeta.revenueService.storage", style: NEUTRAL, icon: Box },
  OTHER: { labelKey: "shared.reportMeta.revenueService.other", style: NEUTRAL, icon: Box },
  UNKNOWN: { labelKey: "shared.reportMeta.revenueService.unknown", style: MUTED, icon: AlertTriangle },
};

export function revenueServiceMeta(
  serviceType: RevenueServiceType | string | null | undefined,
): BadgeMeta {
  return resolveMeta(REVENUE_SERVICE_META, serviceType);
}
