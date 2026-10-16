import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  Eye,
  Loader2,
  MapPin,
  PackageCheck,
  PackageSearch,
  Radio,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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
  useGetDroneIncidentQuery,
  useGetDroneIncidentsQuery,
  useVerifyDroneRecoveryMutation,
  type DroneParcelIncident,
  SAMPLE_DRONE_INCIDENTS,
} from "~/stores/apis/admin/droneIncidents";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { useConfirmDroneParcelHubHandoverMutation } from "./hubHandoverApi";
import { distanceKm } from "../drone-orders/journey";
import { RecoveryDispatchMapModal } from "./RecoveryDispatchMapModal";

// Giá trị là khoá i18n; dịch lúc render.
const statusLabel: Record<string, string> = {
  REPORTED: "admin.droneIncidents.status.reported",
  EVIDENCE_PENDING: "admin.droneIncidents.status.evidencePending",
  INVESTIGATING: "admin.droneIncidents.status.investigating",
  RECOVERY_IN_PROGRESS: "admin.droneIncidents.status.recoveryInProgress",
  AWAITING_ADMIN_REVIEW: "admin.droneIncidents.status.awaitingAdminReview",
  RESOLUTION_PROPOSED: "admin.droneIncidents.status.resolutionProposed",
  AWAITING_CUSTOMER_RESPONSE: "admin.droneIncidents.status.awaitingCustomerResponse",
  RESOLUTION_IN_PROGRESS: "admin.droneIncidents.status.resolutionInProgress",
  DISPUTED: "admin.droneIncidents.status.disputed",
  RESOLVED: "admin.droneIncidents.status.resolved",
  CLOSED: "admin.droneIncidents.status.closed",
  MANUAL_INTERVENTION_REQUIRED: "admin.droneIncidents.status.manualInterventionRequired",
};

function statusText(value: string, t: TFunction): string {
  const key = statusLabel[value];
  return key ? t(key) : value;
}

// Nhóm lọc theo trạng thái sự cố (DroneIncidentStates.INCIDENT ở backend)
const FILTERS = [
  "ALL",
  "REPORTED",
  "INVESTIGATING",
  "RECOVERY_IN_PROGRESS",
  "AWAITING_ADMIN_REVIEW",
  "AWAITING_CUSTOMER_RESPONSE",
  "RESOLUTION_IN_PROGRESS",
  "DISPUTED",
  "MANUAL_INTERVENTION_REQUIRED",
  "RESOLVED",
  "CLOSED",
] as const;

// Giá trị là khoá i18n; dịch lúc render.
const RESOLUTION_LABELS: Record<string, string> = {
  FREE_REDELIVERY: "admin.droneIncidents.resolution.freeRedelivery",
  REDELIVERY_PARTIAL_COMPENSATION: "admin.droneIncidents.resolution.redeliveryPartialCompensation",
  COMPENSATION_ONLY: "admin.droneIncidents.resolution.compensationOnly",
  MANUAL_RESOLUTION: "admin.droneIncidents.resolution.manualResolution",
};

// Mã lỗi DroneParcelIncidentService → khoá i18n của thông báo
const INCIDENT_ERRORS: Record<string, string> = {
  RESOLUTION_CONTENT_INVALID: "admin.droneIncidents.errors.resolutionContentInvalid",
  RESOLUTION_TYPE_INVALID: "admin.droneIncidents.errors.resolutionTypeInvalid",
  PARCEL_NOT_AT_HUB: "admin.droneIncidents.errors.parcelNotAtHub",
  FREE_REDELIVERY_DISABLED: "admin.droneIncidents.errors.freeRedeliveryDisabled",
  INCIDENT_POLICY_DISABLED: "admin.droneIncidents.errors.incidentPolicyDisabled",
  COMPENSATION_OVERRIDE_REASON_REQUIRED:
    "admin.droneIncidents.errors.compensationOverrideReasonRequired",
  RECOVERY_NOT_VERIFIED: "admin.droneIncidents.errors.recoveryNotVerified",
  PARCEL_NOT_FOUND: "admin.droneIncidents.errors.parcelNotFound",
  RECOVERY_FORBIDDEN: "admin.droneIncidents.errors.recoveryForbidden",
};

/** Backend (bản mới) trả thêm mức bồi thường đề xuất theo chính sách; bản cũ chưa có. */
function suggestedCompensationOf(incident: DroneParcelIncident): number | null {
  const value = (incident as DroneParcelIncident & {
    suggestedCompensation?: number | null;
  }).suggestedCompensation;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const REDELIVERY_TYPES = new Set(["FREE_REDELIVERY", "REDELIVERY_PARTIAL_COMPENSATION"]);

/** Kiểm tra phương án giống DroneParcelIncidentService.propose để báo lỗi trước khi gửi. */
function validateProposal(
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
  if (REDELIVERY_TYPES.has(resolutionType) && incident.parcelStatus !== "RETURNED_TO_HUB") {
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
  const suggested = suggestedCompensationOf(incident);
  if (suggested != null && amount > suggested && !overrideReason.trim()) {
    return t("admin.droneIncidents.validation.overSuggested", { amount: formatCurrency(suggested) });
  }
  return null;
}

function statusTone(status: string) {
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
  const incidents = useMemo(() => {
    const existingCodes = new Set(apiIncidents.map((i) => i.incidentCode));
    const samplesToAdd = SAMPLE_DRONE_INCIDENTS.filter(
      (s) => !existingCodes.has(s.incidentCode),
    );
    return [...samplesToAdd, ...apiIncidents];
  }, [apiIncidents]);
  const byOrder = orderFilter
    ? incidents.filter(
        (item) =>
          item.orderCode === orderFilter || String(item.orderId) === orderFilter,
      )
    : incidents;
  const visible =
    filter === "ALL"
      ? byOrder
      : byOrder.filter((item) => item.status === filter);
  const filterCounts = byOrder.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
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
        <Stat label={t("admin.droneIncidents.stats.open")} value={counts.open} />
        <Stat label={t("admin.droneIncidents.stats.recovering")} value={counts.recovering} />
        <Stat label={t("admin.droneIncidents.stats.review")} value={counts.review} />
        <Stat label={t("admin.droneIncidents.stats.closed")} value={counts.closed} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
          {FILTERS.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "default" : "outline"}
              onClick={() => setFilter(value)}
            >
              {value === "ALL" ? t("common.all") : statusText(value, t)}
              <span className="ml-1 text-xs opacity-70">
                {value === "ALL" ? byOrder.length : (filterCounts[value] ?? 0)}
              </span>
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          {t("button.refresh")}
        </Button>
      </div>
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
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">{t("admin.droneIncidents.columns.code")}</th>
                  <th className="px-4 py-3">{t("admin.droneIncidents.columns.orderDrone")}</th>
                  <th className="px-4 py-3">{t("admin.droneIncidents.columns.incident")}</th>
                  <th className="px-4 py-3">{t("admin.droneIncidents.columns.recovery")}</th>
                  <th className="px-4 py-3">{t("admin.droneIncidents.columns.inspection")}</th>
                  <th className="px-4 py-3">{t("common.time")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {item.incidentCode}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {item.orderCode ?? `#${item.orderId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.droneCode}
                      </p>
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
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(item.id)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        {t("button.detail")}
                      </Button>
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

function Status({ value }: { value: string }) {
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
  const isSample = id === 999 || id === 998;
  const { data, isLoading } = useGetDroneIncidentQuery(id ?? 0, {
    skip: id == null || isSample,
    pollingInterval: 8_000,
  });
  const incident =
    (isSample ? SAMPLE_DRONE_INCIDENTS.find((i) => i.id === id) : data?.data) ??
    SAMPLE_DRONE_INCIDENTS.find((i) => i.id === id);
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
        <Info label={t("admin.droneIncidents.detail.gpsSource")} value={incident.gpsSource} />
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
        <p className="font-semibold">{t("admin.droneIncidents.detail.description")}</p>
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
              <span className="text-muted-foreground font-medium">Tọa độ KTV bấm xác nhận:</span>
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
              <span className="text-muted-foreground font-medium">Ghi chú hiện trường của KTV:</span>
              <p className="font-medium text-slate-800 italic">
                {incident.recoveryNote?.trim() ? `"${incident.recoveryNote}"` : "Không có ghi chú."}
              </p>
            </div>
          </div>
        </div>
      )}

      <AdminActions incident={incident} />
      <div>
        <h3 className="mb-3 font-semibold">
          {t("admin.droneIncidents.detail.evidence", { count: incident.evidence.length })}
        </h3>
        {incident.evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("admin.droneIncidents.detail.noEvidence")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {incident.evidence.map((item) => (
              <a
                key={item.id}
                href={item.secureUrl}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-lg border"
              >
                <img
                  src={item.secureUrl}
                  alt={item.caption ?? item.stage}
                  className="h-32 w-full object-cover"
                />
                <p className="p-2 text-xs">{item.caption ?? item.stage}</p>
              </a>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-3 font-semibold">{t("admin.droneIncidents.detail.history")}</h3>
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
          {t("admin.droneIncidents.detail.proposals", { count: incident.proposals.length })}
        </h3>
        {incident.proposals.map((proposal) => (
          <div key={proposal.id} className="mb-2 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <b>
                {t("admin.droneIncidents.detail.proposalVersion", { version: proposal.proposalVersion })} ·{" "}
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
                {t("admin.droneIncidents.detail.customerResponse", { note: proposal.customerResponseNote })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function AdminActions({ incident }: { incident: DroneParcelIncident }) {
  const { t } = useTranslation();
  const { data: users } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const raw = users?.data as unknown;
  const techs = useMemo(() => {
    type User = {
      id: number;
      fullName?: string;
      status?: string;
      roles?: string[];
    };
    const list: User[] = Array.isArray(raw)
      ? raw
      : ((raw as { content?: User[] } | undefined)?.content ?? []);
    return list.filter(
      (user) =>
        user.status === "ACTIVE" &&
        (user.roles ?? []).some((role) =>
          ["LOCKER_TECHNICIAN", "ROLE_LOCKER_TECHNICIAN"].includes(role),
        ),
    );
  }, [raw]);
  const [technicianId, setTechnicianId] = useState(
    incident.recoveryAssignedToUserId?.toString() ?? "",
  );
  const atHub = incident.parcelStatus === "RETURNED_TO_HUB";
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
  const [showProposalError, setShowProposalError] = useState(false);
  const [confirmHandover, setConfirmHandover] = useState(false);
  const [showDispatchMap, setShowDispatchMap] = useState(false);
  const [assign, assignState] = useAssignDroneRecoveryMutation();
  const [verify, verifyState] = useVerifyDroneRecoveryMutation();
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
    incident.recoveryStatus === "VERIFIED" && incident.recoveryOutcome === "FOUND";
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
      const data = (error as { data?: { code?: string; message?: string } })?.data;
      toast.error(
        (data?.code && INCIDENT_ERRORS[data.code] && t(INCIDENT_ERRORS[data.code])) ||
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
          refundShippingFee: false,
          overrideReason: overrideReason.trim() || undefined,
        }).unwrap(),
      t("admin.droneIncidents.actions.proposalSent"),
    );
    if (ok) setShowProposalError(false);
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold">{t("admin.droneIncidents.actions.recoveryTitle")}</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("admin.droneIncidents.actions.activeTechsOnly")}
        </p>

        {/* Nút mở bản đồ điều phối theo bán kính R */}
        <Button
          type="button"
          variant="outline"
          className="w-full mb-3 border-sky-300 text-sky-800 hover:bg-sky-50 flex items-center justify-center gap-1.5 text-xs font-semibold"
          onClick={() => setShowDispatchMap(true)}
        >
          <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" />
          Bản đồ điều phối tìm KTV theo bán kính R (Kiosk & Drone)
        </Button>

        <RecoveryDispatchMapModal
          open={showDispatchMap}
          onOpenChange={setShowDispatchMap}
          incident={incident}
          onAssigned={() => {
            // Sau khi gán qua modal, reset state
          }}
        />

        <div className="flex gap-2">
          <Select value={technicianId} onValueChange={setTechnicianId}>
            <SelectTrigger>
              <SelectValue placeholder={t("admin.droneIncidents.actions.selectTech")} />
            </SelectTrigger>
            <SelectContent>
              {techs.map((tech) => (
                <SelectItem key={tech.id} value={String(tech.id)}>
                  {tech.fullName ?? t("admin.droneIncidents.actions.techFallback", { id: tech.id })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!technicianId || assignState.isLoading}
            onClick={() =>
              handle(
                () =>
                  assign({
                    id: incident.id,
                    technicianId: Number(technicianId),
                  }).unwrap(),
                t("admin.droneIncidents.actions.assigned"),
              )
            }
          >
            {t("admin.droneIncidents.actions.assign")}
          </Button>
        </div>
        {incident.recoveryStatus === "SUBMITTED" && (
          <Button
            className="mt-3"
            variant="outline"
            disabled={verifyState.isLoading}
            onClick={() =>
              handle(
                () => verify(incident.id).unwrap(),
                t("admin.droneIncidents.actions.verified"),
              )
            }
          >
            {t("admin.droneIncidents.actions.verify")}
          </Button>
        )}
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
        onOpenChange={(open) => !handoverState.isLoading && setConfirmHandover(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.droneIncidents.actions.confirmHubTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.droneIncidents.actions.confirmHubDescription", {
                code: incident.orderCode ?? `#${incident.orderId}`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={handoverState.isLoading}>{t("common.cancel")}</AlertDialogCancel>
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
              {handoverState.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("button.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold">{t("admin.droneIncidents.actions.proposalTitle")}</h3>
        <div className="mt-3 space-y-2">
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
              <b className="text-foreground">{formatCurrency(suggested)}</b>
              {resolutionType !== "FREE_REDELIVERY" && String(suggested) !== amount && (
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
          <Input
            value={overrideReason}
            onChange={(event) => setOverrideReason(event.target.value)}
            placeholder={t("admin.droneIncidents.actions.overridePlaceholder")}
          />
          {showProposalError && proposalError && (
            <p className="text-xs text-red-600">{proposalError}</p>
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
    </div>
  );
}
