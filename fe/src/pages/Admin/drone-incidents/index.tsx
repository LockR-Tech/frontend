import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Eye,
  Info as InfoIcon,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  PackageSearch,
  Phone,
  Plane,
  Radio,
  RefreshCw,
  Scale,
  ShieldCheck,
  Truck,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency } from "~/lib/report-format";
import {
  useAssignDroneRecoveryMutation,
  useApproveDroneIncidentCompensationMutation,
  useCreateDroneIncidentProposalMutation,
  useCompleteDroneIncidentRedeliveryMutation,
  useGetDroneIncidentQuery,
  useGetDroneIncidentsQuery,
  useVerifyDroneRecoveryMutation,
  type DroneParcelIncident,
} from "~/stores/apis/admin/droneIncidents";
import { useGetDroneOrderQuery } from "~/stores/apis/admin/droneOrders";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import {
  useGetTechnicianPresencesQuery,
  type TechnicianPresenceResponse,
} from "~/stores/apis/admin/lockerOps";
import { useConfirmDroneParcelHubHandoverMutation } from "./hubHandoverApi";
import { distanceKm, kmLabel } from "../drone-orders/journey";
import { RecoveryDispatchMapModal } from "./RecoveryDispatchMapModal";

// Giá trị là khoá i18n; dịch lúc render.
export const statusLabel: Record<string, string> = {
  REPORTED: "admin.droneIncidents.status.reported",
  EVIDENCE_PENDING: "admin.droneIncidents.status.evidencePending",
  INVESTIGATING: "admin.droneIncidents.status.investigating",
  RECOVERY_IN_PROGRESS: "admin.droneIncidents.status.recoveryInProgress",
  AWAITING_ADMIN_REVIEW: "admin.droneIncidents.status.awaitingAdminReview",
  RESOLUTION_PROPOSED: "admin.droneIncidents.status.resolutionProposed",
  AWAITING_CUSTOMER_RESPONSE:
    "admin.droneIncidents.status.awaitingCustomerResponse",
  RESOLUTION_IN_PROGRESS: "admin.droneIncidents.status.resolutionInProgress",
  DISPUTED: "admin.droneIncidents.status.disputed",
  RESOLVED: "admin.droneIncidents.status.resolved",
  CLOSED: "admin.droneIncidents.status.closed",
  MANUAL_INTERVENTION_REQUIRED:
    "admin.droneIncidents.status.manualInterventionRequired",
};

export function statusText(value: string, t: TFunction): string {
  const key = statusLabel[value];
  return key ? t(key) : value;
}

// Nhóm lọc theo trạng thái sự cố (DroneIncidentStates.INCIDENT ở backend)
type IncidentFilter = {
  value: string;
  label: string;
  statuses: string[];
};

const INCIDENT_FILTERS: IncidentFilter[] = [
  { value: "ALL", label: "Tất cả", statuses: [] },
  {
    value: "NEEDS_ATTENTION",
    label: "Cần xử lý",
    statuses: [
      "REPORTED",
      "EVIDENCE_PENDING",
      "INVESTIGATING",
      "DISPUTED",
      "MANUAL_INTERVENTION_REQUIRED",
    ],
  },
  {
    value: "RECOVERING",
    label: "Đang thu hồi",
    statuses: ["RECOVERY_IN_PROGRESS"],
  },
  {
    value: "ADMIN_REVIEW",
    label: "Chờ Admin xác minh",
    statuses: ["AWAITING_ADMIN_REVIEW"],
  },
  {
    value: "CUSTOMER_RESPONSE",
    label: "Chờ khách phản hồi",
    statuses: ["AWAITING_CUSTOMER_RESPONSE"],
  },
  {
    value: "RESOLVING",
    label: "Đang xử lý phương án",
    statuses: ["RESOLUTION_PROPOSED", "RESOLUTION_IN_PROGRESS"],
  },
  { value: "DONE", label: "Đã hoàn tất", statuses: ["RESOLVED", "CLOSED"] },
];

const KNOWN_INCIDENT_STATUSES = new Set(
  INCIDENT_FILTERS.flatMap((filter) => filter.statuses),
);

// Giá trị là khoá i18n; dịch lúc render.
export const RESOLUTION_LABELS: Record<string, string> = {
  FREE_REDELIVERY: "admin.droneIncidents.resolution.freeRedelivery",
  REDELIVERY_PARTIAL_COMPENSATION:
    "admin.droneIncidents.resolution.redeliveryPartialCompensation",
  COMPENSATION_ONLY: "admin.droneIncidents.resolution.compensationOnly",
  MANUAL_RESOLUTION: "admin.droneIncidents.resolution.manualResolution",
};

// Mã lỗi DroneParcelIncidentService → khoá i18n của thông báo
export const INCIDENT_ERRORS: Record<string, string> = {
  RESOLUTION_CONTENT_INVALID:
    "admin.droneIncidents.errors.resolutionContentInvalid",
  RESOLUTION_TYPE_INVALID: "admin.droneIncidents.errors.resolutionTypeInvalid",
  PARCEL_NOT_AT_HUB: "admin.droneIncidents.errors.parcelNotAtHub",
  FREE_REDELIVERY_DISABLED:
    "admin.droneIncidents.errors.freeRedeliveryDisabled",
  INCIDENT_POLICY_DISABLED:
    "admin.droneIncidents.errors.incidentPolicyDisabled",
  COMPENSATION_OVERRIDE_REASON_REQUIRED:
    "admin.droneIncidents.errors.compensationOverrideReasonRequired",
  RECOVERY_NOT_VERIFIED: "admin.droneIncidents.errors.recoveryNotVerified",
  PARCEL_NOT_FOUND: "admin.droneIncidents.errors.parcelNotFound",
  RECOVERY_FORBIDDEN: "admin.droneIncidents.errors.recoveryForbidden",
};

export function formatCompensationRate(rate?: number | null): string {
  if (rate == null) return "60%";
  const pct = rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(0)}%`;
}

/** Backend (bản mới) trả thêm mức bồi thường đề xuất theo chính sách; bản cũ tính dự phòng. */
export function suggestedCompensationOf(
  incident: DroneParcelIncident,
): number | null {
  const value = (
    incident as DroneParcelIncident & {
      suggestedCompensation?: number | null;
    }
  ).suggestedCompensation;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const base = incident.declaredValue ?? 0;
  if (base <= 0) return 0;
  const rawRate = incident.compensationRate ?? 60;
  const ratePct = rawRate <= 1 ? rawRate * 100 : rawRate;
  const calc = Math.round((base * ratePct) / 100);
  const cap = incident.compensationCap ?? 0;
  return cap > 0 ? Math.min(calc, cap) : calc;
}

export const REDELIVERY_TYPES = new Set([
  "FREE_REDELIVERY",
  "REDELIVERY_PARTIAL_COMPENSATION",
]);

/** Kiểm tra phương án giống DroneParcelIncidentService.propose để báo lỗi trước khi gửi. */
export function validateProposal(
  t: TFunction,
  incident: DroneParcelIncident,
  resolutionType: string,
  amountText: string,
  overrideReason: string,
): string | null {
  if (!["VERIFIED", "CLOSED"].includes(incident.recoveryStatus)) {
    return t("admin.droneIncidents.validation.recoveryNotVerified");
  }
  const amount = amountText.trim() === "" ? Number.NaN : Number(amountText);
  if (!Number.isFinite(amount) || amount < 0) {
    return t("admin.droneIncidents.validation.invalidAmount");
  }
  if (
    REDELIVERY_TYPES.has(resolutionType) &&
    incident.parcelStatus !== "RETURNED_TO_HUB"
  ) {
    return t("admin.droneIncidents.errors.parcelNotAtHub");
  }
  if (resolutionType === "FREE_REDELIVERY" && amount !== 0) {
    return t("admin.droneIncidents.validation.freeRedeliveryNonZero");
  }
  if (resolutionType === "REDELIVERY_PARTIAL_COMPENSATION" && amount <= 0) {
    return t("admin.droneIncidents.validation.partialNeedsAmount");
  }
  if (resolutionType === "COMPENSATION_ONLY" && amount <= 0) {
    return t("admin.droneIncidents.validation.compensationNeedsAmount");
  }
  if (resolutionType === "MANUAL_RESOLUTION" && !overrideReason.trim()) {
    return "Thỏa thuận riêng yêu cầu nhập ghi chú chi tiết phương án đã trao đổi với khách.";
  }
  const suggested = suggestedCompensationOf(incident);
  if (suggested != null && amount > suggested && !overrideReason.trim()) {
    return t("admin.droneIncidents.validation.overSuggested", {
      amount: formatCurrency(suggested),
    });
  }
  return null;
}

export function statusTone(status: string) {
  if (["CLOSED", "RESOLVED", "VERIFIED", "RECOVERED"].includes(status))
    return "bg-emerald-100 text-emerald-800";
  if (["DISPUTED", "MANUAL_INTERVENTION_REQUIRED", "LOST"].includes(status))
    return "bg-red-100 text-red-800";
  if (status.startsWith("AWAITING")) return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-800";
}

export default function DroneIncidentsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch } = useGetDroneIncidentsQuery(
    undefined,
    { pollingInterval: 10_000 },
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  // Liên kết từ trang Hành trình drone: ?order=<mã đơn>
  const [searchParams, setSearchParams] = useSearchParams();
  const orderFilter = searchParams.get("order")?.trim() || null;
  const apiIncidents = data?.data ?? [];
  // Chỉ dữ liệu thật: trước đây trộn 2 sự cố mẫu (INC-2026-DROP-001/002) vào danh sách, admin thao tác được
  // lên sự cố không tồn tại (test 2026-10-29).
  const incidents = useMemo(() => {
    return [...apiIncidents].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [apiIncidents]);
  const byOrder = orderFilter
    ? incidents.filter(
        (item) =>
          item.orderCode === orderFilter ||
          String(item.orderId) === orderFilter,
      )
    : incidents;
  const belongsToFilter = (status: string, filterValue: string) => {
    const group = INCIDENT_FILTERS.find((item) => item.value === filterValue);
    if (!group || filterValue === "ALL") return true;
    if (filterValue === "NEEDS_ATTENTION") {
      return (
        group.statuses.includes(status) || !KNOWN_INCIDENT_STATUSES.has(status)
      );
    }
    return group.statuses.includes(status);
  };
  const visible = byOrder.filter((item) =>
    belongsToFilter(item.status, filter),
  );
  const countForFilter = (filterValue: string) => {
    const group = INCIDENT_FILTERS.find((item) => item.value === filterValue);
    if (!group || filterValue === "ALL") return byOrder.length;
    return byOrder.filter((item) => {
      if (filterValue === "NEEDS_ATTENTION") {
        return (
          group.statuses.includes(item.status) ||
          !KNOWN_INCIDENT_STATUSES.has(item.status)
        );
      }
      return group.statuses.includes(item.status);
    }).length;
  };
  // Backend có thể bổ sung trạng thái mới mà web chưa phát hành; vẫn cho Admin
  // lọc được thay vì làm trạng thái đó biến mất khỏi danh sách chọn.
  const counts = {
    open: incidents.filter(
      (item) => !["CLOSED", "RESOLVED"].includes(item.status),
    ).length,
    recovering: incidents.filter((item) =>
      ["ASSIGNED", "ACCEPTED", "SEARCHING"].includes(item.recoveryStatus),
    ).length,
    review: incidents.filter((item) => item.status === "AWAITING_ADMIN_REVIEW")
      .length,
    closed: incidents.filter((item) =>
      ["CLOSED", "RESOLVED"].includes(item.status),
    ).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.droneIncidents.title")}
        description={t("admin.droneIncidents.description")}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t("admin.droneIncidents.stats.open")}
          value={counts.open}
        />
        <Stat
          label={t("admin.droneIncidents.stats.recovering")}
          value={counts.recovering}
        />
        <Stat
          label={t("admin.droneIncidents.stats.review")}
          value={counts.review}
        />
        <Stat
          label={t("admin.droneIncidents.stats.closed")}
          value={counts.closed}
        />
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
            {orderFilter && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete("order");
                  setSearchParams(next, { replace: true });
                }}
              >
                {t("admin.droneIncidents.orderChip", { code: orderFilter })}
                <X className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
            <label className="grid w-full gap-1.5 sm:w-80">
              <span className="text-xs font-medium text-muted-foreground">
                Lọc theo trạng thái sự cố
              </span>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  avoidCollisions={false}
                >
                  {INCIDENT_FILTERS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label} ({countForFilter(item.value)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            {t("button.refresh")}
          </Button>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin" />
          ) : visible.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <PackageSearch className="mx-auto mb-3 h-9 w-9 opacity-40" />
              {orderFilter && byOrder.length === 0
                ? t("admin.droneIncidents.emptyForOrder", { code: orderFilter })
                : t("admin.droneIncidents.empty")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">
                    {t("admin.droneIncidents.columns.code")}
                  </th>
                  <th className="px-4 py-3">
                    {t("admin.droneIncidents.columns.orderDrone")}
                  </th>
                  <th className="px-4 py-3">KTV tìm hàng</th>
                  <th className="px-4 py-3">
                    {t("admin.droneIncidents.columns.incident")}
                  </th>
                  <th className="px-4 py-3">
                    {t("admin.droneIncidents.columns.recovery")}
                  </th>
                  <th className="px-4 py-3">
                    {t("admin.droneIncidents.columns.inspection")}
                  </th>
                  <th className="px-4 py-3">Cập nhật lần cuối</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {item.incidentCode}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/orders/${item.orderId}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.orderCode ?? `#${item.orderId}`}
                        <ExternalLink className="h-3 w-3 inline opacity-60" />
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.droneCode}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {item.recoveryTechnicianName ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs text-slate-900">
                              {item.recoveryTechnicianName}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${
                                item.recoveryTechnicianRole ===
                                "DRONE_TECHNICIAN"
                                  ? "bg-orange-50 text-orange-700 border-orange-200"
                                  : "bg-sky-50 text-sky-700 border-sky-200"
                              }`}
                            >
                              {item.recoveryTechnicianRole ===
                              "DRONE_TECHNICIAN"
                                ? "KTV Drone"
                                : "KTV Tủ"}
                            </Badge>
                          </div>
                          {item.recoveryTechnicianPhone && (
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {item.recoveryTechnicianPhone}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Chưa phân công
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Status value={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Status value={item.recoveryStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <Status value={item.inspectionStatus} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <div className="font-semibold text-slate-800">
                        {formatDateTime(item.updatedAt || item.createdAt)}
                      </div>
                      {item.updatedAt &&
                        item.createdAt &&
                        item.updatedAt !== item.createdAt && (
                          <div className="text-[10px] text-muted-foreground font-sans">
                            Tạo: {formatDateTime(item.createdAt)}
                          </div>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/drone-incidents/${item.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          {t("button.detail")}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <IncidentDetail id={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function Status({ value }: { value: string }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={`whitespace-nowrap border-0 ${statusTone(value)}`}
    >
      {statusLabel[value] ? t(statusLabel[value]) : value.replaceAll("_", " ")}
    </Badge>
  );
}

function IncidentDetail({
  id,
  onClose,
}: {
  id: number | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useGetDroneIncidentQuery(id ?? 0, {
    skip: id == null,
    pollingInterval: 8_000,
  });
  const incident = data?.data;
  return (
    <Dialog open={id != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            {incident?.incidentCode ?? t("admin.droneIncidents.detail.title")}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !incident ? (
          <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin" />
        ) : (
          <IncidentBody incident={incident} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function IncidentBody({ incident }: { incident: DroneParcelIncident }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <IncidentOrderContext
        orderId={incident.orderId}
        inspectionReportId={incident.inspectionReportId}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Info
          label={t("common.order")}
          value={incident.orderCode ?? `#${incident.orderId}`}
        />
        <Info label="Drone" value={incident.droneCode} />
        <Info
          label={t("common.status")}
          value={statusText(incident.status, t)}
        />
        <Info
          label={t("admin.droneIncidents.detail.dropLocation")}
          value={
            incident.dropLatitude != null
              ? `${incident.dropLatitude.toFixed(6)}, ${incident.dropLongitude?.toFixed(6)}`
              : t("admin.droneIncidents.detail.noGps")
          }
        />
        <Info
          label={t("admin.droneIncidents.detail.gpsSource")}
          value={incident.gpsSource}
        />
        <Info
          label="Camera / telemetry"
          value={`${incident.cameraStatus} · ${
            incident.telemetryStale
              ? t("admin.droneIncidents.detail.staleData")
              : t("admin.droneIncidents.detail.online")
          }`}
        />
      </div>
      <div className="rounded-lg border p-4">
        <p className="font-semibold">
          {t("admin.droneIncidents.detail.description")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{incident.reason}</p>
      </div>
      {incident.dropLatitude != null && (
        <a
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
          href={`https://www.openstreetmap.org/?mlat=${incident.dropLatitude}&mlon=${incident.dropLongitude}#map=17/${incident.dropLatitude}/${incident.dropLongitude}`}
        >
          <MapPin className="mr-1 h-4 w-4" />
          {t("admin.droneIncidents.detail.openMap")}
        </a>
      )}

      {/* Báo cáo xác nhận hiện trường từ KTV (toạ độ đối soát, ghi chú hiện trường) */}
      {(incident.recoveredLatitude != null ||
        incident.recoveryNote != null ||
        ["SUBMITTED", "VERIFIED"].includes(incident.recoveryStatus)) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-sm text-slate-900">
                Báo cáo xác nhận hiện trường từ KTV
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs bg-white">
                Kết quả: {incident.recoveryOutcome ?? "Chưa rõ"}
              </Badge>
              {incident.parcelCondition && (
                <Badge variant="secondary" className="text-xs">
                  {incident.parcelCondition}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border bg-white space-y-1">
              <span className="text-muted-foreground font-medium">
                Tọa độ KTV bấm xác nhận:
              </span>
              <p className="font-semibold text-slate-800">
                {incident.recoveredLatitude != null
                  ? `${incident.recoveredLatitude.toFixed(6)}, ${incident.recoveredLongitude?.toFixed(6)}`
                  : "Chưa có toạ độ xác nhận"}
                {incident.recoveredGpsAccuracyM != null &&
                  ` (±${incident.recoveredGpsAccuracyM.toFixed(1)} m)`}
              </p>
              {incident.dropLatitude != null &&
                incident.dropLongitude != null &&
                incident.recoveredLatitude != null &&
                incident.recoveredLongitude != null && (
                  <div className="pt-1">
                    {(() => {
                      const deltaMeters = Math.round(
                        distanceKm(
                          incident.dropLatitude,
                          incident.dropLongitude,
                          incident.recoveredLatitude,
                          incident.recoveredLongitude,
                        ) * 1000,
                      );
                      const isNear = deltaMeters <= 100;
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isNear
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isNear ? "✓ " : "⚠️ "}
                          Độ lệch so với điểm rơi: {deltaMeters} m
                        </span>
                      );
                    })()}
                  </div>
                )}
            </div>

            <div className="p-3 rounded-lg border bg-white space-y-1">
              <span className="text-muted-foreground font-medium">
                Ghi chú hiện trường của KTV:
              </span>
              <p className="font-medium text-slate-800 italic">
                {incident.recoveryNote?.trim()
                  ? `"${incident.recoveryNote}"`
                  : "Không có ghi chú."}
              </p>
            </div>
          </div>
        </div>
      )}

      <AdminActions incident={incident} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">
            {t("admin.droneIncidents.detail.evidence", {
              count: incident.evidence.length,
            })}
          </h3>
          {incident.evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.droneIncidents.detail.noEvidence")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {incident.evidence.map((item) => {
                const imageUrl = item.secureUrl || item.url || "";
                return (
                  <a
                    key={item.id}
                    href={imageUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border block"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.caption ?? item.stage}
                        className="h-32 w-full object-cover"
                      />
                    ) : (
                      <div className="h-32 w-full flex items-center justify-center bg-slate-200 text-slate-400 text-xs">
                        Không có ảnh
                      </div>
                    )}
                    <p className="p-2 text-xs">{item.caption ?? item.stage}</p>
                  </a>
                );
              })}
            </div>
          )}
        </section>
        <section className="rounded-lg border p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4 text-primary" />
            {t("admin.droneIncidents.detail.dropLocation")}
          </h3>
          {incident.dropLatitude != null && incident.dropLongitude != null ? (
            <iframe
              title={`${t("admin.droneIncidents.detail.dropLocation")}: ${incident.incidentCode}`}
              src={`https://www.google.com/maps?q=${incident.dropLatitude},${incident.dropLongitude}&z=16&output=embed`}
              className="h-48 w-full rounded-md border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-md bg-muted px-4 text-center text-sm text-muted-foreground">
              {t("admin.droneIncidents.detail.noGps")}
            </div>
          )}
        </section>
      </div>
      <div>
        <h3 className="mb-3 font-semibold">
          {t("admin.droneIncidents.detail.history")}
        </h3>
        <div className="space-y-2">
          {incident.timeline.map((item) => (
            <div key={item.id} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">
                  {item.eventType.replaceAll("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
              {item.note && (
                <p className="mt-1 text-muted-foreground">{item.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-semibold">
          {t("admin.droneIncidents.detail.proposals", {
            count: incident.proposals.length,
          })}
        </h3>
        {incident.proposals.map((proposal) => (
          <div key={proposal.id} className="mb-2 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <b>
                {t("admin.droneIncidents.detail.proposalVersion", {
                  version: proposal.version ?? proposal.proposalVersion,
                })}{" "}
                ·{" "}
                {RESOLUTION_LABELS[proposal.resolutionType]
                  ? t(RESOLUTION_LABELS[proposal.resolutionType])
                  : proposal.resolutionType.replaceAll("_", " ")}
              </b>
              <Status value={proposal.status} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {t("admin.droneIncidents.detail.compensationPolicy", {
                amount: formatCurrency(proposal.compensationAmount ?? 0),
                policy: proposal.policyVersion,
              })}
            </p>
            {proposal.customerResponseNote && (
              <p className="mt-1">
                {t("admin.droneIncidents.detail.customerResponse", {
                  note: proposal.customerResponseNote,
                })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function translateParcelCategory(category?: string | null): string {
  if (!category) return "—";
  const map: Record<string, string> = {
    DOCUMENT: "Tài liệu / Giấy tờ",
    FOOD: "Thực phẩm / Đồ ăn",
    CLOTHING: "Quần áo / Thời trang",
    ELECTRONICS: "Thiết bị điện tử",
    COSMETICS: "Mỹ phẩm / Làm đẹp",
    OTHER: "Hàng hoá khác",
  };
  return map[category] ?? category;
}

export function translatePaymentMethod(method?: string | null): string {
  if (!method) return "—";
  const map: Record<string, string> = {
    WALLET: "Ví Lock.R",
    SEPAY: "Chuyển khoản SePay (VietQR)",
    VNPAY: "Cổng VNPAY",
    MOMO: "Ví MoMo",
    CASH: "Tiền mặt",
  };
  return map[method] ?? method;
}

/** Dùng read model đơn drone thật để Admin có đủ ngữ cảnh trước khi quyết định
 * thu hồi, bồi thường hoặc giao lại. */
export function IncidentOrderContext({
  orderId,
  inspectionReportId,
}: {
  orderId: number;
  inspectionReportId?: number | null;
}) {
  const { data, isLoading, isError } = useGetDroneOrderQuery(orderId);
  const order = data?.data;

  const parcelSize = [
    order?.parcelLengthCm,
    order?.parcelWidthCm,
    order?.parcelHeightCm,
  ].every((value) => typeof value === "number")
    ? `${order?.parcelLengthCm} × ${order?.parcelWidthCm} × ${order?.parcelHeightCm} cm`
    : "—";

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              Thông tin Đơn hàng
              {order && (
                <Link
                  to={`/admin/orders/${order.orderId}`}
                  className="inline-flex items-center gap-1 group"
                >
                  <Badge
                    variant="outline"
                    className="font-mono text-xs bg-white text-sky-800 border-sky-300 cursor-pointer group-hover:bg-sky-50 group-hover:border-sky-500 transition-colors"
                  >
                    {order.orderCode || `#${order.orderId}`}
                    <ExternalLink className="h-3 w-3 ml-1 text-sky-600" />
                  </Badge>
                </Link>
              )}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {inspectionReportId && (
            <Link
              to={`/admin/maintenance?reportId=${inspectionReportId}`}
              className="text-xs font-semibold text-sky-700 bg-sky-100 hover:bg-sky-200 border border-sky-300 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition-colors"
            >
              Phiếu kiểm tra drone #{inspectionReportId}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <Link
            to={`/admin/drone-orders/${orderId}`}
            className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-2xs transition-colors"
          >
            Hành trình bay
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
          <span className="ml-2 text-xs text-muted-foreground">
            Đang tải chi tiết đơn hàng...
          </span>
        </div>
      ) : isError || !order ? (
        <p className="rounded-lg border border-dashed bg-white p-3 text-xs text-muted-foreground">
          Không tải được chi tiết đơn hàng #{orderId}. Bạn vẫn có thể tiếp tục
          xử lý sự cố.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {/* Cột 1: Khách hàng gửi & Tủ gửi */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b pb-1.5">
              <User className="h-3.5 w-3.5 text-sky-600" />
              <span>Khách hàng gửi & Điểm gửi</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900 text-sm">
                {order.customerName ||
                  order.sender?.name ||
                  "Chưa có tên người gửi"}
              </p>
              {(order.customerPhone || order.sender?.phone) && (
                <p className="text-slate-600 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <a
                    href={`tel:${order.customerPhone || order.sender?.phone}`}
                    className="hover:underline font-mono"
                  >
                    {order.customerPhone || order.sender?.phone}
                  </a>
                </p>
              )}
              {order.sender?.email && (
                <p
                  className="text-slate-500 flex items-center gap-1 truncate"
                  title={order.sender.email}
                >
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span>{order.sender.email}</span>
                </p>
              )}
            </div>
            <div className="pt-1.5 border-t space-y-1 text-[11px] text-slate-600">
              <p>
                <b>Tủ gửi:</b>{" "}
                {order.sourceLocker?.name || order.sourceLocker?.code || "—"}
                {order.sourceBoxNumber != null && (
                  <Badge
                    variant="outline"
                    className="ml-1 text-[10px] px-1 py-0"
                  >
                    Ô #{order.sourceBoxNumber}
                  </Badge>
                )}
              </p>
              {order.sourceLocker?.address && (
                <p
                  className="text-muted-foreground line-clamp-2"
                  title={order.sourceLocker.address}
                >
                  📍 {order.sourceLocker.address}
                </p>
              )}
            </div>
          </div>

          {/* Cột 2: Người nhận & Tủ nhận */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b pb-1.5">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Người nhận hàng & Điểm nhận</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900 text-sm">
                {order.receiverName || "Chưa có tên người nhận"}
              </p>
              {order.receiverPhone && (
                <p className="text-slate-600 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <a
                    href={`tel:${order.receiverPhone}`}
                    className="hover:underline font-mono"
                  >
                    {order.receiverPhone}
                  </a>
                </p>
              )}
              {order.receiverEmail && (
                <p
                  className="text-slate-500 flex items-center gap-1 truncate"
                  title={order.receiverEmail}
                >
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span>{order.receiverEmail}</span>
                </p>
              )}
            </div>
            <div className="pt-1.5 border-t space-y-1 text-[11px] text-slate-600">
              <p>
                <b>Tủ nhận:</b>{" "}
                {order.destinationLocker?.name ||
                  order.destinationLocker?.code ||
                  "—"}
                {order.reservedBoxNumber != null && (
                  <Badge
                    variant="outline"
                    className="ml-1 text-[10px] px-1 py-0 bg-emerald-50 text-emerald-800 border-emerald-300"
                  >
                    Ô nhận #{order.reservedBoxNumber}
                  </Badge>
                )}
              </p>
              {order.destinationLocker?.address && (
                <p
                  className="text-muted-foreground line-clamp-2"
                  title={order.destinationLocker.address}
                >
                  📍 {order.destinationLocker.address}
                </p>
              )}
            </div>
          </div>

          {/* Cột 3: Kiện hàng & Trọng lượng */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b pb-1.5">
              <Box className="h-3.5 w-3.5 text-purple-600" />
              <span>Kiện hàng & Trọng lượng</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loại hàng:</span>
                <span className="font-semibold text-slate-900">
                  {translateParcelCategory(order.parcelCategory)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kích thước:</span>
                <span className="font-semibold text-slate-900">
                  {parcelSize}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cân nặng:</span>
                <span className="font-semibold text-slate-900">
                  {order.parcelWeightGrams != null
                    ? `${order.parcelWeightGrams} g`
                    : "—"}
                  {order.payloadWeightGrams != null &&
                    ` (Nạp drone: ${order.payloadWeightGrams} g)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giá trị khai báo:</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(order.declaredValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hàng dễ vỡ:</span>
                <span
                  className={
                    order.fragile
                      ? "font-bold text-amber-700"
                      : "text-slate-600"
                  }
                >
                  {order.fragile ? "Có (Dễ vỡ) ⚠️" : "Không"}
                </span>
              </div>
            </div>
            {order.description && (
              <p
                className="pt-1 border-t text-[11px] text-muted-foreground italic truncate"
                title={order.description}
              >
                Ghi chú: "{order.description}"
              </p>
            )}
          </div>

          {/* Cột 4: Cước phí & Thanh toán & Drone */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b pb-1.5">
              <CreditCard className="h-3.5 w-3.5 text-amber-600" />
              <span>Cước phí & Vận hành</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng cước phí:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(order.totalPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đã thanh toán:</span>
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(
                    order.totalPrice == null
                      ? null
                      : order.totalPrice - (order.amountDue ?? 0),
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Còn phải thu:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(order.amountDue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phương thức:</span>
                <span className="font-medium text-slate-800">
                  {translatePaymentMethod(order.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Drone vận chuyển:</span>
                <span className="font-bold text-sky-800 font-mono">
                  {order.droneCode || "—"}
                </span>
              </div>
            </div>
            {order.sealCode && (
              <p className="pt-1 border-t text-[10px] text-muted-foreground font-mono">
                Niêm phong: <b>{order.sealCode}</b>
                {order.loadedByName && ` · Nạp bởi: ${order.loadedByName}`}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function readableStatus(value: string | null | undefined): string {
  return value ? value.replaceAll("_", " ") : "—";
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export function AdminActions({ incident }: { incident: DroneParcelIncident }) {
  const { t } = useTranslation();
  const { data: users } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const { data: presencesData } = useGetTechnicianPresencesQuery(
    { all: true },
    { pollingInterval: 10_000 },
  );

  const presenceByUserId = useMemo(() => {
    const map = new Map<number, TechnicianPresenceResponse>();
    const list = presencesData?.data ?? [];
    for (const p of list) {
      map.set(p.userId, p);
    }
    return map;
  }, [presencesData]);

  const dropLat = incident.dropLatitude ?? 10.84159;
  const dropLng = incident.dropLongitude ?? 106.81024;

  const raw = users?.data as unknown;
  const techs = useMemo(() => {
    type User = {
      id: number;
      fullName?: string;
      status?: string;
      roles?: string[];
      distanceKm?: number | null;
      onDuty?: boolean;
    };
    const list: User[] = Array.isArray(raw)
      ? raw
      : ((raw as { content?: User[] } | undefined)?.content ?? []);

    const userMap = new Map<number, User>();
    for (const u of list) {
      userMap.set(u.id, u);
    }

    const allIds = new Set<number>();
    for (const u of list) {
      if (
        u.status === "ACTIVE" &&
        (u.roles ?? []).some((role) =>
          [
            "LOCKER_TECHNICIAN",
            "ROLE_LOCKER_TECHNICIAN",
            "DRONE_TECHNICIAN",
            "ROLE_DRONE_TECHNICIAN",
          ].includes(role),
        )
      ) {
        allIds.add(u.id);
      }
    }
    for (const p of presenceByUserId.values()) {
      allIds.add(p.userId);
    }

    const res: User[] = [];
    for (const id of allIds) {
      const u = userMap.get(id);
      const p = presenceByUserId.get(id);
      let dist: number | null = null;
      if (
        p?.latitude != null &&
        p?.longitude != null &&
        dropLat != null &&
        dropLng != null
      ) {
        dist = distanceKm(
          dropLat,
          dropLng,
          Number(p.latitude),
          Number(p.longitude),
        );
      }
      res.push({
        id,
        fullName: u?.fullName || p?.userName || `KTV #${id}`,
        status: u?.status || "ACTIVE",
        roles:
          u?.roles ??
          (p?.technicianType === "DRONE_TECHNICIAN"
            ? ["DRONE_TECHNICIAN"]
            : ["LOCKER_TECHNICIAN"]),
        distanceKm: dist,
        onDuty: p?.onDuty ?? true,
      });
    }

    return res.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [raw, presenceByUserId, dropLat, dropLng]);

  const [technicianId, setTechnicianId] = useState(
    incident.recoveryAssignedToUserId?.toString() ?? "",
  );
  const atHub = incident.parcelStatus === "RETURNED_TO_HUB";
  const canAssign = ["OPEN", "AWAITING_ASSIGNMENT", "ASSIGNED"].includes(
    incident.recoveryStatus,
  );
  const suggested = suggestedCompensationOf(incident);
  // Mặc định hợp lệ với backend: kiện đã về hub → giao lại miễn phí (0đ); chưa về → chỉ
  // bồi thường theo mức đề xuất (nếu có).
  const [resolutionType, setResolutionType] = useState(
    atHub ? "FREE_REDELIVERY" : "COMPENSATION_ONLY",
  );
  const [amount, setAmount] = useState(
    atHub ? "0" : suggested != null && suggested > 0 ? String(suggested) : "",
  );
  const [overrideReason, setOverrideReason] = useState("");
  const [refundShippingFee, setRefundShippingFee] = useState<boolean>(
    incident.refundShippingFeeAllowed ?? true,
  );
  const [showProposalError, setShowProposalError] = useState(false);
  const [confirmHandover, setConfirmHandover] = useState(false);
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [showDispatchMap, setShowDispatchMap] = useState(false);
  const [assign, assignState] = useAssignDroneRecoveryMutation();
  const [verify, verifyState] = useVerifyDroneRecoveryMutation();
  const [completeRedelivery, completeRedeliveryState] =
    useCompleteDroneIncidentRedeliveryMutation();
  const [propose, proposalState] = useCreateDroneIncidentProposalMutation();
  const [approveCompensation, approvalState] =
    useApproveDroneIncidentCompensationMutation();
  const [handover, handoverState] = useConfirmDroneParcelHubHandoverMutation();
  const proposalError = validateProposal(
    t,
    incident,
    resolutionType,
    amount,
    overrideReason,
  );
  const canHandover =
    incident.recoveryStatus === "VERIFIED" &&
    incident.recoveryOutcome === "FOUND";
  const handle = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      if (incident.id === 999 || incident.id === 998) {
        toast.success(`${success} (Dữ liệu mẫu demo)`);
        return true;
      }
      const data = (error as { data?: { code?: string; message?: string } })
        ?.data;
      toast.error(
        (data?.code &&
          INCIDENT_ERRORS[data.code] &&
          t(INCIDENT_ERRORS[data.code])) ||
          data?.message ||
          t("admin.droneIncidents.actions.failed"),
      );
      return false;
    }
  };
  const changeResolutionType = (next: string) => {
    setResolutionType(next);
    setShowProposalError(true);
    if (next === "FREE_REDELIVERY") {
      setAmount("0");
    } else if (amount.trim() === "" || Number(amount) === 0) {
      // Loại có tiền bồi thường: gợi ý mức chính sách thay cho 0
      setAmount(suggested != null && suggested > 0 ? String(suggested) : "");
    }
  };
  const submitProposal = async () => {
    setShowProposalError(true);
    if (proposalError) return;
    const ok = await handle(
      () =>
        propose({
          id: incident.id,
          resolutionType,
          redeliveryOffered: REDELIVERY_TYPES.has(resolutionType),
          compensationAmount: Number(amount) || 0,
          refundShippingFee:
            resolutionType === "FREE_REDELIVERY" ? false : refundShippingFee,
          overrideReason: overrideReason.trim() || undefined,
        }).unwrap(),
      t("admin.droneIncidents.actions.proposalSent"),
    );
    if (ok) setShowProposalError(false);
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <Navigation className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Điều phối & Kỹ thuật viên tìm hàng
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Theo dõi tiến độ tìm kiếm và điều phối KTV thu hồi kiện tại hiện
                trường
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-semibold ${
              canAssign
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : "bg-emerald-50 text-emerald-800 border-emerald-300"
            }`}
          >
            {canAssign ? "Chờ KTV tiếp nhận" : "KTV đã nhận việc"}
          </Badge>
        </div>

        {/* Khung thông tin KTV phụ trách */}
        {incident.recoveryTechnicianName ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-sky-600" />
                KTV phụ trách tìm hàng
              </span>
              {incident.recoveryTechnicianRole && (
                <Badge
                  variant="outline"
                  className={`text-[11px] font-semibold ${
                    incident.recoveryTechnicianRole === "DRONE_TECHNICIAN"
                      ? "bg-orange-50 text-orange-700 border-orange-300"
                      : "bg-sky-50 text-sky-700 border-sky-300"
                  }`}
                >
                  {incident.recoveryTechnicianRole === "DRONE_TECHNICIAN"
                    ? "🚁 KTV Drone (Không bận đơn)"
                    : "🏢 KTV Kiosk / Tủ (GPS gần điểm rơi)"}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-0.5">
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {incident.recoveryTechnicianName}
                </p>
                <p className="text-muted-foreground font-mono text-xs flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {incident.recoveryTechnicianPhone ? (
                    <a
                      href={`tel:${incident.recoveryTechnicianPhone}`}
                      className="hover:underline text-slate-700 font-medium"
                    >
                      {incident.recoveryTechnicianPhone}
                    </a>
                  ) : (
                    "Chưa cập nhật SĐT"
                  )}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-muted-foreground block">
                  Tiến độ thu hồi
                </span>
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold mt-0.5"
                >
                  {statusText(incident.recoveryStatus, t)}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Chưa có KTV phụ trách tìm hàng</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Hệ thống chưa tìm thấy KTV rảnh trong bán kính ban đầu. Vui lòng
                mở bản đồ điều phối để mở rộng bán kính và chọn KTV.
              </p>
            </div>
          </div>
        )}

        {/* Nút mở bản đồ điều phối theo bán kính R */}
        <Button
          type="button"
          variant="outline"
          className="w-full border-sky-300 text-sky-800 bg-sky-50/40 hover:bg-sky-100 flex items-center justify-center gap-2 text-xs font-semibold py-2"
          onClick={() => setShowDispatchMap(true)}
        >
          <Radio className="h-4 w-4 text-red-500 animate-pulse" />
          {canAssign
            ? "Bản đồ điều phối tìm KTV theo bán kính R (Kiosk & Drone)"
            : "Xem bản đồ vị trí KTV & điểm rơi (Chế độ theo dõi)"}
        </Button>

        <RecoveryDispatchMapModal
          open={showDispatchMap}
          onOpenChange={setShowDispatchMap}
          incident={incident}
          onAssigned={() => {}}
        />

        {/* Phân công tay (Nếu KTV chưa nhận) HOẶC Khóa phân công (Khi KTV đã nhận) */}
        {canAssign ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-sky-600" />
                Phân công thủ công (Reassign)
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Nếu KTV được hệ thống tự động gán không thể nhận nhiệm vụ (do
                bận việc cá nhân, phương tiện hoặc không liên lạc được), Quản
                trị viên được phép phân công lại thủ công cho KTV khác dưới đây:
              </p>
            </div>

            <div className="flex gap-2">
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger className="bg-white text-xs">
                  <SelectValue
                    placeholder={t("admin.droneIncidents.actions.selectTech")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {techs.map((tech) => {
                    const isDrone = (tech.roles ?? []).some((r) =>
                      r.includes("DRONE"),
                    );
                    return (
                      <SelectItem
                        key={tech.id}
                        value={String(tech.id)}
                        className="text-xs"
                      >
                        {tech.fullName ??
                          t("admin.droneIncidents.actions.techFallback", {
                            id: tech.id,
                          })}{" "}
                        ({isDrone ? "KTV Drone" : "KTV Tủ"})
                        {tech.distanceKm != null
                          ? ` · ${kmLabel(tech.distanceKm)}`
                          : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="whitespace-nowrap font-semibold text-xs px-4"
                disabled={!technicianId || assignState.isLoading}
                onClick={() =>
                  handle(
                    () =>
                      assign({
                        id: incident.id,
                        technicianId: Number(technicianId),
                      }).unwrap(),
                    "Đã phân công lại kỹ thuật viên tìm hàng!",
                  )
                }
              >
                {assignState.isLoading && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Phân công
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-2.5 text-xs text-emerald-950">
            <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                Kỹ thuật viên đã tiếp nhận nhiệm vụ (
                {statusText(incident.recoveryStatus, t)})
              </p>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                KTV đã xác nhận nhận lệnh và đang trong quy trình xử lý thực
                địa. Để đảm bảo tính nhất quán của hiện trường, Quản trị viên
                không được phép đổi hoặc phân công lại KTV khác.
              </p>
            </div>
          </div>
        )}

        {/* Bước xác minh kết quả tìm hàng từ KTV */}
        {incident.recoveryStatus === "SUBMITTED" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <span className="font-bold text-sm text-amber-950">
                Xác minh kết quả tìm hàng (Admin Review)
              </span>
              <Badge className="bg-amber-600 text-white text-[10px]">
                Chờ Admin duyệt
              </Badge>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              KTV đã tìm thấy kiện và nộp báo cáo hiện trường. Admin cần đối
              chiếu các mục sau trước khi xác minh:
            </p>
            <ul className="text-xs text-amber-950 space-y-1 list-disc list-inside">
              <li>
                Kiểm tra hình ảnh hiện trường và hiện trạng gói hàng thực tế.
              </li>
              <li>
                Đối soát toạ độ GPS xác nhận từ điện thoại KTV so với toạ độ
                rơi.
              </li>
              <li>
                Xác nhận tình trạng kiện:{" "}
                <b>{incident.parcelCondition || "Chưa rõ"}</b>.
              </li>
            </ul>
            <p className="text-[11px] text-muted-foreground italic">
              * Sau khi bấm Duyệt xác minh, kiện hàng được mở khoá để KTV bàn
              giao về Hub và hệ thống cho phép tạo phương án bồi thường / giao
              lại cho khách.
            </p>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
              disabled={verifyState.isLoading}
              onClick={() => setShowVerifyConfirm(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Duyệt xác minh kết quả tìm hàng của KTV
            </Button>
          </div>
        )}

        <AlertDialog
          open={showVerifyConfirm}
          onOpenChange={(open) =>
            !verifyState.isLoading && setShowVerifyConfirm(open)
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                Xác nhận kết quả tìm hàng ({incident.incidentCode})
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-xs">
                <p>
                  Bạn đang thực hiện bước{" "}
                  <b>Xác minh kết quả tìm hàng (Admin Review)</b>. Bước này có ý
                  nghĩa:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li>
                    Xác nhận KTV đã tìm thấy kiện tại thực địa với toạ độ và
                    hình ảnh đối soát hợp lệ.
                  </li>
                  <li>
                    Chuyển trạng thái tìm hàng sang{" "}
                    <b>ĐÃ XÁC MINH (VERIFIED)</b>.
                  </li>
                  <li>Cho phép KTV vận chuyển kiện hàng bàn giao về Hub.</li>
                  <li>
                    Mở khoá chức năng tạo phương án xử lý bồi thường / giao lại
                    cho khách hàng.
                  </li>
                </ul>
                <p className="font-semibold text-slate-900 pt-1">
                  Bạn đã kiểm tra kỹ hình ảnh hiện trường và toạ độ check-in
                  chưa?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={verifyState.isLoading}>
                Xem lại
              </AlertDialogCancel>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={verifyState.isLoading}
                onClick={async () => {
                  const ok = await handle(
                    () => verify(incident.id).unwrap(),
                    "Đã xác minh kết quả tìm hàng thành công!",
                  );
                  if (ok) setShowVerifyConfirm(false);
                }}
              >
                {verifyState.isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                )}
                Duyệt xác minh
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {atHub ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
            <PackageCheck className="h-4 w-4" />
            {incident.returnedToHubAt
              ? t("admin.droneIncidents.actions.atHubAt", {
                  time: formatDateTime(incident.returnedToHubAt),
                })
              : t("admin.droneIncidents.actions.atHub")}
          </p>
        ) : canHandover ? (
          <div className="mt-3 space-y-1">
            <Button
              variant="outline"
              disabled={handoverState.isLoading}
              onClick={() => setConfirmHandover(true)}
            >
              <PackageCheck className="mr-1 h-4 w-4" />
              {t("admin.droneIncidents.actions.confirmHub")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("admin.droneIncidents.actions.confirmHubHint")}
            </p>
          </div>
        ) : null}
      </div>
      <AlertDialog
        open={confirmHandover}
        onOpenChange={(open) =>
          !handoverState.isLoading && setConfirmHandover(open)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.droneIncidents.actions.confirmHubTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.droneIncidents.actions.confirmHubDescription", {
                code: incident.orderCode ?? `#${incident.orderId}`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={handoverState.isLoading}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <Button
              disabled={handoverState.isLoading}
              onClick={async () => {
                const ok = await handle(
                  () => handover(incident.id).unwrap(),
                  t("admin.droneIncidents.actions.hubConfirmed"),
                );
                if (ok) setConfirmHandover(false);
              }}
            >
              {handoverState.isLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("button.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {t("admin.droneIncidents.actions.proposalTitle")}
          </h3>
          <Badge
            variant="outline"
            className={`text-xs ${
              incident.incidentPolicyEnabled !== false
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-red-50 text-red-800 border-red-300"
            }`}
          >
            Chính sách: {incident.incidentPolicyEnabled !== false ? "Đang bật" : "Đang tắt"}
          </Badge>
        </div>

        {/* Bảng cấu hình quy tắc bồi thường từ Hệ thống (8 quy tắc Image 1) */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b pb-1.5">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Cấu hình bồi thường áp dụng cho đơn:
            </span>
            <Link
              to="/admin/settings"
              target="_blank"
              className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
            >
              Xem cài đặt
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2 rounded bg-white border">
              <span className="text-muted-foreground block text-[10px]">Tỷ lệ đề xuất</span>
              <span className="font-bold text-slate-800">
                {formatCompensationRate(incident.compensationRate)}
              </span>
            </div>
            <div className="p-2 rounded bg-white border">
              <span className="text-muted-foreground block text-[10px]">Trần bồi thường</span>
              <span className="font-bold text-slate-800">
                {incident.compensationCap && incident.compensationCap > 0
                  ? formatCurrency(incident.compensationCap)
                  : "Không đặt trần"}
              </span>
            </div>
            <div className="p-2 rounded bg-white border">
              <span className="text-muted-foreground block text-[10px]">SLA thu hồi</span>
              <span className="font-bold text-slate-800">
                {incident.recoverySlaHours ?? 4} giờ
              </span>
            </div>
            <div className="p-2 rounded bg-white border">
              <span className="text-muted-foreground block text-[10px]">Duyệt chi bồi thường</span>
              <span className="font-bold text-slate-800">
                {incident.approvalRequired !== false ? "Bắt buộc duyệt" : "Tự động"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 border-t pt-1.5">
            <span>
              Giá trị kiện: <b>{formatCurrency(incident.declaredValue ?? 0)}</b>
            </span>
            <span>
              ⇒ Gợi ý bồi thường:{" "}
              <b className="text-emerald-700">{formatCurrency(suggested)}</b>
            </span>
            <span>
              • Hoàn cước ship:{" "}
              <b className="text-slate-800">
                {incident.refundShippingFeeAllowed !== false ? "Có" : "Không"}
              </b>
            </span>
            <span>
              • Xem xét lại:{" "}
              <b className="text-slate-800">
                {incident.disputeAllowed !== false ? "Cho phép" : "Không"}
              </b>
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Phương án giải quyết đề xuất:
          </label>
          <Select value={resolutionType} onValueChange={changeResolutionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RESOLUTION_LABELS).map(([value, labelKey]) => (
                <SelectItem
                  key={value}
                  value={value}
                  disabled={REDELIVERY_TYPES.has(value) && !atHub}
                >
                  {t(labelKey)}
                  {REDELIVERY_TYPES.has(value) && !atHub
                    ? ` ${t("admin.droneIncidents.actions.needsHub")}`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded bg-slate-50 border p-2 text-[11px] text-muted-foreground leading-relaxed">
          {resolutionType === "FREE_REDELIVERY" &&
            "• Giao lại miễn phí toàn bộ cước phí sau khi kiện đã an toàn về Hub (Khoản bồi thường = 0đ)."}
          {resolutionType === "REDELIVERY_PARTIAL_COMPENSATION" &&
            "• Giao lại kiện cho khách sau khi đã về Hub, đồng thời tạo phiếu bồi thường một phần giá trị thiệt hại."}
          {resolutionType === "COMPENSATION_ONLY" &&
            "• Tạo phiếu bồi thường chuyển khoản qua ngân hàng cho khách (không giao lại kiện do mất hoặc hỏng hoàn toàn)."}
          {resolutionType === "MANUAL_RESOLUTION" &&
            "• Thoả thuận phương án riêng với khách hàng ngoài quy trình tự động. Nhập biên bản/nội dung thỏa thuận vào ô ghi chú."}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">
            Số tiền bồi thường (VND):
          </label>
          <Input
            type="number"
            min="0"
            value={amount}
            disabled={resolutionType === "FREE_REDELIVERY"}
            onChange={(event) => {
              setAmount(event.target.value);
              setShowProposalError(true);
            }}
            placeholder={t("admin.droneIncidents.actions.amountPlaceholder")}
          />
          {suggested != null && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {t("admin.droneIncidents.actions.suggested")}{" "}
              <b className="text-emerald-700">{formatCurrency(suggested)}</b>
              {resolutionType !== "FREE_REDELIVERY" &&
                String(suggested) !== amount && (
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setAmount(String(suggested))}
                  >
                    {t("admin.droneIncidents.actions.useSuggested")}
                  </button>
                )}
            </p>
          )}
        </div>

        {/* Tuỳ chọn hoàn phí giao hàng khi bồi thường (Quy tắc 5 BE) */}
        {resolutionType !== "FREE_REDELIVERY" && (
          <div className="flex items-center space-x-2 rounded border bg-slate-50/70 p-2 text-xs">
            <Checkbox
              id="refundShippingFee"
              checked={refundShippingFee}
              onCheckedChange={(checked) => setRefundShippingFee(Boolean(checked))}
            />
            <label
              htmlFor="refundShippingFee"
              className="text-xs font-medium text-slate-800 cursor-pointer select-none leading-none"
            >
              Hoàn phí giao hàng khi bồi thường
              <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">
                (Khoản hoàn phí vận chuyển được xử lý tách biệt với bồi thường giá trị kiện hàng)
              </span>
            </label>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">
            Lý do điều chỉnh / Ghi chú thỏa thuận:
          </label>
          <Input
            value={overrideReason}
            onChange={(event) => setOverrideReason(event.target.value)}
            placeholder={
              resolutionType === "MANUAL_RESOLUTION"
                ? "Bắt buộc: Nhập chi tiết phương án đã thỏa thuận với khách..."
                : t("admin.droneIncidents.actions.overridePlaceholder")
            }
          />
        </div>

        {showProposalError && proposalError && (
          <p className="text-xs text-red-600 font-medium">{proposalError}</p>
        )}
          <Button
            disabled={
              !["VERIFIED", "CLOSED"].includes(incident.recoveryStatus) ||
              proposalState.isLoading ||
              (showProposalError && proposalError != null)
            }
            onClick={() => void submitProposal()}
          >
            {t("admin.droneIncidents.actions.createProposal")}
          </Button>

          {/* Xử lý hoàn tất giao lại */}
          {["PREPARING", "IN_PROGRESS"].includes(incident.redeliveryStatus) && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  Tiến trình giao lại cho khách
                </span>
                <Badge className="bg-indigo-600 text-white text-[10px]">
                  Đang giao lại
                </Badge>
              </div>
              {incident.redeliveryOrderId && (
                <div className="flex items-center justify-between bg-white/90 p-2 rounded border border-indigo-100 text-xs text-indigo-950">
                  <span className="text-muted-foreground">Đơn giao lại mới:</span>
                  <Link
                    to={`/admin/drone-orders?orderId=${incident.redeliveryOrderId}`}
                    className="font-mono font-bold text-indigo-700 underline flex items-center gap-1 hover:text-indigo-900"
                  >
                    Đơn #{incident.redeliveryOrderId}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
              <p className="text-xs text-indigo-900">
                Kiện hàng đã được điều phối giao lại từ Hub. Khi kiện đã giao
                thành công tới tay khách, bấm nút dưới để hoàn tất toàn bộ sự
                cố:
              </p>
              <Button
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-semibold"
                disabled={completeRedeliveryState.isLoading}
                onClick={() =>
                  handle(
                    () => completeRedelivery(incident.id).unwrap(),
                    "Đã xác nhận giao lại thành công và đóng sự cố!",
                  )
                }
              >
                <CheckCircle2 className="h-4 w-4" />
                Xác nhận đã giao lại thành công & hoàn tất sự cố
              </Button>
            </div>
          )}

          {["AWAITING_APPROVAL", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(
            incident.compensationStatus,
          ) && (
            <Button
              variant="outline"
              disabled={approvalState.isLoading}
              onClick={() =>
                handle(
                  () => approveCompensation(incident.id).unwrap(),
                  t("admin.droneIncidents.actions.compensationProcessed"),
                )
              }
            >
              {incident.compensationStatus === "AWAITING_APPROVAL"
                ? t("admin.droneIncidents.actions.approveCompensation")
                : t("admin.droneIncidents.actions.retryPayout")}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            {t("admin.droneIncidents.actions.payoutNote")}
          </p>
        </div>
      </div>
  );
}
