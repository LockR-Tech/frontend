import { useEffect, useState } from "react";
import { AppLoading } from "~/components/ui/app-loading";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  History,
  Info as InfoIcon,
  Loader2,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  PackageSearch,
  Phone,
  Plane,
  Radio,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency } from "~/lib/report-format";
import { Checkbox } from "~/components/ui/checkbox";
import {
  useGetDroneIncidentQuery,
  useVerifyDroneRecoveryMutation,
  useCreateDroneIncidentProposalMutation,
  useCompleteDroneIncidentRedeliveryMutation,
  useConfirmDroneIncidentReturnMutation,
  useApproveDroneIncidentCompensationMutation,
  type DroneParcelIncident,
} from "~/stores/apis/admin/droneIncidents";
import { useConfirmDroneParcelHubHandoverMutation } from "./hubHandoverApi";
import { distanceKm } from "../drone-orders/journey";
import {
  statusText,
  Status,
  IncidentOrderContext,
  suggestedCompensationOf,
  validateProposal,
  formatCompensationRate,
  REDELIVERY_TYPES,
  INCIDENT_ERRORS,
} from "./index";
import { RecoveryDispatchInlineMap } from "./RecoveryDispatchInlineMap";

// Bảng tra cứu trạng thái Sự cố rõ ràng bằng Tiếng Việt
function formatIncidentStatus(
  t: TFunction,
  status: string,
  recoveryStatus?: string,
): { label: string; className: string } {
  if (status === "AWAITING_ADMIN_REVIEW" && ["VERIFIED", "CLOSED"].includes(recoveryStatus ?? "")) {
    return { label: t("admin.droneIncidents.detailPage.incidentStatus.awaitingPlan"), className: "bg-amber-100 text-amber-800 border-amber-300" };
  }
  switch (status) {
    case "CLOSED":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.closed"), className: "bg-slate-100 text-slate-800 border-slate-300" };
    case "RESOLVED":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.resolved"), className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    case "RECOVERY_IN_PROGRESS":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.recoveryInProgress"), className: "bg-blue-100 text-blue-800 border-blue-300" };
    case "AWAITING_ADMIN_REVIEW":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.awaitingAdminReview"), className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "RESOLUTION_PROPOSED":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.resolutionProposed"), className: "bg-indigo-100 text-indigo-800 border-indigo-300" };
    case "AWAITING_CUSTOMER_RESPONSE":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.awaitingCustomerResponse"), className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "RESOLUTION_IN_PROGRESS":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.resolutionInProgress"), className: "bg-purple-100 text-purple-800 border-purple-300" };
    case "INVESTIGATING":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.investigating"), className: "bg-red-50 text-red-700 border-red-200" };
    case "EVIDENCE_PENDING":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.evidencePending"), className: "bg-amber-50 text-amber-800 border-amber-300" };
    case "DISPUTED":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.disputed"), className: "bg-red-100 text-red-800 border-red-300" };
    case "MANUAL_INTERVENTION_REQUIRED":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.manualInterventionRequired"), className: "bg-red-100 text-red-800 border-red-300" };
    case "REPORTED":
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.reported"), className: "bg-red-50 text-red-700 border-red-200" };
    default:
      return { label: t("admin.droneIncidents.detailPage.incidentStatus.other", { status }), className: "bg-slate-100 text-slate-800 border-slate-200" };
  }
}

// Bảng tra cứu trạng thái Tìm kiếm Thu hồi rõ ràng
function formatRecoveryStatus(t: TFunction, status: string): { label: string; className: string } {
  switch (status) {
    case "CLOSED":
      return { label: t("admin.droneIncidents.detailPage.recoveryStatus.closed"), className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    case "VERIFIED":
      return { label: t("admin.droneIncidents.detailPage.recoveryStatus.verified"), className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    case "SUBMITTED":
      return { label: t("admin.droneIncidents.detailPage.recoveryStatus.submitted"), className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "SEARCHING":
      return { label: t("admin.droneIncidents.detailPage.recoveryStatus.searching"), className: "bg-indigo-100 text-indigo-800 border-indigo-300" };
    case "ACCEPTED":
      return { label: t("admin.droneIncidents.detailPage.recoveryStatus.accepted"), className: "bg-blue-100 text-blue-800 border-blue-300" };
    case "ASSIGNED":
      return { label: t("admin.droneIncidents.detailPage.recoveryStatus.assigned"), className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "AWAITING_ASSIGNMENT":
      return { label: t("admin.droneIncidents.detailPage.recoveryStatus.awaitingAssignment"), className: "bg-amber-50 text-amber-800 border-amber-300" };
    case "OPEN":
      return { label: t("admin.droneIncidents.detailPage.recoveryStatus.open"), className: "bg-slate-100 text-slate-800 border-slate-300" };
    default:
      return { label: t("admin.droneIncidents.detailPage.recoveryStatus.other", { status }), className: "bg-slate-100 text-slate-800 border-slate-200" };
  }
}

// Bảng tra cứu tình trạng Kiện hàng rõ ràng
function formatParcelStatus(t: TFunction, status: string): { label: string; className: string } {
  switch (status) {
    case "RETURNED_TO_HUB":
      return { label: t("admin.droneIncidents.detailPage.parcelStatus.returnedToHub"), className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    case "DROP_REPORTED":
      return { label: t("admin.droneIncidents.detailPage.parcelStatus.dropReported"), className: "bg-red-100 text-red-800 border-red-300" };
    case "SEARCHING":
      return { label: t("admin.droneIncidents.detailPage.parcelStatus.searching"), className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "FOUND":
      return { label: t("admin.droneIncidents.detailPage.parcelStatus.found"), className: "bg-sky-100 text-sky-800 border-sky-300" };
    case "DAMAGED":
      return { label: t("admin.droneIncidents.detailPage.parcelStatus.damaged"), className: "bg-red-100 text-red-800 border-red-300" };
    case "LOST":
      return { label: t("admin.droneIncidents.detailPage.parcelStatus.lost"), className: "bg-red-200 text-red-900 border-red-400" };
    case "REDELIVERING":
      return { label: t("admin.droneIncidents.detailPage.parcelStatus.redelivering"), className: "bg-indigo-100 text-indigo-800 border-indigo-300" };
    case "REDELIVERED":
      return { label: t("admin.droneIncidents.detailPage.parcelStatus.redelivered"), className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    default:
      return { label: t("admin.droneIncidents.detailPage.parcelStatus.other", { status }), className: "bg-slate-100 text-slate-800 border-slate-200" };
  }
}

// Bảng dịch chi tiết Dòng thời gian Tiếng Việt để lên trước (giữ khoá i18n, dịch lúc render)
const RETURN_FLIGHT_LABEL_KEYS: Record<string, string> = {
  RETURN_REQUESTED: "admin.droneIncidents.detailPage.returnFlight.returnRequested",
  COMMAND_ACCEPTED: "admin.droneIncidents.detailPage.returnFlight.commandAccepted",
  RETURNING: "admin.droneIncidents.detailPage.returnFlight.returning",
  COMPLETED: "admin.droneIncidents.detailPage.returnFlight.completed",
  FAILED: "admin.droneIncidents.detailPage.returnFlight.failed",
  MANUAL_INTERVENTION_REQUIRED: "admin.droneIncidents.detailPage.returnFlight.manualInterventionRequired",
};

const TIMELINE_EVENT_INFO: Record<
  string,
  { labelKey: string; descriptionKey?: string }
> = {
  INCIDENT_REPORTED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.incidentReported.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.incidentReported.description",
  },
  RETURN_REQUEST: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.returnRequest.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.returnRequest.description",
  },
  RETURN_FLIGHT_UPDATED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.returnFlightUpdated.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.returnFlightUpdated.description",
  },
  RECOVERY_ASSIGNED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoveryAssigned.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoveryAssigned.description",
  },
  RECOVERY_ACCEPTED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoveryAccepted.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoveryAccepted.description",
  },
  RECOVERY_SEARCHING: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoverySearching.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoverySearching.description",
  },
  RECOVERY_SUBMITTED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoverySubmitted.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoverySubmitted.description",
  },
  RECOVERY_VERIFIED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoveryVerified.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoveryVerified.description",
  },
  RECOVERY_STATION_DISPATCHED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoveryStationDispatched.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoveryStationDispatched.description",
  },
  RECOVERY_STATION_UNAVAILABLE: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoveryStationUnavailable.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoveryStationUnavailable.description",
  },
  RECOVERY_TICKETS_UNAVAILABLE: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoveryTicketsUnavailable.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoveryTicketsUnavailable.description",
  },
  PARCEL_RETURNED_TO_HUB: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.parcelReturnedToHub.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.parcelReturnedToHub.description",
  },
  PROPOSAL_CREATED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.proposalCreated.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.proposalCreated.description",
  },
  PROPOSAL_ACCEPTED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.proposalAccepted.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.proposalAccepted.description",
  },
  PROPOSAL_DISPUTED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.proposalDisputed.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.proposalDisputed.description",
  },
  REDELIVERY_STARTED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.redeliveryStarted.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.redeliveryStarted.description",
  },
  REDELIVERY_COMPLETED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.redeliveryCompleted.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.redeliveryCompleted.description",
  },
  COMPENSATION_APPROVED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.compensationApproved.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.compensationApproved.description",
  },
  COMPENSATION_PAID: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.compensationPaid.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.compensationPaid.description",
  },
  RECOVERY_ACCEPT: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoveryAccepted.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoveryAccepted.description",
  },
  RECOVERY_START_SEARCHING: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.recoverySearching.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.recoveryStartSearching.description",
  },
  RESOLUTION_PROPOSED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.resolutionProposed.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.resolutionProposed.description",
  },
  CUSTOMER_ACCEPT: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.customerAccept.label",
  },
  CUSTOMER_REQUEST_REVIEW: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.proposalDisputed.label",
  },
  REDELIVERY_REQUESTED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.redeliveryRequested.label",
  },
  REDELIVERY_INTEGRATION_UNAVAILABLE: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.redeliveryIntegrationUnavailable.label",
  },
  COMPENSATION_SUBMITTED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.compensationSubmitted.label",
  },
  COMPENSATION_PAYMENT_FAILED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.compensationPaymentFailed.label",
  },
  RETURN_FLIGHT_CONFIRMED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.returnFlightConfirmed.label",
  },
  INCIDENT_RESOLVED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.incidentResolved.label",
  },
  INCIDENT_CLOSED: {
    labelKey: "admin.droneIncidents.detailPage.timeline.events.incidentClosed.label",
    descriptionKey: "admin.droneIncidents.detailPage.timeline.events.incidentClosed.description",
  },
};

export default function DroneIncidentDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const incidentId = Number(id);

  const { data, isLoading, isFetching, refetch } = useGetDroneIncidentQuery(
    incidentId || 0,
    {
      skip: !incidentId,
      pollingInterval: 10_000,
    },
  );

  const incident = data?.data;

  // Các mutations xử lý nghiệp vụ
  const [verify, verifyState] = useVerifyDroneRecoveryMutation();
  const [completeRedelivery, completeRedeliveryState] =
    useCompleteDroneIncidentRedeliveryMutation();
  const [confirmReturn, confirmReturnState] = useConfirmDroneIncidentReturnMutation();
  const [propose, proposalState] = useCreateDroneIncidentProposalMutation();
  const [approveCompensation, approvalState] =
    useApproveDroneIncidentCompensationMutation();
  const [handover, handoverState] = useConfirmDroneParcelHubHandoverMutation();

  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [confirmHandover, setConfirmHandover] = useState(false);

  const atHub = incident?.parcelStatus === "RETURNED_TO_HUB";
  const badlyDamaged = ["MAJOR_DAMAGE", "UNUSABLE"].includes(incident?.parcelCondition ?? "");
  const canRedeliver = atHub && !badlyDamaged;
  const redeliveryHint = badlyDamaged
    ? t("admin.droneIncidents.detailPage.hints.badlyDamaged")
    : t("admin.droneIncidents.detailPage.hints.needsHub");
  const suggested = incident ? suggestedCompensationOf(incident) : null;
  const [resolutionType, setResolutionType] = useState<string>(
    canRedeliver ? "FREE_REDELIVERY" : "COMPENSATION_ONLY",
  );
  const [amount, setAmount] = useState<string>(
    canRedeliver ? "0" : suggested != null && suggested > 0 ? String(suggested) : "",
  );
  const [overrideReason, setOverrideReason] = useState("");
  const [refundShippingFee, setRefundShippingFee] = useState<boolean>(true);
  const [showProposalError, setShowProposalError] = useState(false);

  useEffect(() => {
    if (incident?.refundShippingFeeAllowed !== undefined) {
      setRefundShippingFee(incident.refundShippingFeeAllowed);
    }
  }, [incident?.refundShippingFeeAllowed]);

  const proposalError = incident
    ? validateProposal(t, incident, resolutionType, amount, overrideReason)
    : null;

  const handleAction = async (action: () => Promise<unknown>, successMsg: string) => {
    try {
      await action();
      toast.success(successMsg);
      refetch();
      return true;
    } catch (error) {
      if (incident?.id === 999 || incident?.id === 998) {
        toast.success(t("admin.droneIncidents.detailPage.toast.demoSuffix", { message: successMsg }));
        return true;
      }
      const errData = (error as { data?: { code?: string; message?: string } })?.data;
      toast.error(
        (errData?.code && INCIDENT_ERRORS[errData.code] && t(INCIDENT_ERRORS[errData.code])) ||
          errData?.message ||
          t("admin.droneIncidents.detailPage.toast.actionFailed"),
      );
      return false;
    }
  };

  const submitProposal = async () => {
    if (!incident) return;
    setShowProposalError(true);
    if (proposalError) return;
    const ok = await handleAction(
      () =>
        propose({
          id: incident.id,
          resolutionType,
          redeliveryOffered: REDELIVERY_TYPES.has(resolutionType),
          compensationAmount: Number(amount) || 0,
          refundShippingFee:
            resolutionType === "FREE_REDELIVERY" ? false : refundShippingFee,
          overrideReason: overrideReason.trim() || undefined,
          // Thỏa thuận riêng: ghi chú là nội dung khách đọc trước khi đồng ý.
          resolutionNote:
            resolutionType === "MANUAL_RESOLUTION"
              ? overrideReason.trim() || undefined
              : undefined,
        }).unwrap(),
      t("admin.droneIncidents.detailPage.toast.proposalSent"),
    );
    if (ok) {
      setShowProposalError(false);
      setOverrideReason("");
    }
  };

  if (isLoading && !incident) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <AppLoading size={120} message={t("admin.droneIncidents.detailPage.loading")} />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="space-y-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin/drone-incidents")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("admin.droneIncidents.detailPage.notFound.backToList")}
        </Button>
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-3 opacity-80" />
          <h2 className="text-lg font-bold text-slate-900">{t("admin.droneIncidents.detailPage.notFound.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin.droneIncidents.detailPage.notFound.description", { id })}
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate("/admin/drone-incidents")}
          >
            {t("admin.droneIncidents.detailPage.notFound.back")}
          </Button>
        </Card>
      </div>
    );
  }

  const isTechAccepted = !["OPEN", "AWAITING_ASSIGNMENT", "ASSIGNED"].includes(
    incident.recoveryStatus,
  );
  const canAssign = !isTechAccepted;
  const canHandover =
    incident.recoveryStatus === "VERIFIED" && incident.recoveryOutcome === "FOUND";

  const incStatus = formatIncidentStatus(t, incident.status, incident.recoveryStatus);
  const recStatus = formatRecoveryStatus(t, incident.recoveryStatus);
  const prcStatus = formatParcelStatus(t, incident.parcelStatus);
  // Nơi nhận kiện: "trạm <tên>" khi đã điều phối trạm bay, ngược lại "Hub"
  const stationPlace = incident.recoveryStationName
    ? t("admin.droneIncidents.detailPage.place.station", { name: incident.recoveryStationName })
    : "Hub";
  const returnFlightLabelKey = RETURN_FLIGHT_LABEL_KEYS[incident.returnFlightStatus];
  const returnFlightLabel = returnFlightLabelKey
    ? t(returnFlightLabelKey)
    : (incident.returnFlightStatus ?? "—");

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header trên cùng: Nút quay lại, Mã đầy đủ và 3 Trạng thái phân định rõ ràng */}
      <div className="space-y-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/drone-incidents")}
            className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("admin.droneIncidents.detailPage.header.backToIncidents")}</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 text-red-600 shadow-2xs shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl font-mono">
                  {t("admin.droneIncidents.detailPage.header.incidentCode", { code: incident.incidentCode })}
                </h1>
                <Badge variant="outline" className="font-sans text-[11px] bg-slate-50 text-slate-600">
                  ID #{incident.id}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("admin.droneIncidents.detailPage.header.reportedAt")} <span className="font-medium text-slate-700">{formatDateTime(incident.createdAt)}</span>
              </p>
            </div>
          </div>

          {/* 3 Trạng thái có nhãn phân định rõ ràng, không còn bare tags khó hiểu */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`px-3 py-1 font-semibold text-xs border ${incStatus.className}`}
            >
              {incStatus.label}
            </Badge>
            <Badge
              variant="outline"
              className={`px-3 py-1 font-semibold text-xs border ${recStatus.className}`}
            >
              {recStatus.label}
            </Badge>
            <Badge
              variant="outline"
              className={`px-3 py-1 font-semibold text-xs border ${prcStatus.className}`}
            >
              {prcStatus.label}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs h-8 ml-1"
              title={t("admin.droneIncidents.detailPage.header.refresh")}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Top Quick Links Banner */}
      {/* <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs text-sky-950">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <InfoIcon className="h-4 w-4 text-sky-600 shrink-0" />
            <span>Đơn hàng liên quan:</span>
            <Link
              to={`/admin/orders/${incident.orderId}`}
              className="font-mono font-bold text-sky-900 hover:text-sky-700 underline inline-flex items-center gap-1"
            >
              {incident.orderCode ?? `#${incident.orderId}`}
              <ExternalLink className="h-3 w-3 inline text-sky-600" />
            </Link>
          </div>
          <span className="text-sky-300 font-bold">·</span>
          <div className="flex items-center gap-1.5">
            <Plane className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            <span>Hành trình bay:</span>
            <Link
              to={`/admin/drone-orders/${incident.orderId}`}
              className="font-mono font-bold text-sky-900 hover:text-sky-700 underline inline-flex items-center gap-1"
            >
              {incident.missionId ? `#HT-${incident.missionId}` : `#HT-${incident.orderId}`}
              <ExternalLink className="h-3 w-3 inline text-sky-600" />
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {incident.inspectionReportId && (
            <Link
              to={`/admin/maintenance?reportId=${incident.inspectionReportId}`}
              className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900 hover:underline bg-white px-2.5 py-1 rounded-md border border-sky-200 shadow-2xs"
            >
              Phiếu kiểm tra drone #{incident.inspectionReportId}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}

          <Link
            to={`/admin/orders/${incident.orderId}`}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs"
          >
            Chi tiết đơn hàng #{incident.orderId}
            <ExternalLink className="h-3 w-3" />
          </Link>

          <Link
            to={`/admin/drone-orders/${incident.orderId}`}
            className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 hover:underline bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs"
          >
            Chi tiết hành trình bay
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div> */}

      {/* 3. Top 4 KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Vị trí rơi & Drone */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-red-500" />
                {t("admin.droneIncidents.detailPage.kpi.dropTitle")}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {incident.droneCode}
              </Badge>
            </div>
            <div>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {incident.dropLatitude != null
                  ? `${incident.dropLatitude.toFixed(6)}, ${incident.dropLongitude?.toFixed(6)}`
                  : t("admin.droneIncidents.detailPage.kpi.noCoordinates")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("admin.droneIncidents.detailPage.kpi.gpsTelemetry", { source: incident.gpsSource })}{" "}
                <span className={incident.telemetryStale ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                  {incident.telemetryStale
                    ? t("admin.droneIncidents.detailPage.kpi.stale")
                    : t("admin.droneIncidents.detailPage.kpi.online")}
                </span>
              </p>
            </div>
            {incident.dropLatitude != null && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${incident.dropLatitude}&mlon=${incident.dropLongitude}#map=17/${incident.dropLatitude}/${incident.dropLongitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 pt-1"
              >
                {t("admin.droneIncidents.detailPage.kpi.openOsm")}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* KPI 2: Kỹ thuật viên tìm hàng */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-sky-600" />
                {t("admin.droneIncidents.detailPage.kpi.techTitle")}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  isTechAccepted
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : incident.recoveryStatus === "ASSIGNED"
                      ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                }`}
              >
                {isTechAccepted
                  ? t("admin.droneIncidents.detailPage.kpi.techAccepted")
                  : incident.recoveryStatus === "ASSIGNED"
                    ? t("admin.droneIncidents.detailPage.kpi.techAwaitingAccept")
                    : t("common.unassigned")}
              </Badge>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm truncate">
                {incident.recoveryTechnicianName ||
                  (incident.recoveryAssignedToUserId
                    ? t("admin.droneIncidents.actions.techFallback", { id: incident.recoveryAssignedToUserId })
                    : t("common.unassigned"))}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {incident.recoveryTechnicianRole === "DRONE_TECHNICIAN"
                  ? t("admin.droneIncidents.detailPage.kpi.roleDrone")
                  : incident.recoveryTechnicianRole
                    ? t("admin.droneIncidents.detailPage.kpi.roleLocker")
                    : incident.recoveryStatus === "ASSIGNED"
                      ? t("admin.droneIncidents.detailPage.kpi.waitingAccept")
                      : t("admin.droneIncidents.detailPage.kpi.waitingDispatch")}
              </p>
            </div>
            {incident.recoveryTechnicianPhone ? (
              <a
                href={`tel:${incident.recoveryTechnicianPhone}`}
                className="text-xs text-slate-700 hover:text-slate-900 hover:underline font-mono inline-flex items-center gap-1 pt-1"
              >
                <Phone className="h-3 w-3 text-slate-400" />
                {incident.recoveryTechnicianPhone}
              </a>
            ) : (
              <span className="text-[11px] text-muted-foreground italic">{t("admin.droneIncidents.detailPage.kpi.noPhone")}</span>
            )}
          </CardContent>
        </Card>

        {/* KPI 3: Kiện hàng & Hub */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-purple-600" />
                {t("admin.droneIncidents.detailPage.kpi.parcelTitle")}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {incident.parcelCondition || t("admin.droneIncidents.detailPage.unknown")}
              </Badge>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                {incident.recoveryOutcome === "FOUND"
                  ? t("admin.droneIncidents.detailPage.kpi.parcelFound")
                  : incident.recoveryOutcome === "NOT_FOUND"
                    ? t("admin.droneIncidents.detailPage.kpi.parcelNotFound")
                    : t("admin.droneIncidents.detailPage.kpi.searching")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {incident.returnedToHubAt
                  ? t("admin.droneIncidents.detailPage.kpi.returnedAt", {
                      place: incident.recoveryStationName ?? "Hub",
                      time: formatDateTime(incident.returnedToHubAt),
                    })
                  : incident.recoveryStationName
                    ? t("admin.droneIncidents.detailPage.kpi.awaitingHandoverAt", { station: incident.recoveryStationName })
                    : t("admin.droneIncidents.detailPage.kpi.notHandedOver")}
              </p>
            </div>
            <div className="pt-1">
              <span className="text-xs text-slate-600 font-medium">
                {t("admin.droneIncidents.detailPage.kpi.returnFlight", { status: returnFlightLabel })}
              </span>
              {["RETURN_REQUESTED", "COMMAND_ACCEPTED", "RETURNING", "FAILED", "MANUAL_INTERVENTION_REQUIRED"].includes(
                incident.returnFlightStatus,
              ) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1.5 h-7 w-full text-[11px]"
                  disabled={confirmReturnState.isLoading}
                  onClick={() =>
                    handleAction(
                      () => confirmReturn({ id: incident.id }).unwrap(),
                      t("admin.droneIncidents.detailPage.toast.returnConfirmed"),
                    )
                  }
                >
                  {t("admin.droneIncidents.detailPage.kpi.confirmReturn")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Giá trị & Bồi thường */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                {t("admin.droneIncidents.detailPage.kpi.compensationTitle")}
              </span>
              {incident.compensationRate != null && (
                <Badge
                  variant="outline"
                  className="bg-sky-50 text-sky-800 border-sky-300 text-[10px] font-bold"
                >
                  {formatCompensationRate(incident.compensationRate)}
                </Badge>
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                {t("admin.droneIncidents.detailPage.kpi.suggested", { amount: formatCurrency(suggested) })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("admin.droneIncidents.detailPage.kpi.declared", { amount: formatCurrency(incident.declaredValue ?? 0) })}
              </p>
            </div>
            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("admin.droneIncidents.detailPage.kpi.status")}</span>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {incident.compensationStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Thông tin Đơn hàng & Khách hàng (Hiển thị đầy đủ 4 card chi tiết) */}
      <IncidentOrderContext
        orderId={incident.orderId}
        inspectionReportId={incident.inspectionReportId}
      />

      {/* 5. ĐIỀU PHỐI TÌM KIẾM THỦ CÔNG HOẶC THÔNG TIN KTV ĐÃ NHẬN NHIỆM VỤ */}
      {isTechAccepted ? (
        <Card className="border-emerald-200 shadow-2xs bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="bg-emerald-50/80 border-b border-emerald-100 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-emerald-950 flex items-center gap-2">
                    {t("admin.droneIncidents.detailPage.tech.title")}
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      {incident.recoveryStatus === "SEARCHING"
                        ? t("admin.droneIncidents.detailPage.tech.badgeSearching")
                        : incident.recoveryStatus === "SUBMITTED"
                          ? t("admin.droneIncidents.detailPage.tech.badgeSubmitted")
                          : incident.recoveryStatus === "VERIFIED"
                            ? t("admin.droneIncidents.detailPage.tech.badgeVerified")
                            : incident.recoveryStatus === "CLOSED"
                              ? t("admin.droneIncidents.detailPage.tech.badgeClosed")
                              : t("admin.droneIncidents.detailPage.tech.badgeAccepted")}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-800">
                    {t("admin.droneIncidents.detailPage.tech.description")}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white text-xs">
                {t("admin.droneIncidents.detailPage.header.incidentCode", { code: incident.incidentCode })}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-2xs space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">{t("admin.droneIncidents.detailPage.tech.name")}</span>
                <p className="font-bold text-slate-900 text-sm">
                  {incident.recoveryTechnicianName ||
                    t("admin.droneIncidents.actions.techFallback", { id: incident.recoveryAssignedToUserId })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-2xs space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">{t("admin.droneIncidents.detailPage.tech.phone")}</span>
                <p className="font-bold text-slate-900 text-sm font-mono">
                  {incident.recoveryTechnicianPhone || t("admin.droneIncidents.detailPage.tech.notUpdated")}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-2xs space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">{t("admin.droneIncidents.detailPage.tech.specialty")}</span>
                <p className="font-bold text-slate-900 text-sm">
                  {incident.recoveryTechnicianRole === "DRONE_TECHNICIAN"
                    ? t("admin.droneIncidents.detailPage.tech.roleDrone")
                    : incident.recoveryTechnicianRole === "LOCKER_TECHNICIAN"
                      ? t("admin.droneIncidents.detailPage.tech.roleLocker")
                      : incident.recoveryTechnicianRole || t("admin.droneIncidents.detailPage.tech.roleGeneric")}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-2xs space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">{t("admin.droneIncidents.detailPage.tech.recoveryStatus")}</span>
                <p className="font-bold text-emerald-700 text-sm">
                  {recStatus.label}
                </p>
              </div>
            </div>

            {/* Bước xác minh kết quả tìm hàng từ KTV (SUBMITTED) */}
            {incident.recoveryStatus === "SUBMITTED" && (
              <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                  <span className="font-bold text-sm text-amber-950">
                    {t("admin.droneIncidents.detailPage.verify.title")}
                  </span>
                  <Badge className="bg-amber-600 text-white text-[10px]">
                    {t("admin.droneIncidents.detailPage.verify.badge")}
                  </Badge>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  {t("admin.droneIncidents.detailPage.verify.intro")}
                </p>
                <ul className="text-xs text-amber-950 space-y-1 list-disc list-inside">
                  <li>{t("admin.droneIncidents.detailPage.verify.checkPhotos")}</li>
                  <li>{t("admin.droneIncidents.detailPage.verify.checkGps")}</li>
                  <li>
                    <Trans
                      i18nKey="admin.droneIncidents.detailPage.verify.checkCondition"
                      values={{
                        condition: incident.parcelCondition || t("admin.droneIncidents.detailPage.unknown"),
                      }}
                      components={{ b: <b /> }}
                    />
                  </li>
                </ul>
                <p className="text-[11px] text-muted-foreground italic">
                  {t("admin.droneIncidents.detailPage.verify.footnote")}
                </p>
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                  disabled={verifyState.isLoading}
                  onClick={() => setShowVerifyConfirm(true)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("admin.droneIncidents.detailPage.verify.button")}
                </Button>
              </div>
            )}

            {/* Trạm bay hệ thống điều phối kiện về lúc admin xác minh (gần nơi tìm thấy nhất còn drone) */}
            {incident.recoveryStationName && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  incident.recoveryStationDroneAvailable === false
                    ? "border-amber-300 bg-amber-50/70 text-amber-950"
                    : "border-indigo-200 bg-indigo-50/60 text-indigo-950"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {t("admin.droneIncidents.detailPage.station.title", { name: incident.recoveryStationName })}
                  </span>
                  {incident.recoveryStationLatitude != null && incident.recoveryStationLongitude != null && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${incident.recoveryStationLatitude},${incident.recoveryStationLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline"
                    >
                      {t("admin.droneIncidents.detailPage.station.directions")} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {incident.recoveryStationAddress && <p>{incident.recoveryStationAddress}</p>}
                <p className="text-[11px] opacity-80">
                  {incident.recoveryStationDistanceM != null
                    ? `${t("admin.droneIncidents.detailPage.station.distance", {
                        km: (incident.recoveryStationDistanceM / 1000).toFixed(1),
                      })} · `
                    : ""}
                  {incident.recoveryStationDroneAvailable === false
                    ? t("admin.droneIncidents.detailPage.station.noDrone")
                    : t("admin.droneIncidents.detailPage.station.droneReady")}
                  {incident.recoveryStationDispatchedAt
                    ? ` · ${t("admin.droneIncidents.detailPage.station.dispatchedAt", {
                        time: formatDateTime(incident.recoveryStationDispatchedAt),
                      })}`
                    : ""}
                </p>
              </div>
            )}

            {/* Nút bàn giao về Hub khi đã xác minh */}
            {atHub ? (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-950 flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  {incident.returnedToHubAt
                    ? t("admin.droneIncidents.detailPage.hub.arrivedAt", {
                        place: incident.recoveryStationName
                          ? stationPlace
                          : t("admin.droneIncidents.detailPage.place.hubStation"),
                        time: formatDateTime(incident.returnedToHubAt),
                      })
                    : t("admin.droneIncidents.detailPage.hub.arrived")}
                </span>
              </div>
            ) : canHandover ? (
              <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/70 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950 flex items-center gap-1.5">
                    <PackageCheck className="h-4 w-4 text-sky-600" />
                    {t("admin.droneIncidents.detailPage.hub.confirmTitle", { place: stationPlace })}
                  </span>
                  <Button
                    size="sm"
                    disabled={handoverState.isLoading}
                    onClick={() => setConfirmHandover(true)}
                    className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {t("admin.droneIncidents.detailPage.hub.confirmButton", { place: stationPlace })}
                  </Button>
                </div>
                <p className="text-sky-800 text-[11px]">
                  {t("admin.droneIncidents.detailPage.hub.confirmHint", { place: stationPlace })}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        /* KTV CHƯA BẤM NHẬN NHIỆM VỤ -> ADMIN CÓ QUYỀN ĐIỀU PHỐI / PHÂN CÔNG THỦ CÔNG */
        <div className="space-y-4">
          {/* Thông báo tình trạng điều phối hiện tại */}
          {incident.recoveryStatus === "ASSIGNED" ? (
            <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 text-xs text-amber-950 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-200 text-amber-900 shrink-0">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-amber-950">
                        {t("admin.droneIncidents.detailPage.dispatch.waitingTitle")}
                      </span>
                      <Badge className="bg-amber-600 text-white text-[10px]">
                        {t("admin.droneIncidents.detailPage.dispatch.notAccepted")}
                      </Badge>
                    </div>
                    <p className="text-amber-900 text-xs">
                      {t("admin.droneIncidents.detailPage.dispatch.assignedTech")}{" "}
                      <b className="text-slate-900 font-semibold">
                        {incident.recoveryTechnicianName ||
                          t("admin.droneIncidents.actions.techFallback", { id: incident.recoveryAssignedToUserId })}
                      </b>
                      {incident.recoveryTechnicianPhone && (
                        <span className="font-mono text-slate-700 ml-1">
                          ({incident.recoveryTechnicianPhone})
                        </span>
                      )}
                      {" — "}
                      <span className="italic text-amber-800">
                        {t("admin.droneIncidents.detailPage.dispatch.reassignHint")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs text-sky-950 flex items-center gap-3 shadow-2xs">
              <div className="p-2 rounded-lg bg-sky-200 text-sky-800 shrink-0">
                <Navigation className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-sky-950 text-sm">{t("admin.droneIncidents.detailPage.dispatch.noTechTitle")}</p>
                <p className="text-sky-800 text-xs mt-0.5">
                  {t("admin.droneIncidents.detailPage.dispatch.noTechHint")}
                </p>
              </div>
            </div>
          )}

          {/* Bản đồ phân công / điều phối thủ công */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="bg-slate-50/70 border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-bold text-slate-900">
                    {incident.recoveryStatus === "ASSIGNED"
                      ? t("admin.droneIncidents.detailPage.dispatch.mapTitleReassign")
                      : t("admin.droneIncidents.detailPage.dispatch.mapTitle")}
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-xs">
                {t("admin.droneIncidents.detailPage.dispatch.mapDescription")}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <RecoveryDispatchInlineMap
                incident={incident}
                onAssigned={() => refetch()}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal xác nhận Admin Review */}
      <AlertDialog
        open={showVerifyConfirm}
        onOpenChange={(open) => !verifyState.isLoading && setShowVerifyConfirm(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              {t("admin.droneIncidents.detailPage.verifyDialog.title", { code: incident.incidentCode })}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <p>
                <Trans
                  i18nKey="admin.droneIncidents.detailPage.verifyDialog.intro"
                  components={{ b: <b /> }}
                />
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>{t("admin.droneIncidents.detailPage.verifyDialog.effectFound")}</li>
                <li>
                  <Trans
                    i18nKey="admin.droneIncidents.detailPage.verifyDialog.effectStatus"
                    components={{ b: <b /> }}
                  />
                </li>
                <li>{t("admin.droneIncidents.detailPage.verifyDialog.effectHandover")}</li>
                <li>{t("admin.droneIncidents.detailPage.verifyDialog.effectUnlock")}</li>
              </ul>
              <p className="font-semibold text-slate-900 pt-1">
                {t("admin.droneIncidents.detailPage.verifyDialog.question")}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={verifyState.isLoading}>
              {t("admin.droneIncidents.detailPage.verifyDialog.review")}
            </AlertDialogCancel>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={verifyState.isLoading}
              onClick={async () => {
                const ok = await handleAction(
                  () => verify(incident.id).unwrap(),
                  t("admin.droneIncidents.detailPage.toast.verified"),
                );
                if (ok) setShowVerifyConfirm(false);
              }}
            >
              {verifyState.isLoading && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              {t("admin.droneIncidents.detailPage.verifyDialog.approve")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal xác nhận bàn giao Hub */}
      <AlertDialog
        open={confirmHandover}
        onOpenChange={(open) => !handoverState.isLoading && setConfirmHandover(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.droneIncidents.detailPage.handoverDialog.title", { place: stationPlace })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.droneIncidents.detailPage.handoverDialog.description", {
                order: incident.orderCode ?? `#${incident.orderId}`,
                place: stationPlace,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={handoverState.isLoading}>
              {t("button.cancel")}
            </AlertDialogCancel>
            <Button
              disabled={handoverState.isLoading}
              onClick={async () => {
                const ok = await handleAction(
                  () => handover(incident.id).unwrap(),
                  t("admin.droneIncidents.detailPage.toast.handoverConfirmed"),
                );
                if (ok) setConfirmHandover(false);
              }}
            >
              {t("admin.droneIncidents.detailPage.handoverDialog.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 6. Hai cột: Trái = Báo cáo hiện trường & Bằng chứng; Phải = Xử lý phương án bồi thường & Lịch sử */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (6 / 12): Báo cáo hiện trường & Bằng chứng */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card: Báo cáo hiện trường từ KTV */}
          <Card className="border-slate-200 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-base font-bold text-slate-900">
                    {t("admin.droneIncidents.detailPage.report.title")}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="bg-white text-xs">
                    {t("admin.droneIncidents.detailPage.report.outcome", {
                      outcome: incident.recoveryOutcome ?? t("admin.droneIncidents.detailPage.unknown"),
                    })}
                  </Badge>
                  {incident.parcelCondition && (
                    <Badge variant="secondary" className="text-xs">
                      {incident.parcelCondition}
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs">
                {t("admin.droneIncidents.detailPage.report.description")}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border bg-slate-50/50 space-y-1.5">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    {t("admin.droneIncidents.detailPage.report.confirmedCoords")}
                  </span>
                  <p className="font-mono font-bold text-slate-900 text-sm">
                    {incident.recoveredLatitude != null
                      ? `${incident.recoveredLatitude.toFixed(6)}, ${incident.recoveredLongitude?.toFixed(6)}`
                      : t("admin.droneIncidents.detailPage.report.noConfirmedCoords")}
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
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                isNear
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {isNear ? "✓ " : "⚠️ "}
                              {t("admin.droneIncidents.detailPage.report.deviation", { meters: deltaMeters })}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                </div>

                <div className="p-3 rounded-lg border bg-slate-50/50 space-y-1.5">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    {t("admin.droneIncidents.detailPage.report.techNote")}
                  </span>
                  <p className="font-medium text-slate-800 italic text-xs leading-relaxed">
                    {incident.recoveryNote?.trim()
                      ? `"${incident.recoveryNote}"`
                      : t("admin.droneIncidents.detailPage.report.noNote")}
                  </p>
                </div>
              </div>

              {/* Bằng chứng hình ảnh tại hiện trường */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  {t("admin.droneIncidents.detailPage.report.evidenceTitle", { count: incident.evidence.length })}
                </h4>

                {incident.evidence.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3 rounded-lg border border-dashed bg-slate-50">
                    {t("admin.droneIncidents.detailPage.report.noEvidence")}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {incident.evidence.map((item) => {
                      const imageUrl = item.secureUrl || item.url || "";
                      return (
                        <a
                          key={item.id}
                          href={imageUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative overflow-hidden rounded-xl border bg-slate-100 shadow-2xs hover:shadow-md transition-all block"
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.caption ?? item.stage}
                              className="h-32 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="h-32 w-full flex items-center justify-center bg-slate-200 text-slate-400 text-xs">
                              {t("admin.droneIncidents.detailPage.report.noImage")}
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                            <p className="text-[11px] font-medium truncate">
                              {item.caption || item.stage || t("admin.droneIncidents.detailPage.report.photoFallback")}
                            </p>
                            <p className="text-[9px] text-slate-300">
                              {formatDateTime(item.createdAt)}
                            </p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* DÒNG THỜI GIAN SỰ CỐ (TIẾNG VIỆT ĐỂ TRƯỚC) */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-bold text-slate-900">
                  {t("admin.droneIncidents.detailPage.timeline.title", { count: incident.timeline.length })}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {incident.timeline.map((item) => {
                const info = TIMELINE_EVENT_INFO[item.eventType];
                const labelVi = info ? t(info.labelKey) : item.eventType.replaceAll("_", " ");
                return (
                  <div
                    key={item.id}
                    className="relative flex items-start gap-3 pl-2 before:absolute before:left-[11px] before:top-6 before:bottom-0 before:w-0.5 before:bg-slate-200 last:before:hidden"
                  >
                    <div className="h-5 w-5 rounded-full bg-sky-100 border-2 border-sky-500 flex items-center justify-center shrink-0 z-10">
                      <div className="h-2 w-2 rounded-full bg-sky-600" />
                    </div>
                    <div className="flex-1 rounded-lg border bg-slate-50/50 p-2.5 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Tiếng Việt để trước và làm nổi bật */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {labelVi}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono bg-white px-1.5 py-0.5 rounded border">
                            {item.eventType}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-slate-700 leading-relaxed italic text-[11px]">
                          "{item.note}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* CỘT PHẢI (6 / 12): Xử lý Phương án bồi thường & Lịch sử đề xuất */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card Cấu hình bồi thường 8 quy tắc từ Hệ thống */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="bg-slate-50/70 border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    {t("admin.droneIncidents.detailPage.policy.title")}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      incident.incidentPolicyEnabled !== false
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-red-50 text-red-800 border-red-300"
                    }`}
                  >
                    {t("admin.droneIncidents.detailPage.policy.status", {
                      state:
                        incident.incidentPolicyEnabled !== false
                          ? t("admin.droneIncidents.detailPage.policy.on")
                          : t("admin.droneIncidents.detailPage.policy.off"),
                    })}
                  </Badge>
                  <Link
                    to="/admin/settings"
                    target="_blank"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    {t("admin.droneIncidents.detailPage.policy.settingsLink")}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              <CardDescription className="text-xs">
                {t("admin.droneIncidents.detailPage.policy.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-50 border">
                  <span className="text-muted-foreground block text-[10px]">{t("admin.droneIncidents.detailPage.policy.rate")}</span>
                  <span className="font-bold text-slate-800">
                    {formatCompensationRate(incident.compensationRate)}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <span className="text-muted-foreground block text-[10px]">{t("admin.droneIncidents.detailPage.policy.cap")}</span>
                  <span className="font-bold text-slate-800">
                    {incident.compensationCap && incident.compensationCap > 0
                      ? formatCurrency(incident.compensationCap)
                      : t("admin.droneIncidents.detailPage.policy.noCap")}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <span className="text-muted-foreground block text-[10px]">{t("admin.droneIncidents.detailPage.policy.sla")}</span>
                  <span className="font-bold text-slate-800">
                    {t("admin.droneIncidents.detailPage.policy.hours", { hours: incident.recoverySlaHours ?? 4 })}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <span className="text-muted-foreground block text-[10px]">{t("admin.droneIncidents.detailPage.policy.approval")}</span>
                  <span className="font-bold text-slate-800">
                    {incident.approvalRequired !== false
                      ? t("admin.droneIncidents.detailPage.policy.approvalRequired")
                      : t("admin.droneIncidents.detailPage.policy.approvalAuto")}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 border-t pt-2">
                <span>
                  {t("admin.droneIncidents.detailPage.policy.parcelValue")} <b>{formatCurrency(incident.declaredValue ?? 0)}</b>
                </span>
                <span>
                  {t("admin.droneIncidents.detailPage.policy.suggested")}{" "}
                  <b className="text-emerald-700">{formatCurrency(suggested)}</b>
                </span>
                <span>
                  {t("admin.droneIncidents.detailPage.policy.freeRedelivery")}{" "}
                  <b className="text-slate-800">
                    {incident.freeRedeliveryAllowed !== false
                      ? t("admin.droneIncidents.detailPage.policy.allowedAtHub")
                      : t("admin.droneIncidents.detailPage.policy.disabled")}
                  </b>
                </span>
                <span>
                  {t("admin.droneIncidents.detailPage.policy.refundShipping")}{" "}
                  <b className="text-slate-800">
                    {incident.refundShippingFeeAllowed !== false ? t("common.yes") : t("common.no")}
                  </b>
                </span>
                <span>
                  {t("admin.droneIncidents.detailPage.policy.dispute")}{" "}
                  <b className="text-slate-800">
                    {incident.disputeAllowed !== false ? t("common.yes") : t("common.no")}
                  </b>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card: Xử lý phương án bồi thường & giao lại */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="bg-slate-50/70 border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base font-bold text-slate-900">
                    {t("admin.droneIncidents.detailPage.proposal.title")}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300 text-xs font-bold">
                  {t("admin.droneIncidents.detailPage.proposal.rate", {
                    rate: formatCompensationRate(incident.compensationRate),
                  })}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {t("admin.droneIncidents.detailPage.proposal.description")}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5">
              {/* Đang chờ khách / khách đã đồng ý: không cho gửi thêm phiên bản (test 2026-10-29 form vẫn mở
                  sau khi khách đồng ý, dễ gửi nhầm phiên bản 2). */}
              {!["AWAITING_CUSTOMER_RESPONSE", "RESOLUTION_IN_PROGRESS", "RESOLVED", "CLOSED"].includes(
                incident.status,
              ) ? (
              <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {t("admin.droneIncidents.detailPage.proposal.typeLabel")}
                </label>
                <Select
                  value={resolutionType}
                  onValueChange={(val) => {
                    setResolutionType(val);
                    setShowProposalError(true);
                    setRefundShippingFee(
                      REDELIVERY_TYPES.has(val) ? false : incident.refundShippingFeeAllowed !== false,
                    );
                    if (val === "FREE_REDELIVERY") {
                      setAmount("0");
                    } else if (amount.trim() === "" || Number(amount) === 0) {
                      setAmount(suggested != null && suggested > 0 ? String(suggested) : "");
                    }
                  }}
                >
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE_REDELIVERY" className="text-xs" disabled={!canRedeliver}>
                      {t("admin.droneIncidents.resolution.freeRedelivery")} {!canRedeliver && redeliveryHint}
                    </SelectItem>
                    <SelectItem value="REDELIVERY_PARTIAL_COMPENSATION" className="text-xs" disabled={!canRedeliver}>
                      {t("admin.droneIncidents.resolution.redeliveryPartialCompensation")} {!canRedeliver && redeliveryHint}
                    </SelectItem>
                    <SelectItem value="COMPENSATION_ONLY" className="text-xs">
                      {t("admin.droneIncidents.resolution.compensationOnly")}
                    </SelectItem>
                    <SelectItem value="MANUAL_RESOLUTION" className="text-xs">
                      {t("admin.droneIncidents.resolution.manualResolution")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded bg-slate-50 border p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                {resolutionType === "FREE_REDELIVERY" && (
                  <p>{t("admin.droneIncidents.detailPage.proposal.explainFree")}</p>
                )}
                {resolutionType === "REDELIVERY_PARTIAL_COMPENSATION" && (
                  <p>{t("admin.droneIncidents.detailPage.proposal.explainPartial")}</p>
                )}
                {resolutionType === "COMPENSATION_ONLY" && (
                  <p>{t("admin.droneIncidents.detailPage.proposal.explainCompensation")}</p>
                )}
                {resolutionType === "MANUAL_RESOLUTION" && (
                  <p>{t("admin.droneIncidents.detailPage.proposal.explainManual")}</p>
                )}
              </div>

              {/* Mức tiền bồi thường */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {t("admin.droneIncidents.detailPage.proposal.amountLabel")}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={amount}
                  disabled={resolutionType === "FREE_REDELIVERY"}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setShowProposalError(true);
                  }}
                  placeholder={t("admin.droneIncidents.detailPage.proposal.amountPlaceholder")}
                  className="text-xs"
                />
                {suggested != null && (
                  <p className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {t("admin.droneIncidents.detailPage.proposal.suggestedByPolicy", {
                      rate: formatCompensationRate(incident.compensationRate),
                    })}{" "}
                    <b className="text-emerald-700">{formatCurrency(suggested)}</b>
                    {resolutionType !== "FREE_REDELIVERY" && String(suggested) !== amount && (
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={() => setAmount(String(suggested))}
                      >
                        {t("admin.droneIncidents.detailPage.proposal.useSuggested")}
                      </button>
                    )}
                  </p>
                )}
              </div>

              {/* Tuỳ chọn hoàn phí giao hàng khi bồi thường (Quy tắc 5 BE) */}
              {resolutionType !== "FREE_REDELIVERY" && (
                <div className="flex items-center space-x-2 rounded border bg-slate-50/70 p-2.5 text-xs">
                  <Checkbox
                    id="detailRefundShippingFee"
                    checked={refundShippingFee}
                    onCheckedChange={(checked) => setRefundShippingFee(Boolean(checked))}
                  />
                  <label
                    htmlFor="detailRefundShippingFee"
                    className="text-xs font-medium text-slate-800 cursor-pointer select-none leading-none"
                  >
                    {t("admin.droneIncidents.detailPage.proposal.refundShipping")}
                    <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">
                      {t("admin.droneIncidents.detailPage.proposal.refundShippingHint")}
                    </span>
                  </label>
                </div>
              )}

              {/* Lý do vượt mức / Ghi chú */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {t("admin.droneIncidents.detailPage.proposal.noteLabel")}
                </label>
                <Input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={
                    resolutionType === "MANUAL_RESOLUTION"
                      ? t("admin.droneIncidents.detailPage.proposal.notePlaceholderManual")
                      : t("admin.droneIncidents.detailPage.proposal.notePlaceholder")
                  }
                  className="text-xs"
                />
              </div>

              {showProposalError && proposalError && (
                <p className="text-xs text-red-600 font-medium">{proposalError}</p>
              )}

              <Button
                className="w-full text-xs font-semibold"
                disabled={
                  !["VERIFIED", "CLOSED"].includes(incident.recoveryStatus) ||
                  proposalState.isLoading ||
                  (showProposalError && proposalError != null)
                }
                onClick={() => void submitProposal()}
              >
                {proposalState.isLoading && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {t("admin.droneIncidents.detailPage.proposal.submit")}
              </Button>
              </>
              ) : (
                <p className="rounded border bg-slate-50 p-2.5 text-xs text-slate-600">
                  {incident.status === "AWAITING_CUSTOMER_RESPONSE"
                    ? t("admin.droneIncidents.detailPage.proposal.awaitingCustomer")
                    : t("admin.droneIncidents.detailPage.proposal.customerChose")}
                </p>
              )}

              {/* Tiến trình giao lại nếu khách đã đồng ý */}
              {["PREPARING", "IN_PROGRESS"].includes(incident.redeliveryStatus) && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-indigo-600" />
                      {t("admin.droneIncidents.detailPage.redelivery.title")}
                    </span>
                    <Badge className="bg-indigo-600 text-white text-[10px]">
                      {t("admin.droneIncidents.detailPage.redelivery.badge")}
                    </Badge>
                  </div>
                  {incident.redeliveryOrderId && (
                    <div className="flex items-center justify-between bg-white/90 p-2 rounded border border-indigo-100 text-xs text-indigo-950">
                      <span className="text-muted-foreground">{t("admin.droneIncidents.detailPage.redelivery.newOrder")}</span>
                      <Link
                        to={`/admin/drone-orders?orderId=${incident.redeliveryOrderId}`}
                        className="font-mono font-bold text-indigo-700 underline flex items-center gap-1 hover:text-indigo-900"
                      >
                        {t("admin.droneIncidents.detailPage.redelivery.orderLink", { id: incident.redeliveryOrderId })}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                  <p className="text-xs text-indigo-900">
                    {t("admin.droneIncidents.detailPage.redelivery.hint")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-indigo-300 text-indigo-800 text-xs gap-1.5 font-semibold"
                    disabled={completeRedeliveryState.isLoading}
                    onClick={() =>
                      handleAction(
                        () => completeRedelivery(incident.id).unwrap(),
                        t("admin.droneIncidents.detailPage.toast.redeliveryCompleted"),
                      )
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t("admin.droneIncidents.detailPage.redelivery.complete")}
                  </Button>
                </div>
              )}

              {/* Duyệt bồi thường nếu cần chi trả */}
              {["AWAITING_APPROVAL", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(
                incident.compensationStatus,
              ) && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs font-semibold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                    disabled={approvalState.isLoading}
                    onClick={() =>
                      handleAction(
                        () => approveCompensation(incident.id).unwrap(),
                        t("admin.droneIncidents.detailPage.toast.compensationApproved"),
                      )
                    }
                  >
                    {incident.compensationStatus === "AWAITING_APPROVAL"
                      ? t("admin.droneIncidents.detailPage.compensation.approve")
                      : t("admin.droneIncidents.detailPage.compensation.retry")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Lịch sử đề xuất phương án đã gửi cho khách */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-bold text-slate-900">
                    {t("admin.droneIncidents.detailPage.history.title", { count: incident.proposals.length })}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {incident.proposals.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">
                  {t("admin.droneIncidents.detailPage.history.empty")}
                </p>
              ) : (
                incident.proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="rounded-xl border bg-slate-50/50 p-3.5 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        {t("admin.droneIncidents.detail.proposalVersion", {
                          version: proposal.version ?? proposal.proposalVersion,
                        })}{" "}
                        ·{" "}
                        {proposal.resolutionType.replaceAll("_", " ")}
                      </span>
                      <Status value={proposal.status} />
                    </div>

                    <div className="p-2 rounded bg-white border text-[11px] text-slate-700">
                      {t("admin.droneIncidents.detailPage.history.amount")}{" "}
                      <b className="text-emerald-700">
                        {formatCurrency(proposal.compensationAmount ?? 0)}
                      </b>
                      {proposal.policyVersion &&
                        ` · ${t("admin.droneIncidents.detailPage.history.policy", { version: proposal.policyVersion })}`}
                    </div>

                    {proposal.resolutionNote && (
                      <div className="p-2 rounded bg-white border text-[11px] text-slate-700">
                        <b>{t("admin.droneIncidents.detailPage.history.sentToCustomer")}</b> {proposal.resolutionNote}
                      </div>
                    )}

                    {proposal.customerResponseNote && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                        <b>{t("admin.droneIncidents.detailPage.history.customerResponse")}</b> "{proposal.customerResponseNote}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
