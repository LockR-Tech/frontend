import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  AlertCircle,
  ArrowLeft,
  Box,
  Clock,
  CreditCard,
  Edit3,
  ExternalLink,
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
  useGetDroneIncidentsQuery,
  type DroneParcelIncident,
} from "~/stores/apis/admin/droneIncidents";
import { useGetDroneOrderQuery, type DroneOrderTracking } from "~/stores/apis/admin/droneOrders";
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
import {
  DroneCurrentPosition,
  DroneFeesCard,
  DroneJourneyLink,
  DroneParcelCard,
  DronePaymentCodes,
  DronePickupCard,
} from "./components/DroneOrderSections";
import { adminOrderNextStatuses } from "~/types/admin/reporting";
import type { AdminOrder, AdminOrderFees } from "~/types/admin/reporting";

function getIncidentShortStatus(incident: DroneParcelIncident): string {
  if (incident.status === "CLOSED") return "Đã đóng";
  if (incident.status === "RESOLVED") return "Đã giải quyết";
  if (incident.recoveryStatus === "SUBMITTED") return "Chờ duyệt thu hồi";
  if (incident.recoveryStatus === "SEARCHING") return "Đang tìm kiếm";
  if (incident.recoveryStatus === "VERIFIED" || incident.parcelStatus === "RETURNED_TO_HUB") return "Đã thu hồi";
  if (incident.recoveryStatus === "ACCEPTED") return "KTV đã nhận";
  if (incident.recoveryStatus === "ASSIGNED") return "Chờ KTV nhận";
  if (incident.status === "RESOLUTION_IN_PROGRESS" || incident.compensationStatus === "PROCESSING") return "Đang bồi thường";
  if (incident.status === "RESOLUTION_PROPOSED" || incident.status === "AWAITING_CUSTOMER_RESPONSE") return "Chờ khách chọn bồi thường";
  if (incident.recoveryStatus === "AWAITING_ASSIGNMENT" || incident.status === "REPORTED" || incident.recoveryStatus === "OPEN") return "Chờ điều phối";
  return incident.status;
}

/**
 * Nhãn tủ cho người đọc: ưu tiên TÊN, mã tủ chỉ là phần phụ trong ngoặc.
 * Không bao giờ rơi về `#id` — mã số nội bộ không cho người xem biết tủ nào.
 * Tra cứu hỏng (không có cả tên lẫn mã) thì nói thẳng là chưa tra được.
 */
function lockerLabel(locker: AdminOrder["locker"], t: TFunction): string | null {
  if (!locker) return null;
  if (locker.name && locker.code) return `${locker.name} (${locker.code})`;
  return locker.name ?? locker.code ?? t("admin.orders.lookup.lockerName");
}

/**
 * Thứ tự dòng phí giống lúc tính tiền: các khoản cộng trước, giảm giá sau, tổng cuối.
 * `overtimeFee` chính là `extraFee` nên chỉ hiện một lần, dưới tên dễ hiểu.
 */
function feeRows(fees: AdminOrderFees) {
  return [
    { labelKey: "admin.orders.detail.fees.originalPrice", value: fees.originalPrice },
    { labelKey: "admin.orders.detail.fees.reservationFee", value: fees.reservationFee },
    { labelKey: "admin.orders.detail.fees.storagePrice", value: fees.storagePrice },
    { labelKey: "admin.orders.detail.fees.shippingFee", value: fees.shippingFee },
    { labelKey: "admin.orders.detail.fees.overtimeFee", value: fees.overtimeFee },
    { labelKey: "admin.orders.detail.fees.discount", value: fees.discount, negative: true },
  ].filter((row) => row.value !== null && row.value !== undefined);
}

/** Dòng "Điểm thưởng": chỉ hiện khi đơn có dùng điểm (trừ sau voucher). */
function PointsDiscountRow({ order, t }: { order: AdminOrder; t: TFunction }) {
  const pointsUsed = Number(order.pointsUsed ?? 0);
  if (!(pointsUsed > 0)) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{t("admin.orders.detail.fees.pointsDiscount")}</span>
      <span className="text-right text-emerald-600 dark:text-emerald-400">
        − {formatCurrency(order.pointsDiscount ?? 0)}{" "}
        <span className="text-xs text-muted-foreground">
          ({t("admin.orders.detail.fees.pointsUsed", { points: formatNumber(pointsUsed) })})
        </span>
      </span>
    </div>
  );
}

/**
 * Backend trả `appliedPromotionCodes` là MỘT chuỗi nối bằng dấu phẩy, không phải mảng.
 * Đơn cũ chỉ có `promotionCode` thì dùng mã đó.
 */
function parsePromotionCodes(order: AdminOrder): string[] {
  const raw = order.appliedPromotionCodes;
  const codes =
    typeof raw === "string"
      ? raw.split(",").map((code) => code.trim()).filter(Boolean)
      : [];
  if (codes.length > 0) return codes;
  return order.promotionCode ? [order.promotionCode] : [];
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
  const { t } = useTranslation();
  const { customer, receiver } = order;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          {t("common.customer")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <User className="h-3 w-3" />
            {t("admin.orders.fields.sender")}
          </p>
          <LabelValue label={t("admin.orders.fields.fullName")}>{customer?.fullName}</LabelValue>
          <LabelValue label={t("common.phoneShort")} mono>
            {customer?.phoneNumber}
          </LabelValue>
          <LabelValue label={t("common.email")}>{customer?.email}</LabelValue>
          <LabelValue label={t("admin.orders.fields.accountStatus")}>{customer?.status}</LabelValue>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <User className="h-3 w-3" />
            {t("admin.orders.fields.receiver")}
          </p>
          <LabelValue label={t("admin.orders.detail.customer.receiverName")}>{receiver?.name}</LabelValue>
          <LabelValue label={t("admin.orders.detail.customer.receiverPhone")} mono>
            {receiver?.phone}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.customer.receiverEmail")}>{receiver?.email}</LabelValue>
          {/* Thông tin tài khoản chỉ có khi người nhận đã có tài khoản Lock.R. */}
          <LabelValue label={t("admin.orders.detail.customer.receiverAccount")}>
            {receiver?.userId ? (
              <span>
                {receiver.accountFullName ??
                  t("admin.orders.detail.customer.receiverAccountNoName")}
                {receiver.accountPhoneNumber
                  ? ` · ${receiver.accountPhoneNumber}`
                  : ""}
              </span>
            ) : null}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.customer.accountEmail")}>{receiver?.accountEmail}</LabelValue>
        </div>
      </CardContent>
    </Card>
  );
}

/** Đơn drone chỉ giao VÀO tủ: không có ô gửi, ô khách chọn là ô nhận. Đơn cũ (trước V32) còn lưu ô ở sendBox. */
function isDroneOrder(order: AdminOrder) {
  return order.type === "DRONE_DELIVERY";
}

function droneReceiveBoxNumber(order: AdminOrder) {
  return order.receiveBoxNumber ?? order.reservedBoxNumber ?? order.sendBoxNumber;
}

function DroneLockerCard({ order }: { order: AdminOrder }) {
  const { t } = useTranslation();
  const receiveLocker = order.destinationLocker ?? order.locker;
  const boxNumber = droneReceiveBoxNumber(order);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          {t("admin.orders.detail.locker.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <LabelValue label={t("admin.orders.detail.locker.receiveLocker")}>
          {lockerLabel(receiveLocker, t)}
        </LabelValue>
        <LabelValue label={t("admin.orders.detail.locker.receiveLockerAddress")}>
          {receiveLocker?.address}
        </LabelValue>
        <LabelValue label={t("admin.orders.detail.locker.receiveBox")}>
          {boxNumber !== null ? t("admin.orders.boxNumber", { number: boxNumber }) : null}
        </LabelValue>
        <p className="text-[11px] text-muted-foreground">{t("admin.orders.detail.locker.droneNoSendBox")}</p>
      </CardContent>
    </Card>
  );
}

function LockerCard({ order }: { order: AdminOrder }) {
  const { t } = useTranslation();
  const { locker, destinationLocker, store } = order;
  if (isDroneOrder(order)) return <DroneLockerCard order={order} />;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          {t("admin.orders.detail.locker.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <LabelValue label={t("admin.orders.detail.locker.sendLocker")}>{lockerLabel(locker, t)}</LabelValue>
        <LabelValue label={t("admin.orders.detail.locker.sendLockerAddress")}>{locker?.address}</LabelValue>

        {destinationLocker && (
          <>
            <LabelValue label={t("admin.orders.detail.locker.destinationLocker")}>
              {lockerLabel(destinationLocker, t)}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.locker.destinationLockerAddress")}>
              {destinationLocker.address}
            </LabelValue>
          </>
        )}

        <div className="grid grid-cols-3 gap-2">
          <LabelValue label={t("admin.orders.detail.locker.sendBox")}>
            {order.sendBoxNumber !== null
              ? t("admin.orders.boxNumber", { number: order.sendBoxNumber })
              : null}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.locker.receiveBox")}>
            {order.receiveBoxNumber !== null
              ? t("admin.orders.boxNumber", { number: order.receiveBoxNumber })
              : null}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.locker.reservedBox")}>
            {order.reservedBoxNumber !== null
              ? t("admin.orders.boxNumber", { number: order.reservedBoxNumber })
              : null}
          </LabelValue>
        </div>
        {order.status === "EXPIRED" && (
          <p className="text-[11px] text-muted-foreground">
            {t("admin.orders.detail.locker.expiredNoBox")}
          </p>
        )}

        <Separator />

        <LabelValue label={t("common.store")}>
          <span className="inline-flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            {store?.name ?? null}
          </span>
        </LabelValue>
        <LabelValue label={t("admin.orders.detail.locker.storeContact")} mono>
          {store?.contactPhone}
        </LabelValue>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <LabelValue label={t("admin.orders.detail.locker.pinCode")} mono>
            {order.pinCode ? (
              <span className="tracking-widest font-bold">{order.pinCode}</span>
            ) : null}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.locker.pinIssuedAt")}>
            {order.pinCodeIssuedAt ? formatDateTime(order.pinCodeIssuedAt) : null}
          </LabelValue>
        </div>
        <LabelValue label={t("admin.orders.detail.locker.qrCode")} mono>
          {order.qrToken}
        </LabelValue>
      </CardContent>
    </Card>
  );
}

function PaymentCard({ order, drone }: { order: AdminOrder; drone?: DroneOrderTracking | null }) {
  const { t } = useTranslation();
  const payment = order.payment;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4" />
          {t("common.payment")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} />
          {order.paymentRequired === false && (
            <span className="text-[11px] text-muted-foreground">
              {t("admin.orders.detail.payment.noMoreDue")}
            </span>
          )}
        </div>

        {drone && (
          <>
            <DronePaymentCodes drone={drone} />
            <Separator />
          </>
        )}

        {/* `payment = null` nghĩa là payment-service không trả lời, không phải "chưa trả đồng nào". */}
        {payment === null ? (
          <p className="text-xs text-muted-foreground">
            {t("admin.orders.detail.payment.unavailable")}
          </p>
        ) : payment.paymentCount === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("admin.orders.detail.payment.noPayments")}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <LabelValue label={t("admin.orders.detail.payment.paid")}>
                {formatCurrency(payment.paidAmount)}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.payment.outstanding")}>
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
              <LabelValue label={t("admin.orders.detail.payment.refunded")}>
                {formatCurrency(payment.refundedAmount)}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.payment.paymentCount")}>
                {formatNumber(payment.paymentCount)}
              </LabelValue>
            </div>

            <Separator />

            <LabelValue label={t("admin.orders.detail.payment.lastPaid")}>
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
                {t("admin.orders.detail.payment.latestTransaction")}
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

function DroneCard({
  order,
  parcelDropIncident,
  droneOrder,
}: {
  order: AdminOrder;
  parcelDropIncident?: DroneParcelIncident | null;
  droneOrder?: DroneOrderTracking | null;
}) {
  const { t } = useTranslation();
  const drone = order.drone;
  if (!drone) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Plane className="h-4 w-4" />
          {t("admin.orders.detail.drone.title")}
          <span className="ml-auto font-normal">
            <DroneJourneyLink orderId={order.id} />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {drone.deliveryStage && (
            <MetaBadge meta={deliveryStageMeta(drone.deliveryStage)} />
          )}
          {drone.missionStatus && (
            <span className="text-xs text-muted-foreground self-center">
              {t("admin.orders.detail.drone.mission", { status: drone.missionStatus })}
            </span>
          )}
        </div>

        {parcelDropIncident && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/70 p-2.5 text-xs text-red-900">
            <div className="flex items-center gap-1.5 font-medium truncate">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>Sự cố rơi ({parcelDropIncident.incidentCode}): {getIncidentShortStatus(parcelDropIncident)}</span>
            </div>
            <Link
              to={`/admin/drone-incidents/${parcelDropIncident.id}`}
              className="font-semibold text-red-700 hover:underline inline-flex items-center gap-1 shrink-0 ml-2"
            >
              Chi tiết <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Khi đơn chưa được gán nhiệm vụ, backend chỉ trả chặng và tủ đích. */}
        {drone.missionId === null ? (
          <p className="text-xs text-muted-foreground">
            {t("admin.orders.detail.drone.noMission")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <LabelValue label="Drone">
              {/* Mã drone là tên gọi ngoài đời của thiết bị (DR-01), luôn ưu tiên. */}
              {drone.droneCode ?? t("admin.orders.lookup.droneCode")}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.drone.dispatcher")}>
              {drone.assignedByUserId
                ? t("admin.orders.detail.drone.assignedManually")
                : t("admin.orders.detail.drone.assignedAuto")}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.drone.sourceLocker")}>
              {lockerLabel(drone.sourceLocker, t) ?? t("admin.orders.lookup.lockerName")}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.locker.destinationLocker")}>
              {/* Tủ đích của đơn và của chuyến bay là một; khối Tủ ở trên đã có tên. */}
              {lockerLabel(order.destinationLocker, t) ?? t("admin.orders.lookup.lockerName")}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.drone.readyToLaunch")}>
              {drone.readyToLaunchAt ? formatDateTime(drone.readyToLaunchAt) : null}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.drone.launching")}>
              {drone.launchingAt ? formatDateTime(drone.launchingAt) : null}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.drone.missionCreated")}>
              {drone.createdAt ? formatDateTime(drone.createdAt) : null}
            </LabelValue>
            <LabelValue label={t("admin.orders.detail.updatedAt")}>
              {drone.updatedAt ? formatDateTime(drone.updatedAt) : null}
            </LabelValue>
            {droneOrder && <DroneCurrentPosition drone={droneOrder} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { order, isLoading, error, refetch, isValidId } = useOrderDetail(orderId);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const { data: droneIncidentsData } = useGetDroneIncidentsQuery(undefined, {
    pollingInterval: 15000,
  });
  const incidents = droneIncidentsData?.data ?? [];

  // Đơn drone: phần riêng (lấy hàng, kiện, phí, mã thanh toán) đọc cùng nguồn với app khách.
  const droneQuery = useGetDroneOrderQuery(order?.id ?? 0, {
    skip: !order || !isDroneOrder(order),
    pollingInterval: 15000,
  });
  const droneOrder = order && isDroneOrder(order) ? droneQuery.data?.data ?? null : null;
  const parcelDropIncident = useMemo(() => {
    if (!order) return null;
    return (
      incidents.find(
        (inc) =>
          inc.orderId === order.id ||
          (order.orderCode && inc.orderCode === order.orderCode),
      ) ?? null
    );
  }, [incidents, order]);

  if (isLoading) return <DetailSkeleton />;

  if (!isValidId || (error && !order)) {
    return (
      <div className="space-y-4">
        {error ? (
          <ReportErrorState
            error={error}
            onRetry={refetch}
            title={t("admin.orders.detail.loadFailed")}
          />
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
            <h3 className="mt-4 text-lg font-medium">
              {t("admin.orders.detail.invalidId")}
            </h3>
          </div>
        )}
        <div className="text-center">
          <Button onClick={() => navigate("/admin/orders")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("admin.orders.detail.backToList")}
          </Button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const fees = order.fees;
  const promotionCodes = parsePromotionCodes(order);

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
              {order.orderCode ?? t("admin.orders.noCode")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {t("admin.orders.detail.idCreated", {
                id: order.id,
                time: formatDateTime(order.createdAt),
              })}
            </p>
          </div>
        </div>
        {adminOrderNextStatuses(order.status).length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(true)}>
            <Edit3 className="mr-1.5 h-3.5 w-3.5" />
            {t("admin.orders.updateStatus")}
          </Button>
        )}
      </div>

      {/* Băng trạng thái */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <MetaBadge meta={orderStatusMeta(order.status)} />
        <MetaBadge meta={orderTypeMeta(order.type)} hideIcon />
        <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} hideIcon />
        {order.deliveryStage && (
          <MetaBadge meta={deliveryStageMeta(order.deliveryStage)} hideIcon />
        )}
        {parcelDropIncident && (
          <Link
            to={`/admin/drone-incidents/${parcelDropIncident.id}`}
            title={`Sự cố rơi ${parcelDropIncident.incidentCode} - Nhấp để xem chi tiết`}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 shadow-xs hover:bg-red-100 hover:border-red-400 transition-colors"
          >
            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
            <span>Sự cố rơi: {getIncidentShortStatus(parcelDropIncident)}</span>
            <ExternalLink className="h-3 w-3 text-red-500 opacity-70" />
          </Link>
        )}
        {order.overtime && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {t("admin.orders.detail.overtimeCharged")}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto font-mono">
          {t("admin.orders.detail.updatedAtTime", {
            time: formatDateTime(order.updatedAt ?? order.createdAt),
          })}
        </span>
      </div>

      {isDroneOrder(order) && droneQuery.isError && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          {t("admin.orders.detail.droneInfo.loadFailed")}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Mốc thời gian nghiệp vụ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                {t("admin.orders.detail.milestones.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <LabelValue label={t("admin.orders.detail.milestones.created")}>
                {formatDateTime(order.createdAt)}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.milestones.paid")}>
                {order.paidAt ? formatDateTime(order.paidAt) : null}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.milestones.pickupDeadline")}>
                {order.pickupDeadline ? formatDateTime(order.pickupDeadline) : null}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.milestones.intendedReceive")}>
                {order.intendedReceiveAt
                  ? formatDateTime(order.intendedReceiveAt)
                  : null}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.milestones.actualReceive")}>
                {order.receiveAt ? formatDateTime(order.receiveAt) : null}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.milestones.completed")}>
                {order.completedAt ? formatDateTime(order.completedAt) : null}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.milestones.returned")}>
                {order.returnedAt ? formatDateTime(order.returnedAt) : null}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.milestones.lastReminder")}>
                {order.lastReminderAt ? formatDateTime(order.lastReminderAt) : null}
              </LabelValue>
              <LabelValue label={t("admin.orders.detail.updatedAt")}>
                {order.updatedAt ? formatDateTime(order.updatedAt) : null}
              </LabelValue>
            </CardContent>
          </Card>

          {/* Phí */}
          {droneOrder ? (
            <DroneFeesCard drone={droneOrder} />
          ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Receipt className="h-4 w-4" />
                {t("admin.orders.detail.fees.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {fees ? (
                <>
                  {feeRows(fees).map((row) => (
                    <div key={row.labelKey} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{t(row.labelKey)}</span>
                      <span className={row.negative ? "text-emerald-600 dark:text-emerald-400" : ""}>
                        {row.negative && (row.value ?? 0) > 0 ? "− " : ""}
                        {formatCurrency(row.value)}
                      </span>
                    </div>
                  ))}
                  <PointsDiscountRow order={order} t={t} />
                  <Separator />
                  <div className="flex justify-between gap-3 font-semibold">
                    <span>{t("admin.orders.detail.fees.total")}</span>
                    <span className="text-base">{formatCurrency(fees.totalPrice)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t("admin.orders.detail.fees.basePrice", {
                      amount: formatCurrency(fees.basePrice),
                    })}
                  </p>
                </>
              ) : (
                <>
                  <PointsDiscountRow order={order} t={t} />
                  <div className="flex justify-between gap-3 font-semibold">
                    <span>{t("admin.orders.detail.fees.total")}</span>
                    <span>{formatCurrency(order.totalPrice)}</span>
                  </div>
                </>
              )}

              {promotionCodes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("admin.orders.detail.fees.promotions", {
                    codes: promotionCodes.join(", "),
                  })}
                </p>
              )}
            </CardContent>
          </Card>
          )}

          {/* Hàng hoá & ghi chú */}
          {droneOrder ? (
            <>
              <DroneParcelCard order={order} drone={droneOrder} />
              <DronePickupCard drone={droneOrder} />
            </>
          ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" />
                {t("admin.orders.detail.parcel.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <LabelValue label={t("admin.orders.detail.parcel.serviceCategory")}>{order.serviceCategory}</LabelValue>
                <LabelValue label={t("admin.orders.detail.parcel.declaredWeight")}>
                  {order.parcelWeightGrams !== null
                    ? `${formatNumber(order.parcelWeightGrams)} g`
                    : null}
                </LabelValue>
                <LabelValue label={t("admin.orders.detail.parcel.measuredWeight")}>
                  {order.actualWeight !== null
                    ? `${formatNumber(order.actualWeight)} ${order.weightUnit ?? ""}`
                    : null}
                </LabelValue>
                <LabelValue label={t("admin.orders.detail.parcel.rentalHours")}>
                  {order.rentalDurationHours !== null
                    ? t("admin.orders.detail.parcel.hours", {
                        hours: formatNumber(order.rentalDurationHours),
                      })
                    : null}
                </LabelValue>
              </div>

              {order.orderDetails && order.orderDetails.length > 0 && (
                <div className="space-y-2">
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
                          {t("admin.orders.detail.parcel.quantity", {
                            quantity: formatNumber(line.quantity),
                          })}
                        </p>
                      </div>
                      <span className="font-medium shrink-0">
                        {formatCurrency(line.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <LabelValue label={t("admin.orders.detail.parcel.customerNote")}>
                  {order.customerNote}
                </LabelValue>
                <LabelValue label={t("admin.orders.detail.parcel.staffNote")}>{order.staffNote}</LabelValue>
                <LabelValue label={t("common.description")}>{order.description}</LabelValue>
                <LabelValue label={t("admin.orders.detail.parcel.deliveryAddress")}>
                  {order.deliveryAddress}
                </LabelValue>
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
          )}

          {/* Lịch sử trạng thái */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                {t("admin.orders.detail.statusHistory")}
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
          <PaymentCard order={order} drone={droneOrder} />
          <DroneCard order={order} parcelDropIncident={parcelDropIncident} droneOrder={droneOrder} />

          {/* Khối này trước đây liệt kê 6 dòng mã số thô (`#701`, `#7`, `#3`) — nhìn vào
              không biết là tủ nào, cửa hàng nào. Nay hiện tên và số ô mà API chi tiết
              vốn đã trả về sẵn; chỉ giữ lại mã số ở nơi thật sự không có tên. */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <KeyRound className="h-4 w-4" />
                {t("admin.orders.detail.links.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <LabelValue label={t("admin.orders.fields.locker")}>
                {order.locker?.name ?? order.locker?.code}
              </LabelValue>
              <LabelValue label={t("common.store")}>{order.store?.name}</LabelValue>
              {isDroneOrder(order) ? (
                <LabelValue label={t("admin.orders.detail.locker.receiveBox")}>
                  {droneReceiveBoxNumber(order) !== null
                    ? t("admin.orders.boxNumberLong", { number: droneReceiveBoxNumber(order) })
                    : null}
                </LabelValue>
              ) : (
                <>
                  <LabelValue label={t("admin.orders.detail.locker.sendBox")}>
                    {order.sendBoxNumber !== null
                      ? t("admin.orders.boxNumberLong", { number: order.sendBoxNumber })
                      : null}
                  </LabelValue>
                  <LabelValue label={t("admin.orders.detail.locker.receiveBox")}>
                    {order.receiveBoxNumber !== null
                      ? t("admin.orders.boxNumberLong", { number: order.receiveBoxNumber })
                      : null}
                  </LabelValue>
                  <LabelValue label={t("admin.orders.detail.locker.reservedBox")}>
                    {order.reservedBoxNumber !== null
                      ? t("admin.orders.boxNumberLong", { number: order.reservedBoxNumber })
                      : null}
                  </LabelValue>
                </>
              )}
              <LabelValue label={t("admin.orders.detail.links.type")}>
                {orderTypeMeta(order.type).label}
              </LabelValue>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="p-4 flex items-start gap-2.5">
              <Box className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <Trans
                  i18nKey="admin.orders.detail.timezoneNote"
                  components={{ mono: <span className="font-mono" /> }}
                />
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
