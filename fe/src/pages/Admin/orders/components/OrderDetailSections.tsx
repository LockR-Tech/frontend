import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { ClipboardList, CreditCard, KeyRound, Package, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  LabelValue,
  MetaBadge,
  orderPaymentStatusMeta,
  paymentMethodMeta,
  paymentStatusMeta,
  refundStatusMeta,
} from "~/components/shared/reporting";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency, formatNumber } from "~/lib/report-format";
import type { DroneOrderTracking } from "~/stores/apis/admin/droneOrders";
import type {
  AdminOrder,
  AdminPayment,
  AdminRefund,
  CustomerOrderParcel,
  CustomerOrderView,
} from "~/types/admin/reporting";
import { CANCEL_REASON_LABELS, PARCEL_CATEGORY_LABELS, routeDistance } from "../../drone-orders/format";
import { DronePaymentCodes } from "./DroneOrderSections";

// Các khối giúp trang chi tiết đơn admin hiện đúng những gì khách thấy trên app (màn "Chi tiết đơn"):
// đọc `GET /api/orders/{id}` (cùng response app khách nhận) và giao dịch/hoàn tiền của đơn ở payment-service.

const money = (value: number | null | undefined) =>
  value === null || value === undefined ? null : formatCurrency(value);
const at = (value: string | null | undefined) => (value ? formatDateTime(value) : null);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

/**
 * Mốc chính của đơn theo từng loại (tủ/ô ở khối "Tủ & ô", người gửi/nhận ở khối "Khách hàng"):
 * - Thuê ô: thời gian thuê, hết giờ thuê, lúc bỏ đồ vào ô.
 * - Gửi hàng: thời gian giữ hàng, hạn người nhận lấy, lúc người gửi bỏ hàng.
 * - Giao bằng drone: hạn lấy hàng ở tủ nhận, tủ gửi và quãng bay.
 * Dòng phụ (hẹn nhận, người nhận lấy lúc, hoàn tất, nhắc lấy hàng, địa chỉ giao) chỉ hiện khi có dữ liệu.
 */
export function OrderInfoCard({
  order,
  view,
  drone,
}: {
  order: AdminOrder;
  view: CustomerOrderView | null;
  drone?: DroneOrderTracking | null;
}) {
  const { t } = useTranslation();
  const isRental = order.type === "RENTAL";
  const isDrone = order.type === "DRONE_DELIVERY";
  const isSend = !isRental && !isDrone;
  const overdue = Number(view?.pickupOvertimeFee ?? 0) > 0;
  const delegated = Boolean(view?.delegatedAt);
  const droppedAt = view?.parcelDroppedAt ?? view?.dropOpenedAt;
  const intendedReceive = view?.intendedReceiveAt ?? order.intendedReceiveAt;
  const deliveryAddress = view?.deliveryAddress ?? order.deliveryAddress;
  const deadlineLabel = isRental
    ? t("admin.orders.detail.view.rentalEnd")
    : isDrone
      ? t("admin.orders.detail.view.droneDeadline")
      : t("admin.orders.detail.view.sendDeadline");

  return (
    <Card data-tour="order-detail-info">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardList className="h-4 w-4" />
          {t("admin.orders.detail.view.title")}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{t("admin.orders.detail.view.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <LabelValue label={t("admin.orders.detail.view.createdAt")}>{at(order.createdAt)}</LabelValue>
          {(isRental || (isSend && order.rentalDurationHours != null)) && (
            <LabelValue
              label={isRental ? t("admin.orders.detail.view.rentalHours") : t("admin.orders.detail.view.holdHours")}
            >
              {order.rentalDurationHours !== null && order.rentalDurationHours !== undefined
                ? t("admin.orders.detail.parcel.hours", { hours: formatNumber(order.rentalDurationHours) })
                : null}
            </LabelValue>
          )}
          <LabelValue label={deadlineLabel}>{at(order.pickupDeadline)}</LabelValue>
          {!isDrone && (
            <LabelValue
              label={isRental ? t("admin.orders.detail.view.rentalDroppedAt") : t("admin.orders.detail.view.sendDroppedAt")}
            >
              {at(droppedAt)}
            </LabelValue>
          )}
          {isSend && intendedReceive && (
            <LabelValue label={t("admin.orders.detail.view.intendedReceive")}>{at(intendedReceive)}</LabelValue>
          )}
          {!isRental && order.receiveAt && (
            <LabelValue label={t("admin.orders.detail.view.receivedAt")}>{at(order.receiveAt)}</LabelValue>
          )}
          {order.completedAt && (
            <LabelValue label={t("admin.orders.detail.view.completedAt")}>{at(order.completedAt)}</LabelValue>
          )}
          {order.lastReminderAt && (
            <LabelValue label={t("admin.orders.detail.view.lastReminder")}>{at(order.lastReminderAt)}</LabelValue>
          )}
          {deliveryAddress && (
            <LabelValue label={t("admin.orders.detail.view.deliveryAddress")}>{deliveryAddress}</LabelValue>
          )}
        </div>

        {overdue && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <LabelValue label={t("admin.orders.detail.view.overtimeFee")}>{money(view?.pickupOvertimeFee)}</LabelValue>
            <LabelValue label={t("admin.orders.detail.view.overtimeRate")}>
              {view?.overtimeRatePerHour !== null && view?.overtimeRatePerHour !== undefined
                ? t("admin.orders.detail.view.perHour", { amount: formatCurrency(view.overtimeRatePerHour) })
                : null}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.view.accessBlock")}>
              {view?.accessBlockReason
                ? t(`admin.orders.detail.view.block.${view.accessBlockReason}`, { defaultValue: view.accessBlockReason })
                : t("admin.orders.detail.view.block.none")}
            </LabelValue>
          </div>
        )}

        {/* Người nhận ở khối "Khách hàng"; ở đây chỉ còn phần ủy quyền lấy hộ (nếu có). */}
        {!isRental && delegated && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3">
            <LabelValue label={t("admin.orders.detail.view.delegate")}>
              {[view?.delegateName, view?.delegatePhone].filter(Boolean).join(" · ") || null}
            </LabelValue>
            {view?.delegateNote && (
              <LabelValue label={t("admin.orders.detail.view.delegateNote")}>{view.delegateNote}</LabelValue>
            )}
            <LabelValue label={t("admin.orders.detail.view.delegatedAt")}>{at(view?.delegatedAt)}</LabelValue>
          </div>
        )}

        {isDrone && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelValue label={t("admin.orders.detail.view.sourceLocker")}>
                {drone?.sourceLocker?.name ?? order.drone?.sourceLocker?.name}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.view.routeDistance")}>
                {routeDistance(view?.routeDistanceMeters ?? drone?.routeDistanceMeters)}
              </LabelValue>
            </div>
          </>
        )}

        {(view?.deliveryBlockReasonLabel || view?.failureReasonLabel || view?.parcelReturnedAt || view?.boxIncidentOpenedAt) && (
          <>
            <Separator />
            <SectionLabel>{t("admin.orders.detail.view.incidents")}</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {view?.deliveryBlockReasonLabel && (
                <LabelValue label={t("admin.orders.detail.view.blocked")}>
                  {view.deliveryBlockReasonLabel}
                  {view.deliveryBlockedAt ? ` · ${formatDateTime(view.deliveryBlockedAt)}` : ""}
                </LabelValue>
              )}
              {view?.failureReasonLabel && (
                <LabelValue label={t("admin.orders.detail.view.failed")}>
                  {view.failureReasonLabel}
                  {view.failedAt ? ` · ${formatDateTime(view.failedAt)}` : ""}
                </LabelValue>
              )}
              {view?.parcelReturnedAt && (
                <LabelValue label={t("admin.orders.detail.view.parcelReturned")}>{at(view.parcelReturnedAt)}</LabelValue>
              )}
              {view?.boxIncidentOpenedAt && (
                <LabelValue label={t("admin.orders.detail.view.boxIncident")}>{at(view.boxIncidentOpenedAt)}</LabelValue>
              )}
            </div>
          </>
        )}

        {view?.milestones && view.milestones.length > 0 && (
          <>
            <Separator />
            <SectionLabel>{t("admin.orders.detail.view.milestones")}</SectionLabel>
            <ol className="space-y-1.5">
              {view.milestones.map((m, index) => (
                <li key={`${m.code}-${index}`} className="flex justify-between gap-3 text-sm">
                  <span>{m.label}</span>
                  <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{at(m.occurredAt)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Đơn còn dùng được mã mở ô không — giống điều kiện app khách hiện khối PIN. */
function pinUsable(order: AdminOrder, view: CustomerOrderView | null) {
  if (view?.accessBlockReason) return false;
  if (order.type === "DRONE_DELIVERY") return order.deliveryStage === "READY_FOR_PICKUP" && order.status !== "COMPLETED";
  return order.status === "STORING" || order.status === "RETURNED" || (order.type === "RENTAL" && order.status === "INITIALIZED");
}

/** Mã lấy hàng: PIN + QR mở ô ở tủ, và mã khách đọc cho KTV khi lấy hàng drone tận nhà. */
export function PickupCodeCard({
  order,
  view,
  drone,
}: {
  order: AdminOrder;
  view: CustomerOrderView | null;
  drone?: DroneOrderTracking | null;
}) {
  const { t } = useTranslation();
  const pin = view?.pinCode ?? order.pinCode;
  const qr = view?.qrToken ?? order.qrToken;
  const homePickupCode = view?.dronePickupCode ?? null;
  const closed = ["COMPLETED", "CANCELED", "EXPIRED"].includes(order.status);
  const usable = pin ? pinUsable(order, view) : false;
  const holder = view?.delegatedAt
    ? t("admin.orders.detail.code.holderDelegate", { name: view.delegateName ?? view.delegatePhone ?? "" })
    : order.type === "RENTAL"
      ? t("admin.orders.detail.code.holderRenter")
      : t("admin.orders.detail.code.holderReceiver");

  return (
    <Card data-tour="order-detail-pickup-code">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4" />
          {t("admin.orders.detail.code.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pin ? (
          <>
            <div className="flex items-start gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex gap-1.5">
                  {pin.split("").map((digit, index) => (
                    <span
                      key={index}
                      className="flex h-10 w-8 items-center justify-center rounded-md border bg-muted/40 font-mono text-lg font-bold"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{holder}</p>
                <p
                  className={
                    usable
                      ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {usable
                    ? t("admin.orders.detail.code.usable")
                    : closed
                      ? t("admin.orders.detail.code.closed")
                      : view?.accessBlockReason
                        ? t("admin.orders.detail.code.blocked", {
                            reason: t(`admin.orders.detail.view.block.${view.accessBlockReason}`, {
                              defaultValue: view.accessBlockReason,
                            }),
                          })
                        : t("admin.orders.detail.code.notYet")}
                </p>
              </div>
              {qr && (
                <div className="ml-auto shrink-0 rounded-md border bg-white p-1.5">
                  <QRCodeSVG value={qr} size={96} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabelValue label={t("admin.orders.detail.locker.pinIssuedAt")}>{at(order.pinCodeIssuedAt)}</LabelValue>
              <LabelValue label={t("admin.orders.detail.code.qrNote")}>{qr ? t("admin.orders.detail.code.qrSigned") : null}</LabelValue>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {order.status === "EXPIRED"
              ? t("admin.orders.detail.code.inStorage")
              : closed
                ? t("admin.orders.detail.code.revoked")
                : t("admin.orders.detail.code.none")}
          </p>
        )}

        {order.type === "DRONE_DELIVERY" && (
          <>
            <Separator />
            <div data-tour="order-detail-home-code">
              <LabelValue label={t("admin.orders.detail.code.homePickup")} mono>
                {homePickupCode ? (
                  <span className="text-base font-bold tracking-widest">{homePickupCode}</span>
                ) : drone?.pickup ? (
                  t("admin.orders.detail.code.homePickupUsed")
                ) : null}
              </LabelValue>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentRow({ payment, index, total }: { payment: AdminPayment; index: number; total: number }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {total > 1 && <span className="text-xs font-semibold">{t("admin.orders.detail.payment.attempt", { n: index + 1 })}</span>}
        <MetaBadge meta={paymentStatusMeta(payment.status)} hideIcon />
        <MetaBadge meta={paymentMethodMeta(payment.method)} hideIcon />
        <span className="ml-auto text-sm font-semibold">{formatCurrency(payment.amount)}</span>
      </div>
      {payment.description && <p className="text-xs text-muted-foreground">{payment.description}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <LabelValue label={t("admin.droneOrders.fields.paymentReference")} mono>{payment.referenceId}</LabelValue>
        <LabelValue label={t("admin.droneOrders.fields.transactionId")} mono>{payment.referenceTransactionId}</LabelValue>
        <LabelValue label={t("admin.orders.detail.payment.createdAt")} mono>{at(payment.createdAt)}</LabelValue>
        <LabelValue label={t("admin.droneOrders.fields.paidAt")} mono>{at(payment.paidAt)}</LabelValue>
        {payment.content && (
          <LabelValue label={t("admin.orders.detail.payment.transferContent")} mono className="sm:col-span-2">
            {payment.content}
          </LabelValue>
        )}
        {Number(payment.refundedAmount ?? 0) > 0 && (
          <LabelValue label={t("admin.orders.detail.payment.refunded")}>{formatCurrency(payment.refundedAmount)}</LabelValue>
        )}
      </div>
    </div>
  );
}

function RefundRow({ refund }: { refund: AdminRefund }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">{t("admin.orders.detail.payment.refundNo", { id: refund.id })}</span>
        <MetaBadge meta={refundStatusMeta(refund.status)} hideIcon />
        <span className="ml-auto text-sm font-semibold">{formatCurrency(refund.amount)}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <LabelValue label={t("admin.orders.detail.payment.refundReason")}>{refund.reason}</LabelValue>
        <LabelValue label={t("admin.droneOrders.fields.transactionId")} mono>{refund.transactionId}</LabelValue>
        <LabelValue label={t("admin.orders.detail.payment.refundRequestedAt")} mono>{at(refund.requestedAt)}</LabelValue>
        <LabelValue label={t("admin.orders.detail.payment.refundProcessedAt")} mono>{at(refund.processedAt)}</LabelValue>
      </div>
    </div>
  );
}

/**
 * Thanh toán đầy đủ: tình trạng thu, số đã thu/còn phải thu/đã hoàn (như app khách), từng lần thanh
 * toán (mã thanh toán, mã giao dịch ngân hàng, nội dung chuyển khoản) và từng phiếu hoàn tiền.
 */
export function PaymentFullCard({
  order,
  view,
  drone,
  payments,
  paymentsError,
  refunds,
}: {
  order: AdminOrder;
  view: CustomerOrderView | null;
  drone?: DroneOrderTracking | null;
  payments: AdminPayment[] | null;
  paymentsError: boolean;
  refunds: AdminRefund[];
}) {
  const { t } = useTranslation();
  const summary = order.payment;
  const total = Number(view?.totalPrice ?? order.totalPrice ?? 0);
  const paid = view?.paidAmount ?? summary?.paidAmount ?? null;
  const due = view?.amountDue ?? summary?.outstandingAmount ?? null;
  const list = payments ?? [];
  const hasDroneCodes = Boolean(drone && (drone.paymentMethod || drone.paymentReference || drone.paymentTransactionId));
  const noTransaction = payments !== null && list.length === 0;

  return (
    <Card data-tour="order-detail-payment">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4" />
          {t("common.payment")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} />
          {order.paymentRequired === false && !(Number(due ?? 0) > 0) && (
            <span className="text-[11px] text-muted-foreground">{t("admin.orders.detail.payment.noMoreDue")}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <LabelValue label={t("admin.orders.detail.payment.orderTotal")}>{formatCurrency(total)}</LabelValue>
          <LabelValue label={t("admin.orders.detail.payment.paid")}>{money(paid)}</LabelValue>
          <LabelValue label={t("admin.orders.detail.payment.outstanding")}>
            {due !== null ? (
              <span className={Number(due) > 0 ? "text-amber-600 dark:text-amber-400" : undefined}>
                {formatCurrency(due)}
              </span>
            ) : null}
          </LabelValue>
          {Number(summary?.refundedAmount ?? 0) > 0 && (
            <LabelValue label={t("admin.orders.detail.payment.refunded")}>{money(summary?.refundedAmount)}</LabelValue>
          )}
          <LabelValue label={t("admin.droneOrders.fields.paidAt")} mono>{at(view?.paidAt ?? order.paidAt)}</LabelValue>
          <LabelValue label={t("admin.orders.detail.payment.paymentCount")}>
            {payments !== null ? formatNumber(list.length) : summary ? formatNumber(summary.paymentCount) : null}
          </LabelValue>
          {/* Bảng danh sách gộp phương thức vào cột trạng thái — chi tiết luôn ghi rõ, kể cả khi không tải được giao dịch. */}
          {summary?.lastPaidMethod && (
            <LabelValue label={t("admin.orders.detail.payment.lastMethod")}>
              {paymentMethodMeta(summary.lastPaidMethod).label}
            </LabelValue>
          )}
          {Number(view?.pointsUsed ?? order.pointsUsed ?? 0) > 0 && (
            <LabelValue label={t("admin.orders.detail.fees.pointsDiscount")} className="col-span-2">
              − {formatCurrency(view?.pointsDiscount ?? order.pointsDiscount ?? 0)} (
              {t("admin.orders.detail.fees.pointsUsed", { points: formatNumber(view?.pointsUsed ?? order.pointsUsed ?? 0) })})
            </LabelValue>
          )}
        </div>

        {/* Mã thanh toán drone chỉ cần khi không tải được danh sách giao dịch (danh sách đã có đủ mã). */}
        {hasDroneCodes && drone && (paymentsError || list.length === 0) && (
          <>
            <Separator />
            <DronePaymentCodes drone={drone} />
          </>
        )}

        <Separator />
        {paymentsError ? (
          <p className="text-xs text-muted-foreground">{t("admin.orders.detail.payment.unavailable")}</p>
        ) : noTransaction ? (
          <p className="text-xs text-muted-foreground">
            {total === 0 || (order.paymentStatus === "PAID" && Number(paid ?? 0) === 0)
              ? t("admin.orders.detail.payment.freeOrder")
              : t("admin.orders.detail.payment.noPayments")}
          </p>
        ) : (
          <div className="space-y-2" data-tour="order-detail-transactions">
            <SectionLabel>{t("admin.orders.detail.payment.transactions")}</SectionLabel>
            {list.map((payment, index) => (
              <PaymentRow key={payment.id} payment={payment} index={index} total={list.length} />
            ))}
          </div>
        )}

        {refunds.length > 0 && (
          <div className="space-y-2" data-tour="order-detail-refunds">
            <SectionLabel>{t("admin.orders.detail.payment.refunds")}</SectionLabel>
            {refunds.map((refund) => (
              <RefundRow key={refund.id} refund={refund} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function categoryLabel(category: string | null | undefined, t: (key: string) => string) {
  if (!category) return null;
  return PARCEL_CATEGORY_LABELS[category] ? t(PARCEL_CATEGORY_LABELS[category]) : category;
}

/** Các dòng "Kiện hàng" giống app khách (`orderParcelRows`). */
export function ParcelRows({ parcel }: { parcel: CustomerOrderParcel | null }) {
  const { t } = useTranslation();
  if (!parcel) {
    return <p className="text-xs text-muted-foreground">{t("admin.orders.detail.parcel.notDeclared")}</p>;
  }
  const weight =
    parcel.weightGrams !== null && parcel.weightGrams !== undefined
      ? `${formatNumber(parcel.weightGrams)} g`
      : parcel.actualWeight !== null && parcel.actualWeight !== undefined
        ? `${formatNumber(parcel.actualWeight)} ${parcel.weightUnit ?? ""}`.trim()
        : null;
  const size =
    parcel.lengthCm && parcel.widthCm && parcel.heightCm
      ? `${parcel.lengthCm} × ${parcel.widthCm} × ${parcel.heightCm} cm`
      : null;
  // Chỉ hiện dòng khách có khai; đơn gửi hàng thường chỉ có mô tả.
  const rows = [
    { key: "category", label: t("admin.orders.detail.parcel.category"), value: categoryLabel(parcel.category, t) },
    { key: "weight", label: t("admin.orders.detail.parcel.weight"), value: weight },
    { key: "size", label: t("admin.orders.detail.parcel.size"), value: size },
    {
      key: "fragile",
      label: t("admin.orders.detail.parcel.fragile"),
      value:
        parcel.fragile === null || parcel.fragile === undefined
          ? null
          : parcel.fragile
            ? t("admin.orders.detail.parcel.fragileYes")
            : t("admin.orders.detail.parcel.fragileNo"),
    },
    { key: "declaredValue", label: t("admin.orders.detail.parcel.declaredValue"), value: money(parcel.declaredValue) },
    { key: "prohibited", label: t("admin.orders.detail.parcel.prohibitedDeclared"), value: at(parcel.prohibitedItemsDeclaredAt) },
  ].filter((row) => row.value);
  if (!parcel.description && rows.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {parcel.description && (
        <LabelValue label={t("admin.orders.detail.parcel.description")} className="col-span-2 md:col-span-3">
          {parcel.description}
        </LabelValue>
      )}
      {rows.map((row) => (
        <LabelValue key={row.key} label={row.label}>
          {row.value}
        </LabelValue>
      ))}
    </div>
  );
}

/**
 * "Kiện hàng & ghi chú" cho đơn gửi hàng / thuê ô: khai báo kiện như app khách, đồ gửi kèm, ghi chú, bước
 * tiếp theo (khi đơn còn mở), lý do huỷ. Dòng không có dữ liệu thì ẩn; không còn gì thì ẩn cả khối.
 * Loại dịch vụ không lặp lại ở đây vì đã có ở băng trạng thái.
 */
export function ParcelNotesCard({ order, view }: { order: AdminOrder; view: CustomerOrderView | null }) {
  const { t } = useTranslation();
  const rawParcel = view?.parcel ?? null;
  const parcel =
    rawParcel &&
    (rawParcel.description ||
      rawParcel.category ||
      rawParcel.weightGrams != null ||
      rawParcel.actualWeight != null ||
      rawParcel.lengthCm ||
      rawParcel.fragile != null ||
      rawParcel.declaredValue != null ||
      rawParcel.prohibitedItemsDeclaredAt)
      ? rawParcel
      : null;
  const customerNote = view?.customerNote ?? order.customerNote;
  const open = !["COMPLETED", "CANCELED"].includes(order.status);
  const nextAction =
    open && order.nextAction && order.nextAction !== "DONE"
      ? t(
          order.type === "RENTAL"
            ? [`admin.orders.nextAction.rental.${order.nextAction}`, `admin.orders.nextAction.${order.nextAction}`]
            : `admin.orders.nextAction.${order.nextAction}`,
          { defaultValue: order.nextActionMessage ?? order.nextAction },
        )
      : null;
  const cancelReason =
    order.cancelReason !== null && order.cancelReason !== undefined
      ? CANCEL_REASON_LABELS[order.cancelReason]
        ? t(CANCEL_REASON_LABELS[order.cancelReason])
        : t("admin.orders.detail.parcel.cancelReasonCode", { code: order.cancelReason })
      : null;
  const measured = order.actualWeight !== null && order.actualWeight !== undefined && Number(order.actualWeight) > 0;
  const lines = order.orderDetails ?? [];
  const notes = [
    customerNote ? { key: "customerNote", label: t("admin.orders.detail.parcel.customerNote"), value: customerNote } : null,
    order.staffNote ? { key: "staffNote", label: t("admin.orders.detail.parcel.staffNote"), value: order.staffNote } : null,
    nextAction ? { key: "nextAction", label: t("admin.orders.detail.parcel.nextAction"), value: nextAction } : null,
    cancelReason ? { key: "cancelReason", label: t("admin.orders.detail.parcel.cancelReason"), value: cancelReason } : null,
  ].filter((row): row is { key: string; label: string; value: string } => row !== null);

  if (!parcel && !measured && lines.length === 0 && notes.length === 0) return null;

  return (
    <Card data-tour="order-detail-parcel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4" />
          {t("admin.orders.detail.parcel.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {parcel && <ParcelRows parcel={parcel} />}

        {measured && (
          <LabelValue label={t("admin.orders.detail.parcel.measuredWeight")}>
            {`${formatNumber(order.actualWeight)} ${order.weightUnit ?? ""}`}
          </LabelValue>
        )}

        {lines.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>{t("admin.orders.detail.parcel.services")}</SectionLabel>
            {/* `price` của dòng đã là thành tiền (đơn giá × số lượng) — không nhân lại. */}
            {lines.map((line, index) => (
              <div
                key={`${line.serviceId ?? "line"}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {line.description || t("admin.orders.detail.parcel.noDescription")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.orders.detail.parcel.quantity", { quantity: formatNumber(line.quantity) })}
                  </p>
                </div>
                <span className="font-medium shrink-0">{formatCurrency(line.price)}</span>
              </div>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <>
            {(parcel || measured || lines.length > 0) && <Separator />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notes.map((row) => (
                <LabelValue key={row.key} label={row.label}>
                  {row.value}
                </LabelValue>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
