import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, Home, Package, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { LabelValue, MetaBadge, paymentMethodMeta } from "~/components/shared/reporting";
import { Coordinates } from "~/components/shared/Coordinates";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency, formatNumber } from "~/lib/report-format";
import type { DroneOrderTracking } from "~/stores/apis/admin/droneOrders";
import type { AdminOrder, CustomerOrderView } from "~/types/admin/reporting";
import {
  CANCEL_REASON_LABELS,
  PARCEL_CATEGORY_LABELS,
  grams,
  parcelSize,
  routeDistance,
} from "../../drone-orders/format";
import { isDroneInFlight, useLivePosition } from "../../drone-orders/livePosition";
import { DronePositionValue } from "../../drone-orders/DronePosition";

// Phần riêng của đơn drone trên trang chi tiết đơn. Số liệu lấy từ `GET /api/admin/drone-orders/{id}`
// — cùng read model (`DroneDeliveryQueryService`) với màn đơn của khách trên app, nên mã đơn, mã
// thanh toán, mã giao dịch và từng khoản phí ở đây trùng khớp với những gì khách thấy.

function money(value: number | null | undefined) {
  return value === null || value === undefined ? null : formatCurrency(value);
}

function FeeRow({
  label,
  value,
  negative,
  strong,
}: {
  label: string;
  value: number | null | undefined;
  negative?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span className={negative ? "text-emerald-600 dark:text-emerald-400" : strong ? "text-base" : undefined}>
        {negative ? "− " : ""}
        {formatCurrency(value ?? 0)}
      </span>
    </div>
  );
}

/** Thứ tự dòng giống màn "Thông tin đơn hàng" của khách: phí gốc, phần thu thêm, các khoản giảm, số tiền thực trả. */
export function DroneFeesCard({ drone }: { drone: DroneOrderTracking }) {
  const { t } = useTranslation();
  const original = Number(drone.originalPrice ?? 0);
  const fee = original > 0 ? original : drone.totalPrice;
  const surcharge = Number(drone.weightSurcharge ?? 0);
  const discount = Number(drone.discount ?? 0);
  const pointsDiscount = Number(drone.pointsDiscount ?? 0);
  const amountDue = Number(drone.amountDue ?? 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Receipt className="h-4 w-4" />
          {t("admin.orders.detail.fees.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <FeeRow label={t("admin.droneOrders.fields.droneFee")} value={fee} />
        {surcharge > 0 && (
          <FeeRow label={t("admin.orders.detail.droneInfo.surchargeIncluded")} value={surcharge} />
        )}
        {discount > 0 && (
          <FeeRow
            label={
              drone.promotionCode
                ? t("admin.orders.detail.droneInfo.promotion", { code: drone.promotionCode })
                : t("admin.orders.detail.droneInfo.promotionNoCode")
            }
            value={discount}
            negative
          />
        )}
        {pointsDiscount > 0 && (
          <FeeRow
            label={t("admin.orders.detail.droneInfo.pointsUsed", {
              points: formatNumber(drone.pointsUsed ?? 0),
            })}
            value={pointsDiscount}
            negative
          />
        )}
        <Separator />
        <FeeRow label={t("admin.orders.detail.droneInfo.amountPaid")} value={drone.totalPrice} strong />
        {amountDue > 0 && (
          <div className="flex justify-between gap-3 text-amber-600 dark:text-amber-400">
            <span>{t("admin.orders.detail.droneInfo.amountDue")}</span>
            <span className="font-medium">{formatCurrency(amountDue)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DroneParcelCard({
  order,
  drone,
  view,
}: {
  order: AdminOrder;
  drone: DroneOrderTracking;
  /** Đơn như app khách thấy — ghi chú của khách và cam kết không hàng cấm. */
  view?: CustomerOrderView | null;
}) {
  const { t } = useTranslation();
  const category = drone.parcelCategory
    ? PARCEL_CATEGORY_LABELS[drone.parcelCategory]
      ? t(PARCEL_CATEGORY_LABELS[drone.parcelCategory])
      : drone.parcelCategory
    : null;
  const cancelReason =
    drone.cancelReason !== null
      ? CANCEL_REASON_LABELS[drone.cancelReason]
        ? t(CANCEL_REASON_LABELS[drone.cancelReason])
        : t("admin.droneOrders.cancelReason.unknown", { code: drone.cancelReason })
      : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4" />
          {t("admin.orders.detail.parcel.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <LabelValue label={t("admin.droneOrders.fields.declaredWeight")}>
            {grams(drone.parcelWeightGrams ?? order.parcelWeightGrams)}
          </LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.actualWeight")}>
            {grams(drone.payloadWeightGrams)}
          </LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.parcelCategory")}>
            {category}
            {drone.fragile ? ` · ${t("admin.droneOrders.fields.fragile")}` : ""}
          </LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.parcelSize")}>{parcelSize(drone)}</LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.declaredValue")}>
            {money(drone.declaredValue)}
          </LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.flightDistance")}>
            {routeDistance(drone.routeDistanceMeters)}
          </LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.flightMode")}>
            {drone.fulfillmentMode === "DEMO"
              ? t("admin.droneOrders.fields.modeDemo")
              : drone.fulfillmentMode === "STANDARD"
                ? t("admin.droneOrders.fields.modeStandard")
                : drone.fulfillmentMode}
          </LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.sealCode")} mono>
            {drone.sealCode}
          </LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.loadingNote")}>{drone.loadingNote}</LabelValue>
        </div>
        <LabelValue label={t("admin.droneOrders.fields.parcelDescription")}>
          {drone.description ?? order.description}
        </LabelValue>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LabelValue label={t("admin.orders.detail.parcel.customerNote")}>
            {view?.customerNote ?? order.customerNote}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.parcel.prohibitedDeclared")}>
            {view?.parcel?.prohibitedItemsDeclaredAt ? formatDateTime(view.parcel.prohibitedItemsDeclaredAt) : null}
          </LabelValue>
          <LabelValue label={t("admin.orders.detail.parcel.staffNote")}>{order.staffNote}</LabelValue>
          <LabelValue label={t("admin.orders.detail.parcel.cancelReason")}>
            {[cancelReason, drone.cancelNote].filter(Boolean).join(" · ") || null}
          </LabelValue>
        </div>
      </CardContent>
    </Card>
  );
}

/** Người gửi khai trên đơn và việc lấy hàng tận nơi (KTV, toạ độ, ảnh kiện). */
export function DronePickupCard({ drone }: { drone: DroneOrderTracking }) {
  const { t } = useTranslation();
  const pickup = drone.pickup;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Home className="h-4 w-4" />
          {t("admin.orders.detail.droneInfo.pickupTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <LabelValue label={t("admin.orders.detail.droneInfo.senderOnOrder")}>
            {drone.sender?.name ?? drone.customerName}
          </LabelValue>
          <LabelValue label={t("admin.droneOrders.fields.senderPhone")} mono>
            {drone.sender?.phone ?? drone.customerPhone}
          </LabelValue>
          <LabelValue label={t("common.email")}>{drone.sender?.email}</LabelValue>
        </div>

        {pickup && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelValue label={t("admin.droneOrders.pickup.status")}>
                {pickup.status
                  ? t(`admin.droneOrders.pickup.statusLabel.${pickup.status}`, {
                      defaultValue: pickup.status,
                    })
                  : null}
              </LabelValue>
              <LabelValue label={t("admin.droneOrders.pickup.toSourceLocker")}>
                {routeDistance(pickup.distanceToSourceLockerMeters)}
              </LabelValue>
            </div>
            <LabelValue label={t("admin.droneOrders.pickup.address")}>{pickup.address}</LabelValue>
            <LabelValue label={t("admin.orders.detail.droneInfo.coordinates")} mono>
              <Coordinates lat={pickup.latitude} lng={pickup.longitude} />
            </LabelValue>
            <LabelValue label={t("admin.droneOrders.pickup.note")}>{pickup.note}</LabelValue>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelValue label={t("admin.droneOrders.pickup.technician")}>
                {pickup.technicianName
                  ? `${pickup.technicianName}${pickup.technicianPhone ? ` · ${pickup.technicianPhone}` : ""}`
                  : null}
              </LabelValue>
              <LabelValue label={t("admin.droneOrders.pickup.technicianNote")}>
                {pickup.technicianNote}
              </LabelValue>
              <LabelValue label={t("admin.droneOrders.pickup.acceptedAt")} mono>
                {pickup.acceptedAt ? formatDateTime(pickup.acceptedAt) : null}
              </LabelValue>
              <LabelValue label={t("admin.droneOrders.pickup.pickedUpAt")} mono>
                {pickup.pickedUpAt ? formatDateTime(pickup.pickedUpAt) : null}
              </LabelValue>
            </div>
            {(pickup.failureReason || pickup.failureNote) && (
              <LabelValue label={t("admin.droneOrders.pickup.failure")}>
                {[pickup.failureReason, pickup.failureNote].filter(Boolean).join(" · ")}
              </LabelValue>
            )}
            {pickup.pickupPhotoUrl && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">{t("admin.droneOrders.pickup.photo")}</p>
                <a href={pickup.pickupPhotoUrl} target="_blank" rel="noreferrer">
                  <img
                    src={pickup.pickupPhotoUrl}
                    alt={t("admin.droneOrders.pickup.photoTitle", { code: drone.orderCode })}
                    className="h-32 w-auto rounded-lg border object-cover"
                    loading="lazy"
                  />
                </a>
                {pickup.pickupPhotoCapturedAt && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {formatDateTime(pickup.pickupPhotoCapturedAt)}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Mã thanh toán / mã giao dịch của lần thu thành công gần nhất — đúng các mã khách thấy trên app. */
export function DronePaymentCodes({ drone }: { drone: DroneOrderTracking }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-3">
      <LabelValue label={t("admin.droneOrders.fields.paymentMethod")}>
        {drone.paymentMethod ? <MetaBadge meta={paymentMethodMeta(drone.paymentMethod)} hideIcon /> : null}
      </LabelValue>
      <LabelValue label={t("admin.droneOrders.fields.paidAt")} mono>
        {drone.paidAt ? formatDateTime(drone.paidAt) : null}
      </LabelValue>
      <LabelValue label={t("admin.droneOrders.fields.paymentReference")} mono className="col-span-2">
        {drone.paymentReference}
      </LabelValue>
      <LabelValue label={t("admin.droneOrders.fields.transactionId")} mono className="col-span-2">
        {drone.paymentTransactionId}
      </LabelValue>
    </div>
  );
}

/** Vị trí drone hiện tại trên trang chi tiết đơn — nghe cùng luồng STOMP với trang hành trình drone. */
export function DroneCurrentPosition({ drone }: { drone: DroneOrderTracking }) {
  const { t } = useTranslation();
  const live = useLivePosition(drone.orderId, isDroneInFlight(drone));
  return (
    <LabelValue label={t("admin.droneOrders.fields.currentPosition")} className="col-span-2">
      <DronePositionValue order={drone} live={live} />
    </LabelValue>
  );
}

export function DroneJourneyLink({ orderId }: { orderId: number }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/admin/drone-orders/${orderId}`}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {t("admin.orders.detail.droneInfo.openJourney")}
      <ExternalLink className="h-3 w-3" />
    </Link>
  );
}
