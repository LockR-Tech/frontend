import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Loader2, MapPin, Plane, RefreshCw, Route, TriangleAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { PageHeader } from "~/components/shared/page-header";
import {
  LabelValue,
  MetaBadge,
  deliveryStageMeta,
  orderPaymentStatusMeta,
  orderStatusMeta,
  paymentMethodMeta,
  type BadgeMeta,
} from "~/components/shared/reporting";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency } from "~/lib/report-format";
import {
  useGetDroneIncidentsQuery,
  type DroneParcelIncident,
} from "~/stores/apis/admin/droneIncidents";
import {
  useConfirmDroneParcelReturnMutation,
  useGetDroneOrderQuery,
  type DroneJourneyEvent,
  type DroneLockerPoint,
  type DroneOrderTracking,
} from "~/stores/apis/admin/droneOrders";
import { DroneJourneyTimeline } from "./DroneJourneyTimeline";
import { useGetAdminDroneOrderListQuery } from "./droneOrderListApi";
import { DroneTrackingMap } from "./DroneTrackingMap";
import { LiveCameraPanel } from "./LiveCameraPanel";
import { isPickupCodeEvent, pickupCodeEvent, sentAt, stageTimes } from "./journey";
import { PickupPanel, IncidentBlockBanner, CloseAsFailedForm, FailurePanel } from "./HomePickupPanels";
import { canCloseAsFailed } from "./homePickupRules";

/** Danh sách hỏi lại server sau mỗi khoảng này để chặng mới tự hiện, không cần tải lại trang. */
const LIST_POLL_MS = 5000;
const DETAIL_POLL_MS = 3000;

const FINISHED_STATUSES = new Set(["COMPLETED", "CANCELED", "EXPIRED"]);

type Scope = "active" | "finished" | "all";

const SCOPES: { value: Scope; labelKey: string }[] = [
  { value: "active", labelKey: "admin.droneOrders.scope.active" },
  { value: "finished", labelKey: "admin.droneOrders.scope.finished" },
  { value: "all", labelKey: "common.all" },
];

// Giá trị là khoá i18n; dịch lúc render.
const MISSION_STATUS_LABELS: Record<string, string> = {
  AWAITING_LOADING: "admin.droneOrders.missionStatus.awaitingLoading",
  READY_TO_LAUNCH: "admin.droneOrders.missionStatus.readyToLaunch",
  LAUNCHING: "admin.droneOrders.missionStatus.launching",
  DEPARTED: "admin.droneOrders.missionStatus.departed",
  EN_ROUTE: "admin.droneOrders.missionStatus.enRoute",
  APPROACHING: "admin.droneOrders.missionStatus.approaching",
  ARRIVED: "admin.droneOrders.missionStatus.arrived",
  DEPOSITED: "admin.droneOrders.missionStatus.deposited",
  CANCELED: "admin.droneOrders.missionStatus.canceled",
  FAILED: "admin.droneOrders.missionStatus.failed",
  DROP_REPORTED: "admin.droneOrders.missionStatus.dropReported",
};

/** Kiện bị báo rơi: máy trạng thái giao hàng dừng, việc tiếp theo nằm ở trang Sự cố rơi kiện. */
function isDropReported(order: DroneOrderTracking): boolean {
  return order.deliveryStage === "DROP_REPORTED" || order.missionStatus === "DROP_REPORTED";
}

function incidentLink(order: DroneOrderTracking): string {
  return `/admin/drone-incidents?order=${encodeURIComponent(order.orderCode)}`;
}

function getIncidentReadableStatus(incident: DroneParcelIncident): string {
  if (incident.status === "CLOSED") return "Đã đóng sự cố";
  if (incident.status === "RESOLVED") return "Đã giải quyết";
  if (incident.recoveryStatus === "SUBMITTED") return "Chờ Admin xác minh";
  if (incident.recoveryStatus === "SEARCHING") return "KTV đang tìm thực địa";
  if (incident.recoveryStatus === "VERIFIED") return "Đã xác minh thu hồi";
  if (incident.parcelStatus === "RETURNED_TO_HUB") return "Kiện đã về kho Hub";
  if (incident.recoveryStatus === "ACCEPTED") return "KTV đã nhận tìm kiếm";
  if (incident.recoveryStatus === "ASSIGNED") return "Đã phân công (Chờ KTV nhận)";
  if (incident.status === "RESOLUTION_PROPOSED" || incident.status === "AWAITING_CUSTOMER_RESPONSE")
    return "Chờ khách chọn bồi thường";
  if (incident.status === "RESOLUTION_IN_PROGRESS" || incident.compensationStatus === "PROCESSING")
    return "Đang chi trả bồi thường";
  if (incident.recoveryStatus === "AWAITING_ASSIGNMENT" || incident.recoveryStatus === "OPEN" || incident.status === "REPORTED")
    return "Chờ điều phối tìm kiếm";
  return incident.status;
}

function getIncidentStatusBadgeClass(incident: DroneParcelIncident): string {
  if (incident.status === "RESOLVED" || incident.status === "CLOSED" || incident.recoveryStatus === "VERIFIED" || incident.parcelStatus === "RETURNED_TO_HUB") {
    return "bg-emerald-100 text-emerald-800 border-emerald-300";
  }
  if (incident.recoveryStatus === "ASSIGNED" || incident.recoveryStatus === "SUBMITTED" || incident.status === "AWAITING_ADMIN_REVIEW" || incident.status === "AWAITING_CUSTOMER_RESPONSE") {
    return "bg-amber-100 text-amber-800 border-amber-300";
  }
  if (incident.recoveryStatus === "SEARCHING" || incident.recoveryStatus === "ACCEPTED") {
    return "bg-blue-100 text-blue-800 border-blue-300";
  }
  if (incident.status === "RESOLUTION_IN_PROGRESS" || incident.compensationStatus === "PROCESSING") {
    return "bg-purple-100 text-purple-800 border-purple-300";
  }
  return "bg-rose-100 text-rose-800 border-rose-300";
}

/** Chặng drone đã phóng — chỉ ở các chặng này mới báo được chuyến bay thất bại. */
const IN_FLIGHT_STAGES = new Set(["LAUNCHING", "DEPARTED", "EN_ROUTE", "APPROACHING", "ARRIVED"]);

// Khớp DroneOrderMaintenanceService.cancelReasonLabel ở backend. Giá trị là khoá i18n.
const CANCEL_REASON_LABELS: Record<number, string> = {
  1: "admin.droneOrders.cancelReason.badWeather",
  2: "admin.droneOrders.cancelReason.droneFault",
  3: "admin.droneOrders.cancelReason.landingPadUnavailable",
  4: "admin.droneOrders.cancelReason.operational",
  5: "admin.droneOrders.cancelReason.other",
};

function isFinished(order: DroneOrderTracking): boolean {
  return FINISHED_STATUSES.has(order.status);
}

/**
 * Đơn đã kết thúc thì trạng thái đơn quyết định nhãn: backend giữ
 * `deliveryStage = READY_FOR_PICKUP` sau khi khách lấy hàng.
 */
/** Đơn đã đóng nhưng kiện còn chờ trả cho người gửi vẫn là việc đang phải làm. */
function needsAction(order: DroneOrderTracking): boolean {
  return !isFinished(order) || order.parcelReturnPending === true;
}

// Giá trị là khoá i18n; dịch lúc render.
const PARCEL_CATEGORY_LABELS: Record<string, string> = {
  DOCUMENT: "admin.droneOrders.parcelCategory.document",
  FOOD: "admin.droneOrders.parcelCategory.food",
  CLOTHING: "admin.droneOrders.parcelCategory.clothing",
  ELECTRONICS: "admin.droneOrders.parcelCategory.electronics",
  COSMETICS: "admin.droneOrders.parcelCategory.cosmetics",
  OTHER: "admin.droneOrders.parcelCategory.other",
};

function parcelSize(order: DroneOrderTracking): string | null {
  const { parcelLengthCm: l, parcelWidthCm: w, parcelHeightCm: h } = order;
  return l && w && h ? `${l} × ${w} × ${h} cm` : null;
}

function routeDistance(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined) return null;
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

function isFlightFailure(order: DroneOrderTracking): boolean {
  return order.status === "CANCELED" && order.deliveryStage === "FAILED";
}

function stageMeta(order: DroneOrderTracking): BadgeMeta {
  // Chuyến bay thất bại đóng đơn là CANCELED, nhưng không phải "đã huỷ".
  if (isFlightFailure(order)) return deliveryStageMeta("FAILED");
  return isFinished(order)
    ? orderStatusMeta(order.status)
    : deliveryStageMeta(order.deliveryStage);
}

function lockerName(
  point: DroneLockerPoint | null,
  fallbackId: number | null,
  t: TFunction,
): string {
  if (point?.name && point.code) return `${point.name} (${point.code})`;
  if (point?.name || point?.code) return (point.name ?? point.code) as string;
  return fallbackId
    ? t("admin.droneOrders.locker.nameNotFound")
    : t("admin.droneOrders.undetermined");
}

function grams(value: number | null): string | null {
  if (value === null || value === undefined) return null;
  return `${value.toLocaleString("vi-VN")} g`;
}

function checklist(value: boolean | null, t: TFunction): string {
  if (value === null || value === undefined) return t("admin.droneOrders.checklist.notChecked");
  return value ? t("admin.droneOrders.checklist.passed") : t("admin.droneOrders.checklist.failed");
}

function journeyTitle(event: DroneJourneyEvent, t: TFunction): string {
  // Xác nhận nạp hàng được ghi là ACCEPTED → ACCEPTED.
  if (event.fromStage === "ACCEPTED" && event.toStage === "ACCEPTED") {
    return t("admin.droneOrders.journey.loaded");
  }
  if (isPickupCodeEvent(event)) return t("admin.droneOrders.journey.pickupCodeSent");
  if (!event.fromStage && event.toStage === "AWAITING_DISPATCH") {
    return t("admin.droneOrders.journey.created");
  }
  if (FINISHED_STATUSES.has(event.toStage)) return orderStatusMeta(event.toStage).label;
  return deliveryStageMeta(event.toStage).label;
}

export default function DroneOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [scope, setScope] = useState<Scope>("active");
  // "Đang thực hiện" chỉ xin nhiệm vụ đang chạy; hai nhóm còn lại cần cả lịch sử
  const { data, isLoading, isFetching, isError, refetch } = useGetAdminDroneOrderListQuery(
    { includeFinished: scope !== "active" },
    { pollingInterval: LIST_POLL_MS },
  );

  const { subscribe } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    if (!subscribe) return;
    const subOrders = subscribe<any>("/topic/orders", () => refetch());
    const subNotif = subscribe<any>("/topic/notifications", (msg) => {
      if (
        msg?.type?.includes?.("DRONE") ||
        msg?.type?.includes?.("DELIVERY") ||
        msg?.type?.includes?.("ORDER")
      ) {
        refetch();
      }
    });
    return () => {
      subOrders?.unsubscribe();
      subNotif?.unsubscribe();
    };
  }, [subscribe, refetch]);

  useEffect(() => {
    const requestedId = Number(searchParams.get("orderId"));
    if (Number.isSafeInteger(requestedId) && requestedId > 0) {
      navigate(`/admin/drone-orders/${requestedId}`, { replace: true });
    }
  }, [navigate, searchParams]);

  const orders = useMemo(() => data?.data ?? [], [data]);
  const counts = useMemo(
    () => ({
      active: orders.filter(needsAction).length,
      inFlight: orders.filter(
        (o) =>
          !isFinished(o) &&
          ["LAUNCHING", "DEPARTED", "EN_ROUTE", "APPROACHING", "ARRIVED"].includes(
            o.deliveryStage ?? "",
          ),
      ).length,
      waiting: orders.filter(
        (o) => !isFinished(o) && o.deliveryStage === "AWAITING_DISPATCH",
      ).length,
      // Nhóm "đang thực hiện" không tải đơn đã kết thúc nên chưa biết con số này
      finished: scope === "active" ? null : orders.filter((o) => !needsAction(o)).length,
    }),
    [orders, scope],
  );

  // Backend đã sắp theo lần cập nhật gần nhất: đơn vừa đổi chặng nằm trên cùng.
  const visible = orders.filter((o) =>
    scope === "all" ? true : scope === "active" ? needsAction(o) : !needsAction(o),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.droneOrders.title")}
        description={t("admin.droneOrders.description")}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={t("admin.droneOrders.scope.active")} value={counts.active} color="text-primary" />
          <StatCard label={t("admin.droneOrders.stats.waiting")} value={counts.waiting} color="text-amber-700" />
          <StatCard label={t("admin.droneOrders.stats.inFlight")} value={counts.inFlight} color="text-sky-700" />
          <StatCard
            label={t("admin.droneOrders.scope.finished")}
            value={counts.finished ?? "—"}
            color="text-muted-foreground"
            hint={counts.finished == null ? t("admin.droneOrders.stats.finishedHint") : undefined}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("button.refresh")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCOPES.map((s) => {
          const active = scope === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setScope(s.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                  : "border-border/50 bg-background text-muted-foreground hover:border-border/70"
              }`}
            >
              {t(s.labelKey)}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : isError && orders.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("admin.droneOrders.list.loadFailed")}
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t("common.retry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <Plane className="mx-auto mb-3 h-8 w-8 opacity-40" />
            {orders.length === 0
              ? t("admin.droneOrders.list.emptyAll")
              : t("admin.droneOrders.list.emptyScope")}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("admin.droneOrders.columns.orderCode")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.droneOrders.columns.route")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.droneOrders.columns.stage")}</th>
                  <th className="px-4 py-3 font-medium">Drone</th>
                  <th className="px-4 py-3 font-medium">{t("admin.droneOrders.columns.dispatcher")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.payment")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.droneOrders.columns.createdAt")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.droneOrders.columns.updatedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr
                    key={order.orderId}
                    onClick={() => navigate(`/admin/drone-orders/${order.orderId}`)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {order.orderCode}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {lockerName(order.sourceLocker, order.sourceLockerId, t)}
                      </span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      <span className="font-medium">
                        {lockerName(order.destinationLocker, order.destinationLockerId, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <MetaBadge meta={stageMeta(order)} />
                      {isDropReported(order) && (
                        <Link
                          to={incidentLink(order)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 block text-[11px] font-medium text-red-700 hover:underline"
                        >
                          {t("admin.droneOrders.list.handleDropIncident")}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">{order.droneCode ?? t("common.unassigned")}</td>
                    <td className="px-4 py-3">
                      {order.assignedByName ??
                        (order.assignedByUserId
                          ? t("admin.droneOrders.list.accepted")
                          : t("admin.droneOrders.list.notAccepted"))}
                    </td>
                    <td className="px-4 py-3">
                      <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} hideIcon />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatDateTime(order.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: number | string;
  color: string;
  hint?: string;
}) {
  return (
    <Card className="border-0 shadow-sm" title={hint}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function DroneOrderDetailContent({ orderId }: { orderId: number }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetDroneOrderQuery(orderId, {
    pollingInterval: DETAIL_POLL_MS,
  });
  const { data: incidentResp } = useGetDroneIncidentsQuery(undefined, {
    pollingInterval: DETAIL_POLL_MS,
  });
  const order = data?.data;
  const incidents = incidentResp?.data ?? [];

  const latestIncident = useMemo(() => {
    if (!order) return null;
    const matches = incidents.filter(
      (inc) =>
        inc.orderId === order.orderId ||
        (order.orderCode && inc.orderCode === order.orderCode),
    );
    if (matches.length === 0) return null;
    return [...matches].sort((a, b) => b.id - a.id)[0];
  }, [incidents, order]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
            <Route className="h-4 w-4" />
            <h2 className="text-lg font-semibold">
              {t("admin.droneOrders.detail.title", { code: order?.orderCode ?? "" })}
            </h2>
            {order && <MetaBadge meta={stageMeta(order)} />}
      </div>

        {!order ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {isLoading ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            ) : isError ? (
              t("admin.droneOrders.detail.loadFailed")
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Banner hiển thị trạng thái sự cố rơi gần nhất */}
            {latestIncident ? (
              <div className="rounded-xl border border-red-300/80 bg-gradient-to-r from-red-50 via-rose-50/70 to-amber-50/40 p-4 text-sm text-red-950 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 border border-red-200 shadow-xs">
                      <TriangleAlert className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-red-950">Sự cố rơi kiện:</span>
                        <span className="font-mono font-semibold text-red-800">{latestIncident.incidentCode}</span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getIncidentStatusBadgeClass(
                            latestIncident,
                          )}`}
                        >
                          {getIncidentReadableStatus(latestIncident)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">
                        {latestIncident.reason || "Kiện hàng được ghi nhận rơi trong quá trình bay vận chuyển."}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                        {latestIncident.recoveryTechnicianName && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-muted-foreground">KTV tìm kiếm:</span>
                            <span className="font-medium text-slate-900">{latestIncident.recoveryTechnicianName}</span>
                            {latestIncident.recoveryTechnicianPhone && (
                              <span className="text-muted-foreground font-mono">({latestIncident.recoveryTechnicianPhone})</span>
                            )}
                          </span>
                        )}
                        {latestIncident.dropLatitude != null && latestIncident.dropLongitude != null && (
                          <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                            <MapPin className="h-3 w-3 text-red-500" />
                            {latestIncident.dropLatitude.toFixed(6)}, {latestIncident.dropLongitude.toFixed(6)}
                          </span>
                        )}
                        {latestIncident.updatedAt && (
                          <span className="text-muted-foreground">
                            Cập nhật: {formatDateTime(latestIncident.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/admin/drone-incidents/${latestIncident.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 transition-colors shrink-0"
                  >
                    <span>Xem chi tiết sự cố</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : isDropReported(order) ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700">
                <span className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 shrink-0" />
                  {t("admin.droneOrders.detail.dropReportedBanner")}
                </span>
                <Link
                  to={incidentLink(order)}
                  className="whitespace-nowrap font-medium underline-offset-2 hover:underline"
                >
                  {t("admin.droneOrders.detail.openIncident")}
                </Link>
              </div>
            ) : null}

            <IncidentBlockBanner order={order} />
            <FailurePanel order={order} />
            <PickupPanel key={`pickup-${order.orderId}`} order={order} />
            <p className="text-xs text-muted-foreground">
              {t("admin.droneOrders.detail.autoRefresh", { time: formatDateTime(order.updatedAt) })}
            </p>

            {order.status === "CANCELED" && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700">
                {isFlightFailure(order)
                  ? t("admin.droneOrders.detail.flightFailedBanner")
                  : t("admin.droneOrders.detail.canceled")}
                {order.cancelReason
                  ? ` · ${
                      CANCEL_REASON_LABELS[order.cancelReason]
                        ? t(CANCEL_REASON_LABELS[order.cancelReason])
                        : t("admin.droneOrders.cancelReason.unknown", { code: order.cancelReason })
                    }`
                  : ""}
                {order.cancelNote ? ` · ${order.cancelNote}` : ""}
                {order.paymentStatus === "REFUND_PENDING"
                  ? ` · ${t("admin.droneOrders.detail.refundPending")}`
                  : order.paymentStatus === "REFUNDED"
                    ? ` · ${t("admin.droneOrders.detail.refunded")}`
                    : order.paymentStatus === "PAID"
                      ? ` · ${t("admin.droneOrders.detail.refundMissing")}`
                      : ""}
              </div>
            )}

            <Section title={t("admin.droneOrders.section.map")}>
              <DroneTrackingMap order={order} />
            </Section>

            {!isFinished(order) && IN_FLIGHT_STAGES.has(order.deliveryStage ?? "") && (
              <LiveCameraPanel order={order} />
            )}

            {(order.parcelReturnPending || order.parcelReturnedAt) && (
              <ParcelReturnPanel order={order} />
            )}

            {canCloseAsFailed(order) && <CloseAsFailedForm key={`${order.orderId}-${order.block?.reason ?? "manual"}`} order={order} />}

            <Section title={t("admin.droneOrders.section.route")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LockerBlock
                  label={t("admin.droneOrders.lockerBlock.source")}
                  point={order.sourceLocker}
                  fallbackId={order.sourceLockerId}
                  extras={[
                    order.sourceBoxNumber !== null && order.sourceBoxNumber !== undefined
                      ? t("admin.droneOrders.lockerBlock.parcelInDroneBox", { number: order.sourceBoxNumber })
                      : null,
                  ]}
                  times={[
                    {
                      label: t("admin.droneOrders.lockerBlock.sentAt"),
                      at: sentAt(order),
                      empty: t("admin.droneOrders.lockerBlock.notSent"),
                    },
                  ]}
                />
                <LockerBlock
                  label={t("admin.droneOrders.lockerBlock.destination")}
                  point={order.destinationLocker}
                  fallbackId={order.destinationLockerId}
                  extras={[
                    order.reservedBoxNumber !== null
                      ? t("admin.droneOrders.lockerBlock.reservedBox", { number: order.reservedBoxNumber })
                      : null,
                  ]}
                  times={[
                    {
                      label: t("admin.droneOrders.lockerBlock.arrivedAt"),
                      at: stageTimes(order).get("READY_FOR_PICKUP") ?? null,
                      empty: t("admin.droneOrders.lockerBlock.notArrived"),
                    },
                    {
                      label: t("admin.droneOrders.lockerBlock.codeSentAt"),
                      at: pickupCodeEvent(order)?.occurredAt ?? null,
                      empty: t("admin.droneOrders.lockerBlock.notSent"),
                    },
                    {
                      label: t("admin.droneOrders.lockerBlock.pickedUpAt"),
                      at: order.completedAt,
                      empty: t("admin.droneOrders.lockerBlock.notPickedUp"),
                    },
                  ]}
                />
              </div>
            </Section>

            <Section title={t("admin.droneOrders.section.progress")}>
              <DroneJourneyTimeline order={order} />
            </Section>

            <Section title={t("common.order")}>
              <Grid>
                <LabelValue label={t("admin.droneOrders.columns.orderCode")} mono>{order.orderCode}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.orderStatus")}>
                  <MetaBadge meta={orderStatusMeta(order.status)} />
                </LabelValue>
                <LabelValue label={t("common.payment")}>
                  <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} />
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.droneFee")}>
                  {order.totalPrice !== null ? formatCurrency(order.totalPrice) : null}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.paymentMethod")}>
                  {order.paymentMethod ? (
                    <MetaBadge meta={paymentMethodMeta(order.paymentMethod)} />
                  ) : null}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.paymentReference")} mono>{order.paymentReference}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.transactionId")} mono>{order.paymentTransactionId}</LabelValue>
                <Time label={t("admin.droneOrders.fields.paidAt")} value={order.paidAt} />
                <LabelValue label={t("admin.droneOrders.fields.declaredWeight")}>{grams(order.parcelWeightGrams)}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.parcelCategory")}>
                  {order.parcelCategory
                    ? (PARCEL_CATEGORY_LABELS[order.parcelCategory]
                        ? t(PARCEL_CATEGORY_LABELS[order.parcelCategory])
                        : order.parcelCategory)
                    : null}
                  {order.fragile ? ` · ${t("admin.droneOrders.fields.fragile")}` : ""}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.parcelSize")}>{parcelSize(order)}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.declaredValue")}>
                  {order.declaredValue != null ? formatCurrency(order.declaredValue) : null}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.droppedAt")}>
                  {order.parcelDroppedAt
                    ? formatDateTime(order.parcelDroppedAt)
                    : order.status === "AWAITING_DISPATCH" && order.deliveryStage === "AWAITING_DISPATCH"
                      ? t("admin.droneOrders.fields.notDropped")
                      : null}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.flightDistance")}>{routeDistance(order.routeDistanceMeters)}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.flightMode")}>
                  {order.fulfillmentMode === "DEMO"
                    ? t("admin.droneOrders.fields.modeDemo")
                    : order.fulfillmentMode === "STANDARD"
                      ? t("admin.droneOrders.fields.modeStandard")
                      : order.fulfillmentMode}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.parcelDescription")} className="col-span-2 sm:col-span-3">
                  {order.description}
                </LabelValue>
              </Grid>
            </Section>

            <Section title={t("admin.droneOrders.section.people")}>
              <Grid>
                <LabelValue label={t("admin.droneOrders.fields.sender")}>{order.sender?.name ?? order.customerName}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.senderPhone")} mono>{order.sender?.phone ?? order.customerPhone}</LabelValue>
                <LabelValue label={t("common.email")}>{order.sender?.email}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.receiver")}>{order.receiverName}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.receiverPhone")} mono>{order.receiverPhone}</LabelValue>
                <LabelValue label={t("common.email")}>{order.receiverEmail}</LabelValue>
                <LabelValue label={t("admin.droneOrders.columns.dispatcher")}>
                  {order.assignedByName ??
                    (order.assignedByUserId
                      ? t("admin.droneOrders.list.accepted")
                      : t("admin.droneOrders.list.notAccepted"))}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.loader")}>
                  {order.loadedByName ??
                    (order.loadedByUserId
                      ? t("admin.droneOrders.fields.loaded")
                      : t("admin.droneOrders.fields.notLoaded"))}
                </LabelValue>
              </Grid>
            </Section>

            <Section title={t("admin.droneOrders.section.mission")}>
              <Grid>
                <LabelValue label={t("admin.droneOrders.fields.missionId")} mono>
                  {order.missionId !== null
                    ? `#${order.missionId}`
                    : t("admin.droneOrders.fields.notInitialized")}
                </LabelValue>
                <LabelValue label="Drone">{order.droneCode ?? t("common.unassigned")}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.missionStatus")}>
                  {order.missionStatus
                    ? (MISSION_STATUS_LABELS[order.missionStatus]
                        ? t(MISSION_STATUS_LABELS[order.missionStatus])
                        : order.missionStatus)
                    : t("admin.droneOrders.fields.notInitialized")}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.currentLatitude")} mono>
                  {order.currentLatitude?.toFixed(6)}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.currentLongitude")} mono>
                  {order.currentLongitude?.toFixed(6)}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.actualWeight")}>{grams(order.payloadWeightGrams)}</LabelValue>
                {order.weightSurcharge ? (
                  <LabelValue label={t("admin.droneOrders.fields.weightSurcharge")}>
                    {formatCurrency(order.weightSurcharge)}
                    {order.amountDue
                      ? ` · ${t("admin.droneOrders.fields.surchargeUnpaid")}`
                      : ` · ${t("admin.droneOrders.fields.surchargePaid")}`}
                  </LabelValue>
                ) : null}
                <LabelValue label={t("admin.droneOrders.fields.sealCode")} mono>{order.sealCode}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.parcelMatched")}>{checklist(order.parcelMatched, t)}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.payloadSecured")}>{checklist(order.payloadSecured, t)}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.compartmentLocked")}>
                  {checklist(order.compartmentLocked, t)}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.loadingNote")}>{order.loadingNote}</LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.batteryAtLaunch")}>
                  {order.batteryPercentAtLaunch != null ? `${order.batteryPercentAtLaunch} %` : null}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.landedAt")}>
                  {order.landedAt ? formatDateTime(order.landedAt) : null}
                </LabelValue>
                <LabelValue label={t("admin.droneOrders.fields.depositedAt")}>
                  {order.depositedAt ? formatDateTime(order.depositedAt) : null}
                  {order.depositedAt
                    ? ` · ${order.depositedByName ?? t("admin.droneOrders.fields.autoConfirmed")}`
                    : ""}
                </LabelValue>
                {order.missionEndedAt ? (
                  <LabelValue label={t("admin.droneOrders.fields.missionEndedAt")}>
                    {formatDateTime(order.missionEndedAt)}
                    {order.failedStage
                      ? ` · ${t("admin.droneOrders.fields.failedAtStage", {
                          stage: deliveryStageMeta(order.failedStage).label,
                        })}`
                      : ""}
                  </LabelValue>
                ) : null}
              </Grid>
            </Section>

            <Section title={t("admin.droneOrders.section.journeyLog")}>
              {order.journeyEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("admin.droneOrders.log.empty")}</p>
              ) : (
                <ol className="space-y-3">
                  {order.journeyEvents.map((event, index) => (
                    <li
                      key={event.id}
                      className="flex gap-3 border-l-2 border-border pl-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {journeyTitle(event, t)}
                          {index === 0 && (
                            <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              {t("admin.droneOrders.log.latest")}
                            </span>
                          )}
                        </p>
                        {event.note && (
                          <p className="text-xs text-muted-foreground">{event.note}</p>
                        )}
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {formatDateTime(event.occurredAt)} ·{" "}
                          {event.actorName ??
                            (event.actorUserId ? t("admin.droneOrders.log.staff") : t("common.system"))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        )}
    </div>
  );
}

/** Kiện của đơn không giao được: đang ở đâu, và admin xác nhận đã trả cho người gửi. */
function ParcelReturnPanel({ order }: { order: DroneOrderTracking }) {
  const { t } = useTranslation();
  const [confirmReturn, { isLoading }] = useConfirmDroneParcelReturnMutation();
  const [note, setNote] = useState("");

  if (order.parcelReturnedAt) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700">
        {t("admin.droneOrders.parcelReturn.returnedAt", { time: formatDateTime(order.parcelReturnedAt) })}
        {order.parcelReturnNote ? ` · ${order.parcelReturnNote}` : ""}
      </div>
    );
  }

  const submit = async () => {
    if (!confirm(t("admin.droneOrders.parcelReturn.confirm", { code: order.orderCode }))) return;
    try {
      await confirmReturn({ orderId: order.orderId, note: note.trim() || undefined }).unwrap();
      toast.success(t("admin.droneOrders.parcelReturn.success", { code: order.orderCode }));
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message;
      toast.error(t("admin.droneOrders.parcelReturn.failed"), {
        description: message ?? t("admin.droneOrders.parcelReturn.failedHint"),
      });
    }
  };

  return (
    <Section title={t("admin.droneOrders.section.parcelReturn")}>
      <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <p className="text-sm text-amber-800">
          {order.parcelHeldAt === "SOURCE_BOX"
            ? order.sourceBoxNumber
              ? t("admin.droneOrders.parcelReturn.inSourceBoxNumber", { number: order.sourceBoxNumber })
              : t("admin.droneOrders.parcelReturn.inSourceBox")
            : t("admin.droneOrders.parcelReturn.heldByFlightTeam")}{" "}
          {t("admin.droneOrders.parcelReturn.sender", { name: order.customerName ?? "—" })}
          {order.customerPhone ? ` · ${order.customerPhone}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label={t("admin.droneOrders.parcelReturn.noteLabel")}
            className="h-9 min-w-48 flex-1 rounded-md border bg-background px-2 text-sm"
            maxLength={500}
            placeholder={t("admin.droneOrders.notePlaceholderOptional")}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button size="sm" disabled={isLoading} onClick={submit}>
            {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {t("admin.droneOrders.parcelReturn.confirmButton")}
          </Button>
        </div>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>;
}

function Time({ label, value }: { label: string; value: string | null }) {
  return (
    <LabelValue label={label} mono>
      {value ? formatDateTime(value) : null}
    </LabelValue>
  );
}

function LockerBlock({
  label,
  point,
  fallbackId,
  extras = [],
  times = [],
}: {
  label: string;
  point: DroneLockerPoint | null;
  fallbackId: number | null;
  extras?: (string | null)[];
  times?: { label: string; at: string | Date | null; empty: string }[];
}) {
  const { t } = useTranslation();
  // Có toạ độ thì mở chỉ đường theo toạ độ; không thì tìm theo địa chỉ.
  const mapUrl =
    point?.latitude != null && point?.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`
      : point?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.address)}`
        : null;

  return (
    <div className="rounded-lg border p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{lockerName(point, fallbackId, t)}</p>
      {point?.address && <p className="text-xs text-muted-foreground">{point.address}</p>}
      {extras
        .filter((extra): extra is string => Boolean(extra))
        .map((extra) => (
          <p key={extra} className="mt-1 text-xs font-medium text-sky-700">
            {extra}
          </p>
        ))}
      {times.map((time) => (
        <p key={time.label} className="mt-1 text-xs">
          <span className="text-muted-foreground">{time.label}: </span>
          <span className="font-mono font-semibold">
            {time.at ? formatDateTime(time.at) : time.empty}
          </span>
        </p>
      ))}
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <MapPin className="h-3.5 w-3.5" />
          {t("admin.droneOrders.lockerBlock.viewOnMap")}
        </a>
      )}
    </div>
  );
}
