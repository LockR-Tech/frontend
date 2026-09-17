// Kiểu dữ liệu cho báo cáo admin: đơn hàng, thanh toán, doanh thu.
// Hợp đồng API: ../../../../docs/01-overview/admin-reporting-api.md
//
// Quy ước quan trọng:
// - Mọi trường `LocalDateTime` là chuỗi ISO KHÔNG offset và mang giờ UTC — hiển thị
//   bằng `formatDateTime` ở `~/lib/datetime` (ra `HH:mm:ss dd/MM/yyyy` giờ Việt Nam).
// - Mọi trường `LocalDate` (`from`, `to`, `date`) là `yyyy-MM-dd` và ĐÃ là ngày Việt Nam.
// - Tiền là số VND (BigDecimal), phần trăm 2 chữ số thập phân, `null` = không có kỳ nền.

// ============================================
// Chung
// ============================================

/**
 * Envelope thật của backend báo cáo — khác `ApiResponse` cũ ở `src/types/auth.ts`
 * (không có `status`/`timestamp`, nhưng có `success` và `code`).
 */
export interface ReportEnvelope<T> {
  success: boolean;
  code: string | null;
  message?: string | null;
  data: T;
  errors?: unknown;
}

/**
 * Thân lỗi backend trả kèm mã nghiệp vụ, ví dụ `PAYMENT_DATA_UNAVAILABLE` (503),
 * `INVALID_DATE_RANGE`, `NOT_FOUND`. UI phải báo lỗi thay vì hiển thị số 0.
 */
export interface ReportErrorBody {
  success: false;
  code: string;
  message?: string | null;
}

/** Trang dữ liệu chuẩn của các API báo cáo (`data` của envelope). */
export interface ReportPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Khoảng ngày Việt Nam dùng cho mọi màn hình báo cáo. */
export interface DateRange {
  from: string;
  to: string;
}

export interface CustomerSummary {
  id: number;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  status?: string | null;
}

export interface LockerSummary {
  id: number;
  code: string | null;
  name: string | null;
  address: string | null;
  storeId: number | null;
  status: string | null;
}

export interface StoreSummary {
  id: number;
  name: string | null;
  address: string | null;
  contactPhone: string | null;
}

// ============================================
// Đơn hàng — /api/admin/orders/search, /{id}/detail
// ============================================

/** Trạng thái đơn thực tế backend sinh ra (`RETURNED` là giá trị cũ còn sót). */
export const ADMIN_ORDER_STATUSES = [
  "INITIALIZED",
  "STORING",
  "EXPIRED",
  "AWAITING_DISPATCH",
  "COMPLETED",
  "CANCELED",
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number] | "RETURNED";

/** Loại đơn (`STORAGE` là giá trị cũ còn sót). */
export const ADMIN_ORDER_TYPES = ["SEND", "RENTAL", "DRONE_DELIVERY"] as const;

export type AdminOrderType = (typeof ADMIN_ORDER_TYPES)[number] | "STORAGE";

export const ADMIN_ORDER_PAYMENT_STATUSES = ["UNPAID", "PAID", "REFUNDED"] as const;

export type AdminOrderPaymentStatus =
  (typeof ADMIN_ORDER_PAYMENT_STATUSES)[number];

export type DroneDeliveryStage =
  | "AWAITING_DISPATCH"
  | "ACCEPTED"
  | "LAUNCHING"
  | "DEPARTED"
  | "EN_ROUTE"
  | "APPROACHING"
  | "ARRIVED"
  | "READY_FOR_PICKUP";

export interface AdminOrderReceiver {
  userId: number | null;
  name: string | null;
  phone: string | null;
  accountFullName: string | null;
  accountPhoneNumber: string | null;
  accountEmail: string | null;
}

/** Bóc tách phí của đơn. `overtimeFee` = `extraFee`; `basePrice` = `totalPrice − extraFee`. */
export interface AdminOrderFees {
  originalPrice: number | null;
  reservationFee: number | null;
  storagePrice: number | null;
  shippingFee: number | null;
  extraFee: number | null;
  overtimeFee: number | null;
  discount: number | null;
  basePrice: number | null;
  totalPrice: number | null;
}

/** Tổng hợp thanh toán của đơn, lấy từ payment-service. `null` = không gọi được service. */
export interface AdminOrderPaymentSummary {
  paymentCount: number;
  latestPaymentId: number | null;
  latestMethod: string | null;
  latestStatus: string | null;
  latestAmount: number | null;
  latestCreatedAt: string | null;
  paidAmount: number | null;
  lastPaidMethod: string | null;
  lastPaidAt: string | null;
  refundedAmount: number | null;
  outstandingAmount: number | null;
}

/** Thông tin chuyến bay drone, chỉ có khi `type = DRONE_DELIVERY`. */
export interface AdminOrderDrone {
  missionId: number | null;
  missionStatus: string | null;
  deliveryStage: DroneDeliveryStage | null;
  droneUnitId: number | null;
  droneCode: string | null;
  sourceLockerId: number | null;
  sourceLocker: LockerSummary | null;
  destinationLockerId: number | null;
  assignedByUserId: number | null;
  readyToLaunchAt: string | null;
  launchingAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminOrderTimelineEntry {
  oldStatus: AdminOrderStatus | null;
  newStatus: AdminOrderStatus;
  changedByUserId: number | null;
  changedByName: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminOrderDetailLine {
  id: number;
  serviceId: number | null;
  serviceName: string | null;
  serviceImage: string | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  description: string | null;
}

/**
 * Một đơn hàng ở màn hình admin. Các đối tượng làm giàu (`customer`, `locker`,
 * `store`, `payment`, `drone`, số ô) là `null` khi không có dữ liệu hoặc service
 * nguồn lỗi — danh sách vẫn hiển thị được.
 */
export interface AdminOrder {
  id: number;
  orderCode: string | null;
  userId: number | null;
  receiverId: number | null;
  lockerId: number | null;
  sendBoxId: number | null;
  receiveBoxId: number | null;
  storeId: number | null;
  staffId: number | null;
  type: AdminOrderType;
  serviceCategory: string | null;
  status: AdminOrderStatus;
  deliveryStage: DroneDeliveryStage | null;
  pinCode: string | null;
  qrToken: string | null;
  actualWeight: number | null;
  weightUnit: string | null;
  extraFee: number | null;
  discount: number | null;
  totalPrice: number | null;
  originalPrice: number | null;
  promotionCode: string | null;
  appliedPromotionCodes: string[] | null;
  nextAction: string | null;
  nextActionMessage: string | null;
  paymentRequired: boolean | null;
  paymentStatus: AdminOrderPaymentStatus | null;
  overtime: boolean | null;
  pickupDeadline: string | null;
  returnedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  orderDetails: AdminOrderDetailLine[] | null;

  receiverUserId: number | null;
  receiverPhone: string | null;
  receiverName: string | null;
  destinationLockerId: number | null;
  reservedBoxId: number | null;
  fulfillmentMode: string | null;
  paidAt: string | null;
  parcelWeightGrams: number | null;
  reservationFee: number | null;
  storagePrice: number | null;
  shippingFee: number | null;
  pinCodeIssuedAt: string | null;
  receiveAt: string | null;
  intendedReceiveAt: string | null;
  rentalDurationHours: number | null;
  lastReminderAt: string | null;
  description: string | null;
  customerNote: string | null;
  staffNote: string | null;
  cancelReason: number | null;
  deliveryAddress: string | null;

  customer: CustomerSummary | null;
  receiver: AdminOrderReceiver | null;
  locker: LockerSummary | null;
  destinationLocker: LockerSummary | null;
  store: StoreSummary | null;
  sendBoxNumber: number | null;
  receiveBoxNumber: number | null;
  reservedBoxNumber: number | null;
  fees: AdminOrderFees | null;
  payment: AdminOrderPaymentSummary | null;
  drone: AdminOrderDrone | null;
  /** Chỉ có ở `/detail`; `null` trong danh sách. */
  timeline: AdminOrderTimelineEntry[] | null;
}

export interface AdminOrderSearchParams {
  page?: number;
  size?: number;
  status?: string[];
  type?: string[];
  paymentStatus?: string[];
  from?: string;
  to?: string;
  userId?: number;
  lockerId?: number;
  storeId?: number;
  q?: string;
  /** `field,dir` — ví dụ `createdAt,desc`. */
  sort?: string;
}

/** Body JSON của `PUT|PATCH /api/admin/orders/{id}/status`. */
export interface UpdateAdminOrderStatusRequest {
  id: number;
  status: AdminOrderStatus;
  /** Id admin đang thao tác, để timeline ghi nhận ai đổi. */
  staffId?: number;
  receiveBoxId?: number | null;
}

// ============================================
// Thanh toán — /api/admin/payments/**
// ============================================

export const ADMIN_PAYMENT_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;

export type AdminPaymentStatus = (typeof ADMIN_PAYMENT_STATUSES)[number];

export const ADMIN_PAYMENT_METHODS = [
  "CASH",
  "WALLET",
  "VNPAY",
  "MOMO",
  "VNPAY_TOPUP",
] as const;

export type AdminPaymentMethod = (typeof ADMIN_PAYMENT_METHODS)[number];

/** `TOPUP` = nạp ví (`VNPAY_TOPUP` hoặc `orderId <= 0`). */
export type AdminPaymentKind = "ORDER" | "TOPUP";

/** Tóm tắt đơn kèm theo giao dịch; `null` khi là giao dịch nạp ví. */
export interface AdminPaymentOrderBrief {
  id: number;
  orderCode: string | null;
  type: AdminOrderType | null;
  serviceCategory: string | null;
  status: AdminOrderStatus | null;
  paymentStatus: AdminOrderPaymentStatus | null;
  totalPrice: number | null;
  lockerId: number | null;
  createdAt: string | null;
}

export interface AdminPayment {
  id: number;
  orderId: number | null;
  userId: number | null;
  amount: number;
  method: AdminPaymentMethod;
  status: AdminPaymentStatus;
  kind: AdminPaymentKind;
  referenceId: string | null;
  referenceTransactionId: string | null;
  paymentUrl: string | null;
  qrCodeUrl: string | null;
  deeplink: string | null;
  description: string | null;
  content: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** `= updatedAt` khi COMPLETED, ngược lại `null` (bảng không có cột paid_at). */
  paidAt: string | null;
  refundedAmount: number | null;
  order: AdminPaymentOrderBrief | null;
  customer: CustomerSummary | null;
}

export type AdminRefundStatus = "COMPLETED" | "PENDING" | "FAILED";

export interface AdminRefund {
  id: number;
  paymentId: number;
  orderId: number | null;
  amount: number;
  status: AdminRefundStatus;
  reason: string | null;
  transactionId: string | null;
  processedByUserId: number | null;
  requestedAt: string | null;
  processedAt: string | null;
  userId: number | null;
  paymentMethod: AdminPaymentMethod | null;
  paymentAmount: number | null;
  paymentReferenceId: string | null;
  order: AdminPaymentOrderBrief | null;
  customer: CustomerSummary | null;
  processedBy: CustomerSummary | null;
}

export type WalletTransactionType = "CREDIT" | "DEBIT";

export type WalletTransactionSource =
  | "TOPUP"
  | "ORDER_PAYMENT"
  | "REFUND"
  | "ADJUST";

export interface AdminWalletTransaction {
  id: number;
  walletId: number | null;
  userId: number | null;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number | null;
  source: WalletTransactionSource;
  referenceId: string | null;
  description: string | null;
  createdAt: string | null;
  /** Chỉ có khi `source = ORDER_PAYMENT`. */
  relatedOrderId: number | null;
  /** Mã đơn hiển thị (`ORD-...`) — cùng nguồn với orderCode ở AdminPayment, luôn khớp app khách. */
  orderCode: string | null;
  customer: CustomerSummary | null;
}

export interface AdminPaymentDetail {
  payment: AdminPayment;
  refunds: AdminRefund[];
  walletTransactions: AdminWalletTransaction[];
  /** Các giao dịch khác của cùng đơn, mới nhất trước; `[]` với giao dịch nạp ví. */
  orderPayments: AdminPayment[];
}

export interface AdminPaymentSearchParams {
  page?: number;
  size?: number;
  status?: string[];
  method?: string[];
  kind?: "ALL" | AdminPaymentKind;
  includeTopups?: boolean;
  from?: string;
  to?: string;
  userId?: number;
  orderId?: number;
  q?: string;
  sort?: string;
}

export interface AdminRefundSearchParams {
  page?: number;
  size?: number;
  status?: string[];
  from?: string;
  to?: string;
  orderId?: number;
  paymentId?: number;
  userId?: number;
  sort?: string;
}

export interface AdminWalletTransactionSearchParams {
  page?: number;
  size?: number;
  userId?: number;
  type?: string[];
  source?: string[];
  from?: string;
  to?: string;
  q?: string;
  sort?: string;
}

/** Một dòng thống kê theo khoá (trạng thái hoặc phương thức). */
export interface PaymentStatsBucket {
  key: string;
  count: number;
  amount: number;
  completedCount: number;
  completedAmount: number;
}

export interface PaymentStatsGroup {
  count: number;
  amount: number;
  completedCount: number;
  completedAmount: number;
}

export interface PaymentStatsPeriod {
  from: string;
  to: string;
  totalCount: number;
  totalAmount: number;
  completedCount: number;
  completedAmount: number;
  pendingCount: number;
  pendingAmount: number;
  failedCount: number;
  failedAmount: number;
  otherCount: number;
  otherAmount: number;
  /** `completedCount / totalCount × 100`; `null` khi chưa có giao dịch nào. */
  successRate: number | null;
  orderPayments: PaymentStatsGroup;
  topups: PaymentStatsGroup;
  refundCount: number;
  refundAmount: number;
  /** `orderPayments.completedAmount − refundAmount` — không tính nạp ví. */
  netCollectedAmount: number;
  byStatus: PaymentStatsBucket[];
  byMethod: PaymentStatsBucket[];
}

export interface PaymentStatsChanges {
  totalCountPct: number | null;
  totalAmountPct: number | null;
  completedCountPct: number | null;
  completedAmountPct: number | null;
  refundAmountPct: number | null;
  netCollectedAmountPct: number | null;
  /** Chênh lệch theo điểm phần trăm, không phải %. */
  successRatePoints: number | null;
}

export interface PaymentStatsResponse {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  current: PaymentStatsPeriod;
  previous: PaymentStatsPeriod;
  today: PaymentStatsPeriod;
  yesterday: PaymentStatsPeriod;
  changes: PaymentStatsChanges;
  todayChanges: PaymentStatsChanges;
}

// ============================================
// Doanh thu — /api/admin/revenue/**
// ============================================

export interface RevenuePeriod {
  from: string;
  to: string;
  totalRevenue: number;
  refundAmount: number;
  netRevenue: number;
  /** Đơn được TẠO trong kỳ, mọi trạng thái. */
  orderCount: number;
  /** Số đơn có ít nhất một lần thu tiền trong kỳ. */
  paidOrderCount: number;
  paymentCount: number;
  completedOrderCount: number;
  canceledOrderCount: number;
  /** `totalRevenue / paidOrderCount`; `null` khi chưa thu được đơn nào. */
  averageOrderValue: number | null;
}

export interface RevenueChanges {
  totalRevenuePct: number | null;
  refundAmountPct: number | null;
  netRevenuePct: number | null;
  orderCountPct: number | null;
  paidOrderCountPct: number | null;
  averageOrderValuePct: number | null;
}

export interface RevenueSummaryResponse {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  current: RevenuePeriod;
  previous: RevenuePeriod;
  changes: RevenueChanges;
  today: RevenuePeriod;
  thisWeek: RevenuePeriod;
  thisMonth: RevenuePeriod;
}

export interface RevenueDay {
  /** `yyyy-MM-dd`, ngày Việt Nam. */
  date: string;
  revenue: number;
  refundAmount: number;
  netRevenue: number;
  paidOrderCount: number;
  paymentCount: number;
  /** Đơn được tạo trong ngày đó. */
  orderCount: number;
}

export interface RevenueDailyResponse {
  from: string;
  to: string;
  totalRevenue: number;
  days: RevenueDay[];
}

/** Ngoài loại đơn còn có dòng tổng hợp `OVERTIME_FEE` cho phí quá hạn đã thu. */
export type RevenueServiceType =
  | AdminOrderType
  | "OVERTIME_FEE"
  | "OTHER"
  | "UNKNOWN";

export interface RevenueByServiceItem {
  serviceType: RevenueServiceType;
  revenue: number;
  refundAmount: number;
  netRevenue: number;
  sharePct: number | null;
  orderCount: number;
  paidOrderCount: number;
  paymentCount: number;
}

export interface RevenueByServiceResponse {
  from: string;
  to: string;
  totalRevenue: number;
  items: RevenueByServiceItem[];
}

export interface RevenueByMethodItem {
  method: AdminPaymentMethod;
  revenue: number;
  refundAmount: number;
  netRevenue: number;
  sharePct: number | null;
  paymentCount: number;
  paidOrderCount: number;
}

export interface RevenueByMethodResponse {
  from: string;
  to: string;
  totalRevenue: number;
  items: RevenueByMethodItem[];
}

export interface RevenueByLockerItem {
  /** `null` = đơn không gắn tủ nào. */
  lockerId: number | null;
  code: string | null;
  name: string | null;
  address: string | null;
  status: string | null;
  storeId: number | null;
  storeName: string | null;
  /** Tính cả ô ngừng hoạt động. */
  boxCount: number;
  orderCount: number;
  paidOrderCount: number;
  revenue: number;
  refundAmount: number;
  netRevenue: number;
  /** `revenue / boxCount`; `null` khi tủ chưa có ô. */
  revenuePerBox: number | null;
  sharePct: number | null;
}

export interface RevenueByLockerResponse {
  from: string;
  to: string;
  totalRevenue: number;
  /** `false` = locker/store-service lỗi: tên trống và có thể thiếu tủ doanh thu 0. */
  lookupAvailable: boolean;
  items: RevenueByLockerItem[];
}

export interface RevenueByStoreItem {
  /** `null` = đơn chưa gán cửa hàng. */
  storeId: number | null;
  name: string | null;
  address: string | null;
  contactPhone: string | null;
  lockerCount: number;
  boxCount: number;
  orderCount: number;
  paidOrderCount: number;
  revenue: number;
  refundAmount: number;
  netRevenue: number;
  sharePct: number | null;
}

export interface RevenueByStoreResponse {
  from: string;
  to: string;
  totalRevenue: number;
  lookupAvailable: boolean;
  items: RevenueByStoreItem[];
}

export interface CustomerRevenue {
  userId: number;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  orderCount: number;
  paidOrderCount: number;
  totalSpent: number;
  refundAmount: number;
  netSpent: number;
  averageOrderValue: number | null;
  /** Đơn tạo gần nhất TRONG KỲ. */
  lastOrderAt: string | null;
  /** Lần thu tiền gần nhất TRONG KỲ. */
  lastPaidAt: string | null;
}

export interface RevenueByCustomerParams extends DateRange {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
}

export interface CustomerRevenueOrder {
  orderId: number;
  orderCode: string | null;
  type: AdminOrderType | null;
  status: AdminOrderStatus | null;
  paymentStatus: AdminOrderPaymentStatus | null;
  lockerId: number | null;
  lockerCode: string | null;
  lockerName: string | null;
  totalPrice: number | null;
  extraFee: number | null;
  discount: number | null;
  paidInRange: number | null;
  refundedInRange: number | null;
  /** Tổng đã thu mọi thời điểm; `null` khi payment-service lỗi. */
  paidAllTime: number | null;
  paymentMethods: AdminPaymentMethod[] | null;
  lastPaymentMethod: AdminPaymentMethod | null;
  lastPaidAt: string | null;
  createdAt: string | null;
  paidAt: string | null;
  completedAt: string | null;
}

export interface CustomerRevenueDetail {
  from: string;
  to: string;
  userId: number;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: string | null;
  orderCount: number;
  paidOrderCount: number;
  totalSpent: number;
  refundAmount: number;
  netSpent: number;
  averageOrderValue: number | null;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  orders: CustomerRevenueOrder[];
}
