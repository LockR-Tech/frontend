import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  status: string,
  recoveryStatus?: string,
): { label: string; className: string } {
  if (status === "AWAITING_ADMIN_REVIEW" && ["VERIFIED", "CLOSED"].includes(recoveryStatus ?? "")) {
    return { label: "Sự cố: Chờ lập phương án", className: "bg-amber-100 text-amber-800 border-amber-300" };
  }
  switch (status) {
    case "CLOSED":
      return { label: "Sự cố: Đã đóng", className: "bg-slate-100 text-slate-800 border-slate-300" };
    case "RESOLVED":
      return { label: "Sự cố: Đã giải quyết", className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    case "RECOVERY_IN_PROGRESS":
      return { label: "Sự cố: Đang thu hồi kiện", className: "bg-blue-100 text-blue-800 border-blue-300" };
    case "AWAITING_ADMIN_REVIEW":
      return { label: "Sự cố: Chờ Admin xác minh", className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "RESOLUTION_PROPOSED":
      return { label: "Sự cố: Đã đề xuất phương án", className: "bg-indigo-100 text-indigo-800 border-indigo-300" };
    case "AWAITING_CUSTOMER_RESPONSE":
      return { label: "Sự cố: Chờ khách phản hồi", className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "RESOLUTION_IN_PROGRESS":
      return { label: "Sự cố: Đang thực hiện phương án", className: "bg-purple-100 text-purple-800 border-purple-300" };
    case "INVESTIGATING":
      return { label: "Sự cố: Đang điều phối thu hồi", className: "bg-red-50 text-red-700 border-red-200" };
    case "EVIDENCE_PENDING":
      return { label: "Sự cố: Chờ bổ sung bằng chứng", className: "bg-amber-50 text-amber-800 border-amber-300" };
    case "DISPUTED":
      return { label: "Sự cố: Khách khiếu nại", className: "bg-red-100 text-red-800 border-red-300" };
    case "MANUAL_INTERVENTION_REQUIRED":
      return { label: "Sự cố: Cần can thiệp", className: "bg-red-100 text-red-800 border-red-300" };
    case "REPORTED":
      return { label: "Sự cố: Mới báo rơi", className: "bg-red-50 text-red-700 border-red-200" };
    default:
      return { label: `Sự cố: ${status}`, className: "bg-slate-100 text-slate-800 border-slate-200" };
  }
}

// Bảng tra cứu trạng thái Tìm kiếm Thu hồi rõ ràng
function formatRecoveryStatus(status: string): { label: string; className: string } {
  switch (status) {
    case "CLOSED":
      return { label: "Thu hồi: Hoàn tất thu hồi", className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    case "VERIFIED":
      return { label: "Thu hồi: Admin đã xác minh", className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    case "SUBMITTED":
      return { label: "Thu hồi: Chờ Admin duyệt", className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "SEARCHING":
      return { label: "Thu hồi: KTV đang tìm thực địa", className: "bg-indigo-100 text-indigo-800 border-indigo-300" };
    case "ACCEPTED":
      return { label: "Thu hồi: KTV đã tiếp nhận", className: "bg-blue-100 text-blue-800 border-blue-300" };
    case "ASSIGNED":
      return { label: "Thu hồi: Đã phân công (Chờ KTV nhận)", className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "AWAITING_ASSIGNMENT":
      return { label: "Thu hồi: Chờ phân công KTV", className: "bg-amber-50 text-amber-800 border-amber-300" };
    case "OPEN":
      return { label: "Thu hồi: Chờ xử lý", className: "bg-slate-100 text-slate-800 border-slate-300" };
    default:
      return { label: `Thu hồi: ${status}`, className: "bg-slate-100 text-slate-800 border-slate-200" };
  }
}

// Bảng tra cứu tình trạng Kiện hàng rõ ràng
function formatParcelStatus(status: string): { label: string; className: string } {
  switch (status) {
    case "RETURNED_TO_HUB":
      return { label: "Kiện hàng: Đã về kho Hub", className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    case "DROP_REPORTED":
      return { label: "Kiện hàng: Rơi tại hiện trường", className: "bg-red-100 text-red-800 border-red-300" };
    case "SEARCHING":
      return { label: "Kiện hàng: Đang tìm kiếm", className: "bg-amber-100 text-amber-800 border-amber-300" };
    case "FOUND":
      return { label: "Kiện hàng: Đã tìm thấy", className: "bg-sky-100 text-sky-800 border-sky-300" };
    case "DAMAGED":
      return { label: "Kiện hàng: Hư hại tại hiện trường", className: "bg-red-100 text-red-800 border-red-300" };
    case "LOST":
      return { label: "Kiện hàng: Thất lạc", className: "bg-red-200 text-red-900 border-red-400" };
    case "REDELIVERING":
      return { label: "Kiện hàng: Đang giao lại", className: "bg-indigo-100 text-indigo-800 border-indigo-300" };
    case "REDELIVERED":
      return { label: "Kiện hàng: Đã giao lại thành công", className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    default:
      return { label: `Kiện hàng: ${status}`, className: "bg-slate-100 text-slate-800 border-slate-200" };
  }
}

// Bảng dịch chi tiết Dòng thời gian Tiếng Việt để lên trước
const RETURN_FLIGHT_LABELS: Record<string, string> = {
  RETURN_REQUESTED: "Đã yêu cầu quay về",
  COMMAND_ACCEPTED: "Drone đã nhận lệnh",
  RETURNING: "Đang bay về trạm",
  COMPLETED: "Đã về trạm",
  FAILED: "Quay về thất bại",
  MANUAL_INTERVENTION_REQUIRED: "Cần đưa drone về tay",
};

const TIMELINE_EVENT_INFO: Record<
  string,
  { labelVi: string; description?: string }
> = {
  INCIDENT_REPORTED: {
    labelVi: "Báo cáo sự cố rơi kiện",
    description: "Hệ thống ghi nhận sự cố rơi kiện từ drone",
  },
  RETURN_REQUEST: {
    labelVi: "Yêu cầu drone quay về trạm (RTL)",
    description: "Kích hoạt chế độ Return-to-Launch cho drone",
  },
  RETURN_FLIGHT_UPDATED: {
    labelVi: "Drone đang bay về trạm (RTL)",
    description: "Cập nhật hành trình bay khẩn cấp về trạm hạ cánh an toàn",
  },
  RECOVERY_ASSIGNED: {
    labelVi: "Phân công KTV tìm kiếm",
    description: "Hệ thống hoặc Quản trị viên điều phối KTV tiếp nhận tìm kiếm",
  },
  RECOVERY_ACCEPTED: {
    labelVi: "KTV tiếp nhận nhiệm vụ",
    description: "Kỹ thuật viên đã nhận lệnh tìm kiếm thực địa",
  },
  RECOVERY_SEARCHING: {
    labelVi: "Bắt đầu tìm kiếm thực địa",
    description: "Kỹ thuật viên tới hiện trường và tiến hành quét tìm kiện",
  },
  RECOVERY_SUBMITTED: {
    labelVi: "KTV nộp báo cáo hiện trường",
    description: "KTV xác nhận toạ độ thực tế và tải ảnh bằng chứng",
  },
  RECOVERY_VERIFIED: {
    labelVi: "Admin duyệt xác minh hiện trường",
    description: "Quản trị viên đã kiểm tra toạ độ và đối soát kết quả tìm kiếm",
  },
  RECOVERY_STATION_DISPATCHED: {
    labelVi: "Điều phối kiện về trạm bay",
    description: "Hệ thống chọn trạm gần nơi tìm thấy nhất còn drone để bay giao lại",
  },
  RECOVERY_STATION_UNAVAILABLE: {
    labelVi: "Chưa điều phối được trạm",
    description: "Không trạm bay nào nhận được kiện — admin điều phối tay",
  },
  RECOVERY_TICKETS_UNAVAILABLE: {
    labelVi: "Chưa tạo được phiếu thu hồi",
    description: "Hệ thống tủ chưa phản hồi — admin phân công KTV thu hồi bằng tay",
  },
  PARCEL_RETURNED_TO_HUB: {
    labelVi: "Bàn giao kiện hàng về trạm",
    description: "Kiện hàng đã được KTV vận chuyển về trạm / Hub an toàn",
  },
  PROPOSAL_CREATED: {
    labelVi: "Tạo đề xuất phương án xử lý",
    description: "Đã gửi đề xuất bồi thường / giao lại cho khách hàng",
  },
  PROPOSAL_ACCEPTED: {
    labelVi: "Khách hàng đồng ý phương án",
    description: "Khách xác nhận chấp thuận phương án giải quyết",
  },
  PROPOSAL_DISPUTED: {
    labelVi: "Khách yêu cầu xem xét lại",
    description: "Khách khiếu nại hoặc từ chối phương án bồi thường",
  },
  REDELIVERY_STARTED: {
    labelVi: "Bắt đầu giao lại kiện cho khách",
    description: "Kiện hàng xuất kho Hub để giao lại tới tủ nhận",
  },
  REDELIVERY_COMPLETED: {
    labelVi: "Hoàn tất giao lại kiện thành công",
    description: "Khách hàng đã nhận lại kiện hàng an toàn",
  },
  COMPENSATION_APPROVED: {
    labelVi: "Duyệt chi trả hoàn tiền bồi thường",
    description: "Admin phê duyệt tạo phiếu hoàn tiền bồi thường",
  },
  COMPENSATION_PAID: {
    labelVi: "Hoàn tiền bồi thường thành công",
    description: "Hệ thống đã chuyển khoản bồi thường vào tài khoản khách",
  },
  RECOVERY_ACCEPT: {
    labelVi: "KTV tiếp nhận nhiệm vụ",
    description: "Kỹ thuật viên đã nhận lệnh tìm kiếm thực địa",
  },
  RECOVERY_START_SEARCHING: {
    labelVi: "Bắt đầu tìm kiếm thực địa",
    description: "Kỹ thuật viên tới hiện trường và tiến hành tìm kiện",
  },
  RESOLUTION_PROPOSED: {
    labelVi: "Gửi phương án cho khách",
    description: "Đề xuất bồi thường / giao lại đã gửi cho khách",
  },
  CUSTOMER_ACCEPT: {
    labelVi: "Khách đồng ý phương án",
  },
  CUSTOMER_REQUEST_REVIEW: {
    labelVi: "Khách yêu cầu xem xét lại",
  },
  REDELIVERY_REQUESTED: {
    labelVi: "Tạo đơn giao lại",
  },
  REDELIVERY_INTEGRATION_UNAVAILABLE: {
    labelVi: "Chưa tạo được đơn giao lại",
  },
  COMPENSATION_SUBMITTED: {
    labelVi: "Tạo phiếu chi bồi thường",
  },
  COMPENSATION_PAYMENT_FAILED: {
    labelVi: "Chi bồi thường không thành công",
  },
  RETURN_FLIGHT_CONFIRMED: {
    labelVi: "Xác nhận drone đã về trạm",
  },
  INCIDENT_RESOLVED: {
    labelVi: "Hoàn tất xử lý sự cố",
  },
  INCIDENT_CLOSED: {
    labelVi: "Đóng hồ sơ sự cố",
    description: "Toàn bộ quy trình xử lý sự cố rơi kiện đã kết thúc",
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
  const suggested = incident ? suggestedCompensationOf(incident) : null;
  const [resolutionType, setResolutionType] = useState<string>(
    atHub ? "FREE_REDELIVERY" : "COMPENSATION_ONLY",
  );
  const [amount, setAmount] = useState<string>(
    atHub ? "0" : suggested != null && suggested > 0 ? String(suggested) : "",
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
        toast.success(`${successMsg} (Dữ liệu demo)`);
        return true;
      }
      const errData = (error as { data?: { code?: string; message?: string } })?.data;
      toast.error(
        (errData?.code && INCIDENT_ERRORS[errData.code] && t(INCIDENT_ERRORS[errData.code])) ||
          errData?.message ||
          "Thao tác thất bại. Vui lòng thử lại!",
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
      "Đã gửi đề xuất phương án bồi thường cho khách hàng!",
    );
    if (ok) {
      setShowProposalError(false);
      setOverrideReason("");
    }
  };

  if (isLoading && !incident) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải thông tin sự cố rơi kiện...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="space-y-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin/drone-incidents")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Danh sách sự cố drone
        </Button>
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-3 opacity-80" />
          <h2 className="text-lg font-bold text-slate-900">Không tìm thấy sự cố</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Mã sự cố #{id} không tồn tại hoặc bạn không có quyền truy cập.
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate("/admin/drone-incidents")}
          >
            Quay lại danh sách
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

  const incStatus = formatIncidentStatus(incident.status, incident.recoveryStatus);
  const recStatus = formatRecoveryStatus(incident.recoveryStatus);
  const prcStatus = formatParcelStatus(incident.parcelStatus);

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
            <span>Quay lại danh sách sự cố</span>
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
                  Mã sự cố: {incident.incidentCode}
                </h1>
                <Badge variant="outline" className="font-sans text-[11px] bg-slate-50 text-slate-600">
                  ID #{incident.id}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Thời điểm báo rơi: <span className="font-medium text-slate-700">{formatDateTime(incident.createdAt)}</span>
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
              title="Làm mới dữ liệu"
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
                Vị trí rơi & Drone
              </span>
              <Badge variant="outline" className="text-[10px]">
                {incident.droneCode}
              </Badge>
            </div>
            <div>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {incident.dropLatitude != null
                  ? `${incident.dropLatitude.toFixed(6)}, ${incident.dropLongitude?.toFixed(6)}`
                  : "Chưa có toạ độ"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Nguồn GPS: {incident.gpsSource} · Telemetry:{" "}
                <span className={incident.telemetryStale ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                  {incident.telemetryStale ? "Dữ liệu cũ" : "Trực tuyến"}
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
                Mở bản đồ OpenStreetMap
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
                KTV tìm hàng
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
                  ? "KTV đã nhận việc"
                  : incident.recoveryStatus === "ASSIGNED"
                    ? "Chờ KTV bấm nhận"
                    : "Chưa phân công"}
              </Badge>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm truncate">
                {incident.recoveryTechnicianName ||
                  (incident.recoveryAssignedToUserId
                    ? `KTV #${incident.recoveryAssignedToUserId}`
                    : "Chưa phân công")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {incident.recoveryTechnicianRole === "DRONE_TECHNICIAN"
                  ? "🚁 KTV Drone (Không bận đơn)"
                  : incident.recoveryTechnicianRole
                    ? "🏢 KTV Kiosk / Tủ (GPS gần điểm rơi)"
                    : incident.recoveryStatus === "ASSIGNED"
                      ? "Đang chờ KTV bấm nhận việc"
                      : "Đang chờ điều phối KTV"}
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
              <span className="text-[11px] text-muted-foreground italic">Chưa có số điện thoại</span>
            )}
          </CardContent>
        </Card>

        {/* KPI 3: Kiện hàng & Hub */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-purple-600" />
                Kiện hàng & Hub
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {incident.parcelCondition || "Chưa rõ"}
              </Badge>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                {incident.recoveryOutcome === "FOUND"
                  ? "Đã tìm thấy kiện"
                  : incident.recoveryOutcome === "NOT_FOUND"
                    ? "Không tìm thấy kiện"
                    : "Đang tìm kiếm"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {incident.returnedToHubAt
                  ? `Về ${incident.recoveryStationName ?? "Hub"} lúc: ${formatDateTime(incident.returnedToHubAt)}`
                  : incident.recoveryStationName
                    ? `Chờ bàn giao tại trạm ${incident.recoveryStationName}`
                    : "Chưa bàn giao về Hub"}
              </p>
            </div>
            <div className="pt-1">
              <span className="text-xs text-slate-600 font-medium">
                Quay về: {RETURN_FLIGHT_LABELS[incident.returnFlightStatus] ?? incident.returnFlightStatus ?? "—"}
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
                      "Đã xác nhận drone về trạm",
                    )
                  }
                >
                  Xác nhận drone đã về trạm
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
                Mức bồi thường
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
                Đề xuất: {formatCurrency(suggested)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Khai báo: {formatCurrency(incident.declaredValue ?? 0)}
              </p>
            </div>
            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Trạng thái:</span>
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
                    Kỹ thuật viên phụ trách thu hồi kiện
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      {incident.recoveryStatus === "SEARCHING"
                        ? "Đang tìm kiếm thực địa"
                        : incident.recoveryStatus === "SUBMITTED"
                          ? "Đã nộp kết quả tìm hàng"
                          : incident.recoveryStatus === "VERIFIED"
                            ? "Đã xác minh thu hồi"
                            : incident.recoveryStatus === "CLOSED"
                              ? "Đã bàn giao về Hub"
                              : "KTV đã tiếp nhận nhiệm vụ"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-800">
                    KTV đã bấm nhận nhiệm vụ và đang tiến hành quy trình tìm kiếm / thu hồi kiện hàng. Phân công thủ công đã được khóa.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white text-xs">
                Mã sự cố: {incident.incidentCode}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-2xs space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Họ tên KTV:</span>
                <p className="font-bold text-slate-900 text-sm">
                  {incident.recoveryTechnicianName || `KTV #${incident.recoveryAssignedToUserId}`}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-2xs space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Số điện thoại liên hệ:</span>
                <p className="font-bold text-slate-900 text-sm font-mono">
                  {incident.recoveryTechnicianPhone || "Chưa cập nhật"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-2xs space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Chuyên môn:</span>
                <p className="font-bold text-slate-900 text-sm">
                  {incident.recoveryTechnicianRole === "DRONE_TECHNICIAN"
                    ? "KTV Drone"
                    : incident.recoveryTechnicianRole === "LOCKER_TECHNICIAN"
                      ? "KTV Kiosk / Tủ"
                      : incident.recoveryTechnicianRole || "Kỹ thuật viên"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-2xs space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Trạng thái thu hồi:</span>
                <p className="font-bold text-emerald-700 text-sm">
                  {formatRecoveryStatus(incident.recoveryStatus).label}
                </p>
              </div>
            </div>

            {/* Bước xác minh kết quả tìm hàng từ KTV (SUBMITTED) */}
            {incident.recoveryStatus === "SUBMITTED" && (
              <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3">
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
                  KTV đã nộp báo cáo hiện trường. Quản trị viên cần đối soát các mục sau trước khi xác minh:
                </p>
                <ul className="text-xs text-amber-950 space-y-1 list-disc list-inside">
                  <li>Kiểm tra hình ảnh hiện trường và hiện trạng gói hàng thực tế.</li>
                  <li>Đối soát toạ độ GPS xác nhận từ điện thoại KTV so với toạ độ rơi.</li>
                  <li>
                    Xác nhận tình trạng kiện: <b>{incident.parcelCondition || "Chưa rõ"}</b>.
                  </li>
                </ul>
                <p className="text-[11px] text-muted-foreground italic">
                  * Sau khi bấm Duyệt xác minh, kiện hàng được mở khoá để KTV bàn giao về Hub và hệ thống cho phép tạo phương án bồi thường / giao lại cho khách.
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
                    Trạm nhận kiện: {incident.recoveryStationName}
                  </span>
                  {incident.recoveryStationLatitude != null && incident.recoveryStationLongitude != null && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${incident.recoveryStationLatitude},${incident.recoveryStationLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline"
                    >
                      Chỉ đường <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {incident.recoveryStationAddress && <p>{incident.recoveryStationAddress}</p>}
                <p className="text-[11px] opacity-80">
                  {incident.recoveryStationDistanceM != null
                    ? `Cách nơi tìm thấy ~${(incident.recoveryStationDistanceM / 1000).toFixed(1)} km · `
                    : ""}
                  {incident.recoveryStationDroneAvailable === false
                    ? "Trạm đang hết drone sẵn sàng — kiện chờ drone tại trạm."
                    : "Trạm còn drone sẵn sàng — đơn giao lại sẽ bay từ trạm này."}
                  {incident.recoveryStationDispatchedAt
                    ? ` · Điều phối lúc ${formatDateTime(incident.recoveryStationDispatchedAt)}`
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
                    ? `Kiện hàng đã về ${incident.recoveryStationName ? `trạm ${incident.recoveryStationName}` : "trạm Hub"} an toàn lúc: ${formatDateTime(incident.returnedToHubAt)}`
                    : "Kiện hàng đã được bàn giao an toàn về trạm Hub."}
                </span>
              </div>
            ) : canHandover ? (
              <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/70 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950 flex items-center gap-1.5">
                    <PackageCheck className="h-4 w-4 text-sky-600" />
                    Xác nhận bàn giao kiện về {incident.recoveryStationName ? `trạm ${incident.recoveryStationName}` : "Hub"}
                  </span>
                  <Button
                    size="sm"
                    disabled={handoverState.isLoading}
                    onClick={() => setConfirmHandover(true)}
                    className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    Xác nhận kiện đã về {incident.recoveryStationName ? `trạm ${incident.recoveryStationName}` : "Hub"}
                  </Button>
                </div>
                <p className="text-sky-800 text-[11px]">
                  Kiện hàng đã được KTV vận chuyển về {incident.recoveryStationName ? `trạm ${incident.recoveryStationName}` : "Hub"}. Bấm xác nhận để mở khoá phương án giao lại miễn phí cho khách hàng.
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
                        Đang chờ KTV bấm nhận nhiệm vụ
                      </span>
                      <Badge className="bg-amber-600 text-white text-[10px]">
                        Chưa nhận
                      </Badge>
                    </div>
                    <p className="text-amber-900 text-xs">
                      Hệ thống đã chỉ định KTV:{" "}
                      <b className="text-slate-900 font-semibold">
                        {incident.recoveryTechnicianName || `KTV #${incident.recoveryAssignedToUserId}`}
                      </b>
                      {incident.recoveryTechnicianPhone && (
                        <span className="font-mono text-slate-700 ml-1">
                          ({incident.recoveryTechnicianPhone})
                        </span>
                      )}
                      {" — "}
                      <span className="italic text-amber-800">
                        KTV chưa bấm xác nhận nhận việc. Quản trị viên có toàn quyền phân công lại cho KTV khác bên dưới nếu KTV này bận.
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
                <p className="font-bold text-sky-950 text-sm">Chưa có kỹ thuật viên tìm hàng</p>
                <p className="text-sky-800 text-xs mt-0.5">
                  Vui lòng quan sát vị trí các kỹ thuật viên trên bản đồ bên dưới và bấm trực tiếp vào KTV gần nhất để phân công tìm kiếm.
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
                      ? "Phân công lại kỹ thuật viên tìm kiếm (Bản đồ tương tác)"
                      : "Điều phối tìm kiếm & Phân công kỹ thuật viên (Bản đồ tương tác)"}
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-xs">
                Bản đồ hiển thị các điểm vị trí và tên kỹ thuật viên quanh điểm rơi. Admin bấm trực tiếp vào KTV trên bản đồ hoặc danh sách để phân công.
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
              Xác nhận kết quả tìm hàng ({incident.incidentCode})
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <p>
                Bạn đang thực hiện bước <b>Xác minh kết quả tìm hàng (Admin Review)</b>. Bước này có ý nghĩa:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Xác nhận KTV đã tìm thấy kiện tại thực địa với toạ độ và hình ảnh đối soát hợp lệ.</li>
                <li>Chuyển trạng thái tìm hàng sang <b>ĐÃ XÁC MINH (VERIFIED)</b>.</li>
                <li>Cho phép KTV vận chuyển kiện hàng bàn giao về Hub.</li>
                <li>Mở khoá chức năng tạo phương án xử lý bồi thường / giao lại cho khách hàng.</li>
              </ul>
              <p className="font-semibold text-slate-900 pt-1">
                Bạn đã kiểm tra kỹ hình ảnh hiện trường và toạ độ check-in chưa?
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
                const ok = await handleAction(
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

      {/* Modal xác nhận bàn giao Hub */}
      <AlertDialog
        open={confirmHandover}
        onOpenChange={(open) => !handoverState.isLoading && setConfirmHandover(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận kiện hàng đã về {incident.recoveryStationName ? `trạm ${incident.recoveryStationName}` : "Hub"}</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn kiện hàng của đơn {incident.orderCode ?? `#${incident.orderId}`} đã được vận chuyển an toàn về {incident.recoveryStationName ? `trạm ${incident.recoveryStationName}` : "Hub"} không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={handoverState.isLoading}>
              Hủy
            </AlertDialogCancel>
            <Button
              disabled={handoverState.isLoading}
              onClick={async () => {
                const ok = await handleAction(
                  () => handover(incident.id).unwrap(),
                  "Đã xác nhận kiện hàng về Hub thành công!",
                );
                if (ok) setConfirmHandover(false);
              }}
            >
              Xác nhận về Hub
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
                    Báo cáo hiện trường & Đối chiếu tọa độ GPS
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="bg-white text-xs">
                    Kết quả: {incident.recoveryOutcome ?? "Chưa rõ"}
                  </Badge>
                  {incident.parcelCondition && (
                    <Badge variant="secondary" className="text-xs">
                      {incident.parcelCondition}
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs">
                Dữ liệu KTV bấm xác nhận vị trí thực tế tại điểm rơi bằng GPS điện thoại
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border bg-slate-50/50 space-y-1.5">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    Tọa độ KTV bấm xác nhận:
                  </span>
                  <p className="font-mono font-bold text-slate-900 text-sm">
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
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                isNear
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {isNear ? "✓ " : "⚠️ "}
                              Độ lệch so với điểm rơi: {deltaMeters} mét
                            </span>
                          );
                        })()}
                      </div>
                    )}
                </div>

                <div className="p-3 rounded-lg border bg-slate-50/50 space-y-1.5">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    Ghi chú hiện trường của KTV:
                  </span>
                  <p className="font-medium text-slate-800 italic text-xs leading-relaxed">
                    {incident.recoveryNote?.trim()
                      ? `"${incident.recoveryNote}"`
                      : "KTV không để lại ghi chú thêm."}
                  </p>
                </div>
              </div>

              {/* Bằng chứng hình ảnh tại hiện trường */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  Ảnh chụp bằng chứng tại hiện trường ({incident.evidence.length})
                </h4>

                {incident.evidence.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3 rounded-lg border border-dashed bg-slate-50">
                    Chưa có ảnh bằng chứng nào được tải lên.
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
                              Không có ảnh
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                            <p className="text-[11px] font-medium truncate">
                              {item.caption || item.stage || "Ảnh hiện trường"}
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
                  Dòng thời gian sự cố ({incident.timeline.length} sự kiện)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {incident.timeline.map((item) => {
                const info = TIMELINE_EVENT_INFO[item.eventType];
                const labelVi = info?.labelVi ?? item.eventType.replaceAll("_", " ");
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
                    Cấu hình chính sách bồi thường sự cố
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
                    Chính sách: {incident.incidentPolicyEnabled !== false ? "Đang bật" : "Đang tắt"}
                  </Badge>
                  <Link
                    to="/admin/settings"
                    target="_blank"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    Cài đặt
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              <CardDescription className="text-xs">
                Quy tắc xử lý bồi thường và hoàn cước áp dụng từ backend cho đơn hàng này
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-50 border">
                  <span className="text-muted-foreground block text-[10px]">Tỷ lệ đề xuất</span>
                  <span className="font-bold text-slate-800">
                    {formatCompensationRate(incident.compensationRate)}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <span className="text-muted-foreground block text-[10px]">Trần bồi thường</span>
                  <span className="font-bold text-slate-800">
                    {incident.compensationCap && incident.compensationCap > 0
                      ? formatCurrency(incident.compensationCap)
                      : "Không đặt trần"}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <span className="text-muted-foreground block text-[10px]">SLA thu hồi</span>
                  <span className="font-bold text-slate-800">
                    {incident.recoverySlaHours ?? 4} giờ
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <span className="text-muted-foreground block text-[10px]">Phê duyệt Admin</span>
                  <span className="font-bold text-slate-800">
                    {incident.approvalRequired !== false ? "Bắt buộc duyệt" : "Tự động"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 border-t pt-2">
                <span>
                  Giá trị kiện: <b>{formatCurrency(incident.declaredValue ?? 0)}</b>
                </span>
                <span>
                  ⇒ Mức gợi ý bồi thường:{" "}
                  <b className="text-emerald-700">{formatCurrency(suggested)}</b>
                </span>
                <span>
                  • Giao lại miễn phí:{" "}
                  <b className="text-slate-800">
                    {incident.freeRedeliveryAllowed !== false ? "Cho phép (khi về Hub)" : "Tắt"}
                  </b>
                </span>
                <span>
                  • Hoàn cước ship:{" "}
                  <b className="text-slate-800">
                    {incident.refundShippingFeeAllowed !== false ? "Có" : "Không"}
                  </b>
                </span>
                <span>
                  • Cho phép khiếu nại (Dispute):{" "}
                  <b className="text-slate-800">
                    {incident.disputeAllowed !== false ? "Có" : "Không"}
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
                    Xử lý phương án bồi thường & Giao lại
                  </CardTitle>
                </div>
                <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300 text-xs font-bold">
                  Tỷ lệ: {formatCompensationRate(incident.compensationRate)}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Tạo đề xuất phương án giải quyết gửi cho khách hàng chấp thuận
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
                  Phương án giải quyết đề xuất:
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
                    <SelectItem value="FREE_REDELIVERY" className="text-xs" disabled={!atHub}>
                      Giao lại miễn phí toàn bộ cước phí {!atHub && "(Cần kiện về Hub)"}
                    </SelectItem>
                    <SelectItem value="REDELIVERY_PARTIAL_COMPENSATION" className="text-xs" disabled={!atHub}>
                      Giao lại kiện + Bồi thường một phần {!atHub && "(Cần kiện về Hub)"}
                    </SelectItem>
                    <SelectItem value="COMPENSATION_ONLY" className="text-xs">
                      Chỉ bồi thường qua tài khoản ngân hàng (Không giao lại)
                    </SelectItem>
                    <SelectItem value="MANUAL_RESOLUTION" className="text-xs">
                      Thoả thuận phương án riêng với khách
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded bg-slate-50 border p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                {resolutionType === "FREE_REDELIVERY" && (
                  <p>• Giao lại miễn phí toàn bộ cước phí sau khi kiện đã an toàn về Hub (Số tiền bồi thường = 0đ).</p>
                )}
                {resolutionType === "REDELIVERY_PARTIAL_COMPENSATION" && (
                  <p>• Giao lại kiện cho khách sau khi đã về Hub, đồng thời tạo phiếu hoàn tiền bồi thường một phần giá trị kiện hàng.</p>
                )}
                {resolutionType === "COMPENSATION_ONLY" && (
                  <p>• Tạo phiếu hoàn tiền bồi thường qua tài khoản ngân hàng của khách (không giao lại kiện do thất lạc hoặc hư hỏng nặng).</p>
                )}
                {resolutionType === "MANUAL_RESOLUTION" && (
                  <p>• Thỏa thuận phương án riêng với khách hàng ngoài quy trình tự động. Bắt buộc ghi rõ nội dung thỏa thuận vào ô ghi chú.</p>
                )}
              </div>

              {/* Mức tiền bồi thường */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Số tiền bồi thường (VND):
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
                  placeholder="Nhập số tiền bồi thường..."
                  className="text-xs"
                />
                {suggested != null && (
                  <p className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    Gợi ý theo cấu hình ({formatCompensationRate(incident.compensationRate)}):{" "}
                    <b className="text-emerald-700">{formatCurrency(suggested)}</b>
                    {resolutionType !== "FREE_REDELIVERY" && String(suggested) !== amount && (
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={() => setAmount(String(suggested))}
                      >
                        (Dùng mức gợi ý)
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
                    Hoàn phí giao hàng khi bồi thường
                    <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">
                      (Khoản hoàn phí vận chuyển được xử lý tách biệt với bồi thường giá trị kiện hàng)
                    </span>
                  </label>
                </div>
              )}

              {/* Lý do vượt mức / Ghi chú */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Lý do điều chỉnh / Ghi chú thỏa thuận:
                </label>
                <Input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={
                    resolutionType === "MANUAL_RESOLUTION"
                      ? "Bắt buộc: Nhập chi tiết phương án đã thỏa thuận với khách..."
                      : "Bắt buộc nếu bồi thường vượt mức gợi ý..."
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
                Gửi đề xuất phương án cho khách
              </Button>
              </>
              ) : (
                <p className="rounded border bg-slate-50 p-2.5 text-xs text-slate-600">
                  {incident.status === "AWAITING_CUSTOMER_RESPONSE"
                    ? "Đã gửi phương án, đang chờ khách phản hồi. Khách yêu cầu xem xét lại thì gửi được phương án mới."
                    : "Khách đã chọn phương án — không gửi thêm đề xuất."}
                </p>
              )}

              {/* Tiến trình giao lại nếu khách đã đồng ý */}
              {["PREPARING", "IN_PROGRESS"].includes(incident.redeliveryStatus) && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 space-y-2 mt-3">
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
                    Kiện hàng đã được điều phối giao lại từ Hub. Khi người nhận lấy hàng ở đơn giao lại, sự cố tự đóng phần giao lại.
                    Chỉ bấm tay khi đơn giao lại đã hoàn tất mà sự cố chưa cập nhật.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-indigo-300 text-indigo-800 text-xs gap-1.5 font-semibold"
                    disabled={completeRedeliveryState.isLoading}
                    onClick={() =>
                      handleAction(
                        () => completeRedelivery(incident.id).unwrap(),
                        "Đã xác nhận giao lại thành công và đóng sự cố!",
                      )
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Đóng phần giao lại (đơn giao lại đã hoàn tất)
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
                        "Đã phê duyệt tạo phiếu hoàn tiền bồi thường cho khách!",
                      )
                    }
                  >
                    {incident.compensationStatus === "AWAITING_APPROVAL"
                      ? "Phê duyệt phiếu hoàn tiền bồi thường"
                      : "Thử lại lệnh chuyển khoản bồi thường"}
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
                    Lịch sử đề xuất phương án ({incident.proposals.length})
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {incident.proposals.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">
                  Chưa có phương án bồi thường nào được đề xuất.
                </p>
              ) : (
                incident.proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="rounded-xl border bg-slate-50/50 p-3.5 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        Phiên bản {proposal.version ?? proposal.proposalVersion} ·{" "}
                        {proposal.resolutionType.replaceAll("_", " ")}
                      </span>
                      <Status value={proposal.status} />
                    </div>

                    <div className="p-2 rounded bg-white border text-[11px] text-slate-700">
                      Mức bồi thường:{" "}
                      <b className="text-emerald-700">
                        {formatCurrency(proposal.compensationAmount ?? 0)}
                      </b>
                      {proposal.policyVersion && ` · Chính sách: ${proposal.policyVersion}`}
                    </div>

                    {proposal.resolutionNote && (
                      <div className="p-2 rounded bg-white border text-[11px] text-slate-700">
                        <b>Nội dung gửi khách:</b> {proposal.resolutionNote}
                      </div>
                    )}

                    {proposal.customerResponseNote && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                        <b>Phản hồi của khách:</b> "{proposal.customerResponseNote}"
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
