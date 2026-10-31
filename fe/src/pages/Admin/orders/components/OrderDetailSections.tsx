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
import { PARCEL_CATEGORY_LABELS, routeDistance } from "../../drone-orders/format";
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

/** Các dòng của khối thông tin chính trên app khách (tủ/ô đã có ở khối "Tủ & ô"). */
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
  const overdue = Number(view?.pickupOvertimeFee ?? 0) > 0;
  const delegated = Boolean(view?.delegatedAt);
  const receiverLine = [view?.receiverName ?? order.receiverName, view?.receiverPhone ?? order.receiverPhone]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
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
          {isRental && (
            <LabelValue label={t("admin.orders.detail.view.rentalHours")}>
              {order.rentalDurationHours !== null
                ? t("admin.orders.detail.parcel.hours", { hours: formatNumber(order.rentalDurationHours) })
                : null}
            </LabelValue>
          )}
          <LabelValue label={t("admin.orders.detail.view.deadline")}>{at(order.pickupDeadline)}</LabelValue>
          <LabelValue label={t("admin.orders.detail.view.intendedReceive")}>
            {at(view?.intendedReceiveAt ?? order.intendedReceiveAt)}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.view.droppedAt")}>
            {at(view?.parcelDroppedAt ?? view?.dropOpenedAt)}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.view.deliveryAddress")}>
            {view?.deliveryAddress ?? order.deliveryAddress}
          </LabelValue>
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

        <Separator />
        <SectionLabel>{t("admin.orders.fields.receiver")}</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LabelValue label={t("admin.orders.detail.view.receiver")}>{receiverLine || null}</LabelValue>
          <LabelValue label={t("admin.orders.detail.customer.receiverEmail")}>
            {view?.receiverEmail ?? order.receiver?.email}
          </LabelValue>
        </div>
        {delegated && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3">
            <LabelValue label={t("admin.orders.detail.view.delegate")}>
              {[view?.delegateName, view?.delegatePhone].filter(Boolean).join(" · ") || null}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.view.delegateNote")}>{view?.delegateNote}</LabelValue>
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
    <Card>
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
          <p className="text-xs text-muted-foreground">{t("admin.orders.detail.code.none")}</p>
        )}

        {order.type === "DRONE_DELIVERY" && (
          <>
            <Separator />
            <LabelValue label={t("admin.orders.detail.code.homePickup")} mono>
              {homePickupCode ? (
                <span className="text-base font-bold tracking-widest">{homePickupCode}</span>
              ) : drone?.pickup ? (
                t("admin.orders.detail.code.homePickupUsed")
              ) : null}
            </LabelValue>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4" />
          {t("common.payment")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} />
          {order.paymentRequired === false && (
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
          <LabelValue label={t("admin.orders.detail.payment.refunded")}>{money(summary?.refundedAmount)}</LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.paidAt")} mono>{at(view?.paidAt ?? order.paidAt)}</LabelValue>
          <LabelValue label={t("admin.orders.detail.payment.paymentCount")}>
            {payments !== null ? formatNumber(list.length) : summary ? formatNumber(summary.paymentCount) : null}
          </LabelValue>
          {Number(view?.pointsUsed ?? order.pointsUsed ?? 0) > 0 && (
            <LabelValue label={t("admin.orders.detail.fees.pointsDiscount")} className="col-span-2">
              − {formatCurrency(view?.pointsDiscount ?? order.pointsDiscount ?? 0)} (
              {t("admin.orders.detail.fees.pointsUsed", { points: formatNumber(view?.pointsUsed ?? order.pointsUsed ?? 0) })})
            </LabelValue>
          )}
        </div>

        {hasDroneCodes && drone && (
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
          <div className="space-y-2">
            <SectionLabel>{t("admin.orders.detail.payment.transactions")}</SectionLabel>
            {list.map((payment, index) => (
              <PaymentRow key={payment.id} payment={payment} index={index} total={list.length} />
            ))}
          </div>
        )}

        {refunds.length > 0 && (
          <div className="space-y-2">
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <LabelValue label={t("admin.orders.detail.parcel.description")} className="col-span-2 md:col-span-3">
        {parcel.description}
      </LabelValue>
      <LabelValue label={t("admin.orders.detail.parcel.category")}>{categoryLabel(parcel.category, t)}</LabelValue>
      <LabelValue label={t("admin.orders.detail.parcel.weight")}>{weight}</LabelValue>
      <LabelValue label={t("admin.orders.detail.parcel.size")}>{size}</LabelValue>
      <LabelValue label={t("admin.orders.detail.parcel.fragile")}>
        {parcel.fragile === null || parcel.fragile === undefined
          ? null
          : parcel.fragile
            ? t("admin.orders.detail.parcel.fragileYes")
            : t("admin.orders.detail.parcel.fragileNo")}
      </LabelValue>
      <LabelValue label={t("admin.orders.detail.parcel.declaredValue")}>{money(parcel.declaredValue)}</LabelValue>
      <LabelValue label={t("admin.orders.detail.parcel.prohibitedDeclared")}>{at(parcel.prohibitedItemsDeclaredAt)}</LabelValue>
    </div>
  );
}

/** "Kiện hàng & ghi chú" cho đơn gửi hàng / thuê ô: khai báo kiện như app khách + dịch vụ + ghi chú. */
export function ParcelNotesCard({ order, view }: { order: AdminOrder; view: CustomerOrderView | null }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4" />
          {t("admin.orders.detail.parcel.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ParcelRows parcel={view?.parcel ?? null} />

        {(order.serviceCategory || order.actualWeight !== null) && (
          <div className="grid grid-cols-2 gap-3">
            {order.serviceCategory && (
              <LabelValue label={t("admin.orders.detail.parcel.serviceCategory")}>{order.serviceCategory}</LabelValue>
            )}
            {order.actualWeight !== null && (
              <LabelValue label={t("admin.orders.detail.parcel.measuredWeight")}>
                {`${formatNumber(order.actualWeight)} ${order.weightUnit ?? ""}`}
              </LabelValue>
            )}
          </div>
        )}

        {order.orderDetails && order.orderDetails.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>{t("admin.orders.detail.parcel.services")}</SectionLabel>
            {/* `price` của dòng đã là thành tiền (đơn giá × số lượng) — không nhân lại. */}
            {order.orderDetails.map((line, index) => (
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

        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LabelValue label={t("admin.orders.detail.parcel.customerNote")}>{view?.customerNote ?? order.customerNote}</LabelValue>
          <LabelValue label={t("admin.orders.detail.parcel.staffNote")}>{order.staffNote}</LabelValue>
          <LabelValue label={t("admin.orders.detail.parcel.nextAction")}>
            {order.nextActionMessage ?? order.nextAction}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.parcel.cancelReason")} mono>
            {order.cancelReason !== null
              ? t("admin.orders.detail.parcel.cancelReasonCode", { code: order.cancelReason })
              : null}
          </LabelValue>
        </div>
      </CardContent>
    </Card>
  );
}
