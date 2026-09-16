import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Box,
  Clock,
  CreditCard,
  Edit3,
  KeyRound,
  MapPin,
  Package,
  Plane,
  Receipt,
  Store,
  User,
  Users,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import {
  LabelValue,
  MetaBadge,
  ReportErrorState,
  deliveryStageMeta,
  orderPaymentStatusMeta,
  orderStatusMeta,
  orderTypeMeta,
  paymentMethodMeta,
  paymentStatusMeta,
} from "~/components/shared/reporting";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency, formatNumber } from "~/lib/report-format";
import { useOrderDetail } from "./hooks/useOrderDetail";
import { OrderTimeline } from "./components/OrderTimeline";
import { OrderStatusUpdateModal } from "./components/OrderStatusUpdateModal";
import type { AdminOrder, AdminOrderFees } from "~/types/admin/reporting";

/**
 * Thứ tự dòng phí giống lúc tính tiền: các khoản cộng trước, giảm giá sau, tổng cuối.
 * `overtimeFee` chính là `extraFee` nên chỉ hiện một lần, dưới tên dễ hiểu.
 */
function feeRows(fees: AdminOrderFees) {
  return [
    { label: "Giá gốc", value: fees.originalPrice },
    { label: "Phí giữ ô", value: fees.reservationFee },
    { label: "Phí lưu trữ", value: fees.storagePrice },
    { label: "Phí vận chuyển", value: fees.shippingFee },
    { label: "Phí quá hạn", value: fees.overtimeFee },
    { label: "Giảm giá", value: fees.discount, negative: true },
  ].filter((row) => row.value !== null && row.value !== undefined);
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

function CustomerCard({ order }: { order: AdminOrder }) {
  const { customer, receiver } = order;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          Khách hàng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <User className="h-3 w-3" />
            Người gửi
          </p>
          <LabelValue label="Họ tên">{customer?.fullName}</LabelValue>
          <div className="grid grid-cols-2 gap-3">
            <LabelValue label="Điện thoại" mono>
              {customer?.phoneNumber}
            </LabelValue>
            <LabelValue label="Mã khách" mono>
              {order.userId ? `#${order.userId}` : null}
            </LabelValue>
          </div>
          <LabelValue label="Email">{customer?.email}</LabelValue>
          <LabelValue label="Trạng thái tài khoản">{customer?.status}</LabelValue>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <User className="h-3 w-3" />
            Người nhận
          </p>
          <LabelValue label="Tên ghi trên đơn">{receiver?.name}</LabelValue>
          <LabelValue label="Số điện thoại ghi trên đơn" mono>
            {receiver?.phone}
          </LabelValue>
          {/* Thông tin tài khoản chỉ có khi người nhận đã có tài khoản Lock.R. */}
          <LabelValue label="Tài khoản người nhận">
            {receiver?.userId ? (
              <span>
                {receiver.accountFullName ?? `Người dùng #${receiver.userId}`}
                {receiver.accountPhoneNumber
                  ? ` · ${receiver.accountPhoneNumber}`
                  : ""}
              </span>
            ) : null}
          </LabelValue>
          <LabelValue label="Email tài khoản">{receiver?.accountEmail}</LabelValue>
        </div>
      </CardContent>
    </Card>
  );
}

function LockerCard({ order }: { order: AdminOrder }) {
  const { locker, destinationLocker, store } = order;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          Tủ &amp; ô
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <LabelValue label="Tủ gửi">
          {locker ? `${locker.code ?? `#${locker.id}`} — ${locker.name ?? ""}` : null}
        </LabelValue>
        <LabelValue label="Địa chỉ tủ gửi">{locker?.address}</LabelValue>

        {destinationLocker && (
          <>
            <LabelValue label="Tủ đích">
              {`${destinationLocker.code ?? `#${destinationLocker.id}`} — ${destinationLocker.name ?? ""}`}
            </LabelValue>
            <LabelValue label="Địa chỉ tủ đích">
              {destinationLocker.address}
            </LabelValue>
          </>
        )}

        <div className="grid grid-cols-3 gap-2">
          <LabelValue label="Ô gửi">
            {order.sendBoxNumber !== null ? `Ô ${order.sendBoxNumber}` : null}
          </LabelValue>
          <LabelValue label="Ô nhận">
            {order.receiveBoxNumber !== null ? `Ô ${order.receiveBoxNumber}` : null}
          </LabelValue>
          <LabelValue label="Ô giữ chỗ">
            {order.reservedBoxNumber !== null
              ? `Ô ${order.reservedBoxNumber}`
              : null}
          </LabelValue>
        </div>
        {order.status === "EXPIRED" && (
          <p className="text-[11px] text-muted-foreground">
            Đơn quá hạn đã được giải phóng ô nên không còn số ô.
          </p>
        )}

        <Separator />

        <LabelValue label="Cửa hàng">
          <span className="inline-flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            {store?.name ?? null}
          </span>
        </LabelValue>
        <LabelValue label="Liên hệ cửa hàng" mono>
          {store?.contactPhone}
        </LabelValue>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <LabelValue label="Mã PIN" mono>
            {order.pinCode ? (
              <span className="tracking-widest font-bold">{order.pinCode}</span>
            ) : null}
          </LabelValue>
          <LabelValue label="PIN phát lúc">
            {order.pinCodeIssuedAt ? formatDateTime(order.pinCodeIssuedAt) : null}
          </LabelValue>
        </div>
        <LabelValue label="Mã QR" mono>
          {order.qrToken}
        </LabelValue>
      </CardContent>
    </Card>
  );
}

function PaymentCard({ order }: { order: AdminOrder }) {
  const payment = order.payment;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4" />
          Thanh toán
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} />
          {order.paymentRequired === false && (
            <span className="text-[11px] text-muted-foreground">
              Không cần thu thêm
            </span>
          )}
        </div>

        {/* `payment = null` nghĩa là payment-service không trả lời, không phải "chưa trả đồng nào". */}
        {payment === null ? (
          <p className="text-xs text-muted-foreground">
            Không lấy được số liệu thu tiền (payment-service không phản hồi).
          </p>
        ) : payment.paymentCount === 0 ? (
          <p className="text-xs text-muted-foreground">
            Chưa có lần thanh toán nào cho đơn này.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <LabelValue label="Đã thu">
                {formatCurrency(payment.paidAmount)}
              </LabelValue>
              <LabelValue label="Còn thiếu">
                <span
                  className={
                    (payment.outstandingAmount ?? 0) > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : undefined
                  }
                >
                  {formatCurrency(payment.outstandingAmount)}
                </span>
              </LabelValue>
              <LabelValue label="Đã hoàn">
                {formatCurrency(payment.refundedAmount)}
              </LabelValue>
              <LabelValue label="Số lần thanh toán">
                {formatNumber(payment.paymentCount)}
              </LabelValue>
            </div>

            <Separator />

            <LabelValue label="Lần thu gần nhất">
              {payment.lastPaidAt ? (
                <span>
                  {formatDateTime(payment.lastPaidAt)}
                  {payment.lastPaidMethod
                    ? ` · ${paymentMethodMeta(payment.lastPaidMethod).label}`
                    : ""}
                </span>
              ) : null}
            </LabelValue>

            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                Giao dịch mới nhất (mọi trạng thái)
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {payment.latestStatus && (
                  <MetaBadge
                    meta={paymentStatusMeta(payment.latestStatus)}
                    hideIcon
                  />
                )}
                {payment.latestMethod && (
                  <MetaBadge
                    meta={paymentMethodMeta(payment.latestMethod)}
                    hideIcon
                  />
                )}
                <span className="text-xs font-medium">
                  {formatCurrency(payment.latestAmount)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                {payment.latestPaymentId ? `#${payment.latestPaymentId} · ` : ""}
                {payment.latestCreatedAt
                  ? formatDateTime(payment.latestCreatedAt)
                  : EMPTY_VALUE}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DroneCard({ order }: { order: AdminOrder }) {
  const drone = order.drone;
  if (!drone) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Plane className="h-4 w-4" />
          Chuyến bay drone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {drone.deliveryStage && (
            <MetaBadge meta={deliveryStageMeta(drone.deliveryStage)} />
          )}
          {drone.missionStatus && (
            <span className="text-xs text-muted-foreground self-center">
              Nhiệm vụ: {drone.missionStatus}
            </span>
          )}
        </div>

        {/* Khi đơn chưa được gán nhiệm vụ, backend chỉ trả chặng và tủ đích. */}
        {drone.missionId === null ? (
          <p className="text-xs text-muted-foreground">
            Đơn chưa được gán nhiệm vụ bay.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <LabelValue label="Mã nhiệm vụ" mono>
              {`#${drone.missionId}`}
            </LabelValue>
            <LabelValue label="Drone" mono>
              {drone.droneCode ??
                (drone.droneUnitId ? `#${drone.droneUnitId}` : null)}
            </LabelValue>
            <LabelValue label="Tủ xuất phát">
              {drone.sourceLocker?.code ??
                (drone.sourceLockerId ? `#${drone.sourceLockerId}` : null)}
            </LabelValue>
            <LabelValue label="Tủ đích" mono>
              {drone.destinationLockerId ? `#${drone.destinationLockerId}` : null}
            </LabelValue>
            <LabelValue label="Sẵn sàng cất cánh">
              {drone.readyToLaunchAt ? formatDateTime(drone.readyToLaunchAt) : null}
            </LabelValue>
            <LabelValue label="Bắt đầu cất cánh">
              {drone.launchingAt ? formatDateTime(drone.launchingAt) : null}
            </LabelValue>
            <LabelValue label="Tạo nhiệm vụ">
              {drone.createdAt ? formatDateTime(drone.createdAt) : null}
            </LabelValue>
            <LabelValue label="Cập nhật">
              {drone.updatedAt ? formatDateTime(drone.updatedAt) : null}
            </LabelValue>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { order, isLoading, error, refetch, isValidId } = useOrderDetail(orderId);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;

  if (!isValidId || (error && !order)) {
    return (
      <div className="space-y-4">
        {error ? (
          <ReportErrorState
            error={error}
            onRetry={refetch}
            title="Không tải được đơn hàng"
          />
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
            <h3 className="mt-4 text-lg font-medium">Mã đơn không hợp lệ</h3>
          </div>
        )}
        <div className="text-center">
          <Button onClick={() => navigate("/admin/orders")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Về danh sách đơn
          </Button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const fees = order.fees;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {order.orderCode ?? `Đơn #${order.id}`}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              ID #{order.id} · tạo {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(true)}>
          <Edit3 className="mr-1.5 h-3.5 w-3.5" />
          Cập nhật trạng thái
        </Button>
      </div>

      {/* Băng trạng thái */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <MetaBadge meta={orderStatusMeta(order.status)} />
        <MetaBadge meta={orderTypeMeta(order.type)} hideIcon />
        <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} hideIcon />
        {order.deliveryStage && (
          <MetaBadge meta={deliveryStageMeta(order.deliveryStage)} hideIcon />
        )}
        {order.overtime && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Đơn bị tính phí quá hạn
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto font-mono">
          Cập nhật {formatDateTime(order.updatedAt ?? order.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Mốc thời gian nghiệp vụ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Mốc thời gian
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <LabelValue label="Tạo đơn">
                {formatDateTime(order.createdAt)}
              </LabelValue>
              <LabelValue label="Thanh toán">
                {order.paidAt ? formatDateTime(order.paidAt) : null}
              </LabelValue>
              <LabelValue label="Hạn lấy hàng">
                {order.pickupDeadline ? formatDateTime(order.pickupDeadline) : null}
              </LabelValue>
              <LabelValue label="Hẹn nhận">
                {order.intendedReceiveAt
                  ? formatDateTime(order.intendedReceiveAt)
                  : null}
              </LabelValue>
              <LabelValue label="Nhận thực tế">
                {order.receiveAt ? formatDateTime(order.receiveAt) : null}
              </LabelValue>
              <LabelValue label="Hoàn thành">
                {order.completedAt ? formatDateTime(order.completedAt) : null}
              </LabelValue>
              <LabelValue label="Trả lại">
                {order.returnedAt ? formatDateTime(order.returnedAt) : null}
              </LabelValue>
              <LabelValue label="Nhắc lần cuối">
                {order.lastReminderAt ? formatDateTime(order.lastReminderAt) : null}
              </LabelValue>
              <LabelValue label="Cập nhật">
                {order.updatedAt ? formatDateTime(order.updatedAt) : null}
              </LabelValue>
            </CardContent>
          </Card>

          {/* Phí */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Receipt className="h-4 w-4" />
                Chi tiết phí
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {fees ? (
                <>
                  {feeRows(fees).map((row) => (
                    <div key={row.label} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={row.negative ? "text-emerald-600 dark:text-emerald-400" : ""}>
                        {row.negative && (row.value ?? 0) > 0 ? "− " : ""}
                        {formatCurrency(row.value)}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between gap-3 font-semibold">
                    <span>Tổng phải trả</span>
                    <span className="text-base">{formatCurrency(fees.totalPrice)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Giá chưa gồm phí quá hạn: {formatCurrency(fees.basePrice)}
                  </p>
                </>
              ) : (
                <div className="flex justify-between gap-3 font-semibold">
                  <span>Tổng phải trả</span>
                  <span>{formatCurrency(order.totalPrice)}</span>
                </div>
              )}

              {(order.promotionCode || order.appliedPromotionCodes?.length) && (
                <p className="text-xs text-muted-foreground">
                  Khuyến mãi:{" "}
                  {order.appliedPromotionCodes?.join(", ") || order.promotionCode}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Hàng hoá & ghi chú */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" />
                Kiện hàng &amp; ghi chú
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <LabelValue label="Nhóm dịch vụ">{order.serviceCategory}</LabelValue>
                <LabelValue label="Khối lượng khai báo">
                  {order.parcelWeightGrams !== null
                    ? `${formatNumber(order.parcelWeightGrams)} g`
                    : null}
                </LabelValue>
                <LabelValue label="Khối lượng cân">
                  {order.actualWeight !== null
                    ? `${formatNumber(order.actualWeight)} ${order.weightUnit ?? ""}`
                    : null}
                </LabelValue>
                <LabelValue label="Số giờ thuê">
                  {order.rentalDurationHours !== null
                    ? `${formatNumber(order.rentalDurationHours)} giờ`
                    : null}
                </LabelValue>
              </div>

              {order.orderDetails && order.orderDetails.length > 0 && (
                <div className="space-y-2">
                  {order.orderDetails.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between rounded-lg bg-muted/30 p-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {line.serviceName ?? `Dịch vụ #${line.serviceId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(line.quantity)} {line.unit ?? ""}
                        </p>
                      </div>
                      <span className="font-medium shrink-0">
                        {formatCurrency((line.price ?? 0) * (line.quantity ?? 0))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <LabelValue label="Ghi chú của khách">
                  {order.customerNote}
                </LabelValue>
                <LabelValue label="Ghi chú nội bộ">{order.staffNote}</LabelValue>
                <LabelValue label="Mô tả">{order.description}</LabelValue>
                <LabelValue label="Địa chỉ giao">
                  {order.deliveryAddress}
                </LabelValue>
                <LabelValue label="Việc cần làm tiếp">
                  {order.nextActionMessage ?? order.nextAction}
                </LabelValue>
                <LabelValue label="Lý do huỷ" mono>
                  {order.cancelReason !== null ? `Mã ${order.cancelReason}` : null}
                </LabelValue>
              </div>
            </CardContent>
          </Card>

          {/* Lịch sử trạng thái */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Lịch sử trạng thái
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline timeline={order.timeline} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <CustomerCard order={order} />
          <LockerCard order={order} />
          <PaymentCard order={order} />
          <DroneCard order={order} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <KeyRound className="h-4 w-4" />
                Tham chiếu khác
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <LabelValue label="Nhân viên xử lý" mono>
                {order.staffId ? `#${order.staffId}` : null}
              </LabelValue>
              <LabelValue label="Mã ô gửi" mono>
                {order.sendBoxId ? `#${order.sendBoxId}` : null}
              </LabelValue>
              <LabelValue label="Mã ô nhận" mono>
                {order.receiveBoxId ? `#${order.receiveBoxId}` : null}
              </LabelValue>
              <LabelValue label="Mã ô giữ chỗ" mono>
                {order.reservedBoxId ? `#${order.reservedBoxId}` : null}
              </LabelValue>
              <LabelValue label="Mã tủ" mono>
                {order.lockerId ? `#${order.lockerId}` : null}
              </LabelValue>
              <LabelValue label="Mã cửa hàng" mono>
                {order.storeId ? `#${order.storeId}` : null}
              </LabelValue>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="p-4 flex items-start gap-2.5">
              <Box className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Mọi thời gian hiển thị theo giờ Việt Nam, định dạng
                <span className="font-mono"> HH:mm:ss dd/MM/yyyy</span> — trùng với app
                khách.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {isStatusModalOpen && (
        <OrderStatusUpdateModal
          order={order}
          onClose={() => setIsStatusModalOpen(false)}
          onUpdated={refetch}
        />
      )}
    </div>
  );
}
