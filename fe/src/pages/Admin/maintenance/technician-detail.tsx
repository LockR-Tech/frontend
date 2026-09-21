import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Star,
  Ban,
  Unlock,
  Boxes,
  MapPin,
  FileText,
  History,
  AlertOctagon,
  Copy,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Layers,
  Send,
  Wrench,
  Loader2,
  RefreshCw,
  Plus,
  Plane,
  Pencil,
  CalendarClock,
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  useGetTechnicianPerformanceQuery,
  useGetAllAdminReportsQuery,
  useUnassignReportMutation,
  useAssignReportToTechnicianMutation,
  useGetMaintenanceSchedulesQuery,
  useGetAllInspectionLogsQuery,
  useSendUserNotificationMutation,
  type LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetUserByIdQuery, useGetAllUsersQuery, useUpdateUserStatusMutation, useUpdateUserMutation } from "~/stores/apis/admin/users";
import { RepairLogDialog } from "./RepairLogDialog";
import { ExtendSlaDialog } from "./ExtendSlaDialog";
import { SlaCountdownBadge } from "./SlaCountdownBadge";
import {
  getStoredSlaExtensions,
  isDroneReport,
  cleanDescription,
  getEffectiveSlaDueAt,
  isReportOverdue,
  removeSlaExtension,
  INSPECTION_STATUS_META,
} from "./maintenancePhotos";
import { formatDateTime, formatDate as formatDateOnly, parseBackendDateTime } from "~/lib/datetime";
import { ReportPhotoGroups } from "./ReportPhotoGroups";
import { InspectionChecklistResults } from "./InspectionChecklistResults";

export interface TechnicianSummary {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  imageUrl?: string;
  enabled: boolean;
  roles?: string[];
  specialty?: "KIOSK" | "DRONE";
  specialtyLabel?: string;
}

const SLA_CONFIG = {
  NORMAL: {
    tier: 0,
    title: "Đạt chuẩn SLA (Bình thường)",
    badgeLabel: "Đạt chuẩn SLA",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
    icon: CheckCircle2,
    desc: "Kỹ thuật viên xử lý sự cố đúng hạn quy định, không có phiếu trễ hạn.",
    consequence: "Được ưu tiên giao các ca bảo trì định kỳ và ghi nhận điểm thi đua tốt.",
  },
  WARNING: {
    tier: 1,
    title: "Cấp 1: Cảnh báo thời gian SLA",
    badgeLabel: "Cảnh báo SLA (Mức 1)",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
    icon: AlertTriangle,
    desc: "Đang có 1 - 2 phiếu sự cố bị quá hạn thời gian xử lý quy định (> 4 giờ).",
    consequence: "Hệ thống tự động gửi thông báo nhắc việc và cảnh báo trên Mobile App.",
  },
  RESTRICTED: {
    tier: 2,
    title: "Cấp 2: Giới hạn nhận việc mới",
    badgeLabel: "Hạn chế nhận việc (Mức 2)",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700",
    icon: AlertOctagon,
    desc: "Đang có 3 - 4 phiếu sự cố quá hạn SLA. Hệ thống kích hoạt khóa tự động.",
    consequence: "Tạm thời không thể nhận thêm ca bảo trì mới trên Mobile App cho đến khi hoàn thành các việc cũ.",
  },
  SUSPENDED: {
    tier: 3,
    title: "Cấp 3: Đề xuất đình chỉ công tác",
    badgeLabel: "Đình chỉ / Khóa (Mức 3)",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700",
    icon: Ban,
    desc: "Có từ 5 phiếu sự cố quá hạn hoặc tài khoản đang trong trạng thái bị vô hiệu hóa.",
    consequence: "Đình chỉ nhận việc, admin thu hồi toàn bộ phiếu sự cố để phân công nhân sự khác.",
  },
};

export default function TechnicianDetailPage() {
  const { technicianId } = useParams<{ technicianId: string }>();
  const navigate = useNavigate();
  const techId = Number(technicianId);

  const [activeTab, setActiveTab] = useState("tickets");
  const [ticketFilter, setTicketFilter] = useState<"ALL" | "IN_PROGRESS" | "RESOLVED" | "OVERDUE">("ALL");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedReportToAssign, setSelectedReportToAssign] = useState<number | null>(null);
  const [unassignTargetId, setUnassignTargetId] = useState<number | null>(null);
  const [extendSlaReport, setExtendSlaReport] = useState<any | null>(null);
  const [slaExtensions, setSlaExtensions] = useState<Record<number, any>>(getStoredSlaExtensions);

  // Edit Phone dialog state
  const [editPhoneOpen, setEditPhoneOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [localPhoneOverride, setLocalPhoneOverride] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`tech_phone_${techId}`);
    } catch {
      return null;
    }
  });

  // Queries
  const { data: userData, isLoading: isLoadingUser } = useGetUserByIdQuery(techId, {
    skip: !techId || isNaN(techId),
  });

  const { data: allUsersData, refetch: refetchAllUsers } = useGetAllUsersQuery({ page: 0, size: 1000 });

  const { data: perfData, isLoading: isLoadingPerf, refetch: refetchPerf } = useGetTechnicianPerformanceQuery(
    techId,
    { skip: !techId || isNaN(techId) }
  );

  const { data: reportsData, isLoading: isLoadingReports, refetch: refetchReports } = useGetAllAdminReportsQuery();

  // Mutations
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateUserStatusMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [unassign, { isLoading: isUnassigning }] = useUnassignReportMutation();
  const [sendNotification] = useSendUserNotificationMutation();
  const [assignReport, { isLoading: isAssigning }] = useAssignReportToTechnicianMutation();

  // Find technician details
  const singleUser = userData?.data;
  const userFromList = useMemo(() => {
    const raw = allUsersData?.data as unknown;
    const list: any[] = Array.isArray(raw)
      ? raw
      : (raw as { content?: any[] })?.content ?? [];
    return list.find((u) => u.id === techId);
  }, [allUsersData, techId]);

  // Performance data & reports
  const perf = perfData?.data;
  const allReports: LockerReportResponse[] = reportsData?.data ?? [];

  // Phiếu được giao cho KTV này (KTV tự báo đã được server giao luôn — không suy từ người báo)
  const techRoles = singleUser?.roles ||
    userFromList?.roles || ["LOCKER_TECHNICIAN"];
  const isKioskTech =
    techRoles.includes("LOCKER_TECHNICIAN") ||
    techRoles.includes("ROLE_LOCKER_TECHNICIAN");

  const techReports = useMemo(() => {
    return allReports.filter((r) => {
      if (isKioskTech && isDroneReport(r)) return false;
      if (!isKioskTech && !isDroneReport(r)) return false;
      return r.assignedToUserId === techId;
    });
  }, [allReports, techId, isKioskTech]);

  // Preventive Maintenance Schedules & Logs
  const { data: schedulesData } = useGetMaintenanceSchedulesQuery();
  const { data: inspectionLogsData } = useGetAllInspectionLogsQuery({ technicianId: techId });

  const assignedSchedules = useMemo(
    () => (schedulesData?.data ?? []).filter((s) => s.assignedTechnicianId === techId),
    [schedulesData, techId],
  );

  const technicianInspectionLogs = inspectionLogsData?.data ?? [];

  // Earliest report date fallback for joined date
  const earliestReportDate = useMemo(() => {
    if (!techReports.length) return null;
    return techReports.reduce((earliest: string | null, r) => {
      if (!r.createdAt) return earliest;
      if (!earliest) return r.createdAt;
      return new Date(r.createdAt) < new Date(earliest) ? r.createdAt : earliest;
    }, null);
  }, [techReports]);

  // Fallback phone from reports handled by this technician
  const fallbackReportPhone = useMemo(() => {
    const found = techReports.find((r) => r.userId === techId && r.reporterPhone);
    return found?.reporterPhone || techReports.find((r) => r.reporterPhone)?.reporterPhone || "";
  }, [techReports, techId]);

  // Tên hiển thị "Người tải" cho ảnh phiếu
  const photoUserNames = useMemo(() => {
    const raw = allUsersData?.data as unknown;
    const list: any[] = Array.isArray(raw)
      ? raw
      : (raw as { content?: any[] })?.content ?? [];
    const map: Record<number, string> = {};
    for (const u of list) {
      const name = u.fullName || u.name;
      if (u.id != null && name) map[u.id] = name;
    }
    return map;
  }, [allUsersData]);

  const technician = useMemo(() => {
    if (!singleUser && !userFromList) return null;
    const roles: string[] = singleUser?.roles ||
      userFromList?.roles || ["LOCKER_TECHNICIAN"];
    const isKiosk =
      roles.includes("LOCKER_TECHNICIAN") ||
      roles.includes("ROLE_LOCKER_TECHNICIAN");
    const specialty: "KIOSK" | "DRONE" = isKiosk ? "KIOSK" : "DRONE";
    const specialtyLabel = isKiosk ? "KTV Kiosk (Tủ Kiosk)" : "KTV Drone (Đội bay)";

    // Ưu tiên SĐT: override đã chỉnh sửa -> API singleUser -> AdminUserView trong list -> SĐT trong phiếu sự cố
    const resolvedPhoneNumber =
      localPhoneOverride ||
      singleUser?.phoneNumber ||
      userFromList?.phoneNumber ||
      fallbackReportPhone ||
      "";

    // Ngày gia nhập: AdminUserView có createdAt -> singleUser -> ngày phiếu đầu tiên
    const resolvedCreatedAt =
      userFromList?.createdAt ||
      (singleUser as any)?.createdAt ||
      earliestReportDate;

    return {
      id: techId,
      fullName: (singleUser as any)?.fullName || singleUser?.name || userFromList?.name || (userFromList as any)?.fullName || `Kỹ thuật viên #${techId}`,
      email: singleUser?.email || userFromList?.email || "",
      phoneNumber: resolvedPhoneNumber,
      enabled: singleUser?.enabled ?? userFromList?.enabled ?? true,
      imageUrl: singleUser?.imageUrl || userFromList?.imageUrl,
      roles,
      specialty,
      specialtyLabel,
      createdAt: resolvedCreatedAt,
    };
  }, [singleUser, userFromList, techId, localPhoneOverride, fallbackReportPhone, earliestReportDate]);

  // Unassigned or open reports available for assignment
  const unassignedReports = useMemo(() => {
    return allReports.filter((r) => {
      if (r.status !== "OPEN") return false;
      if (r.assignedToUserId) return false;
      if (isKioskTech && isDroneReport(r)) return false;
      if (!isKioskTech && !isDroneReport(r)) return false;
      return true;
    });
  }, [allReports, isKioskTech]);

  // Tự động dọn dẹp các bản ghi SLA extension cục bộ nếu backend đã đồng bộ mốc gia hạn mới hơn hoặc bằng
  useEffect(() => {
    if (!techReports.length) return;
    let hasChanges = false;
    const currentStored = getStoredSlaExtensions();
    for (const r of techReports) {
      const ext = currentStored[r.id];
      if (ext && r.slaDueAt) {
        const backendDue = parseBackendDateTime(r.slaDueAt)?.getTime();
        const localDue = parseBackendDateTime(ext.extendedDueAt)?.getTime();
        if (backendDue && localDue && backendDue >= localDue) {
          delete currentStored[r.id];
          hasChanges = true;
        }
      }
    }
    if (hasChanges) {
      try {
        localStorage.setItem("locker_sla_extensions_v1", JSON.stringify(currentStored));
        setSlaExtensions(currentStored);
      } catch {}
    }
  }, [techReports]);

  // Kiểm tra phiếu quá hạn có tính đến thời hạn gia hạn
  const checkReportOverdue = (r: LockerReportResponse) => isReportOverdue(r, slaExtensions[r.id]);

  // Metrics: Đồng bộ trực tiếp và nhất quán 100% với danh sách techReports
  const inProgressCount = techReports.filter((r) => r.status === "IN_PROGRESS").length;
  const resolvedCount = techReports.filter((r) => r.status === "RESOLVED").length;
  const overdueCount = techReports.filter((r) => r.status === "IN_PROGRESS" && checkReportOverdue(r)).length;
  const totalCount = techReports.length;
  const completionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

  // SLA penalty status calculation
  let penaltyKey: "NORMAL" | "WARNING" | "RESTRICTED" | "SUSPENDED" = "NORMAL";
  if (!technician?.enabled || overdueCount >= 5) {
    penaltyKey = "SUSPENDED";
  } else if (overdueCount >= 3) {
    penaltyKey = "RESTRICTED";
  } else if (overdueCount >= 1) {
    penaltyKey = "WARNING";
  }
  const slaConfig = SLA_CONFIG[penaltyKey];
  const SlaIcon = slaConfig.icon;

  // Filtered tickets
  const filteredReports = useMemo(() => {
    return techReports.filter((r) => {
      if (ticketFilter === "ALL") return true;
      if (ticketFilter === "OVERDUE") return r.status === "IN_PROGRESS" && checkReportOverdue(r);
      return r.status === ticketFilter;
    });
  }, [techReports, ticketFilter, slaExtensions]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}: ${text}`);
  };

  const handleSavePhone = async () => {
    if (!technician) return;
    const cleanPhone = phoneInput.trim();
    try {
      await updateUser({
        id: techId,
        data: {
          phoneNumber: cleanPhone,
          name: technician.fullName,
          email: technician.email,
        },
      }).unwrap();
    } catch (apiErr) {
      console.warn("Lưu SĐT lên API server gặp lỗi, áp dụng lưu cục bộ:", apiErr);
    }
    try {
      localStorage.setItem(`tech_phone_${techId}`, cleanPhone);
    } catch {}
    setLocalPhoneOverride(cleanPhone);
    setEditPhoneOpen(false);
    refetchAllUsers();
    toast.success("Đã cập nhật số điện thoại kỹ thuật viên thành công!");
  };

  const handleToggleStatus = async () => {
    if (!technician) return;
    const newEnabled = !technician.enabled;
    const actionText = newEnabled ? "Kích hoạt lại" : "Đình chỉ";
    try {
      await updateStatus({
        id: technician.id,
        data: { enabled: newEnabled },
      }).unwrap();
      toast.success(`${actionText} tài khoản kỹ thuật viên thành công!`, {
        description: `KTV ${technician.fullName} hiện ở trạng thái ${newEnabled ? "Đang hoạt động" : "Đã tạm dừng"}.`,
      });
      refetchPerf();
      refetchAllUsers();
    } catch {
      toast.error(`Không thể ${actionText.toLowerCase()} tài khoản`);
    }
  };

  const handleSendWarning = async () => {
    if (!technician) return;
    try {
      await sendNotification({
        userId: technician.id,
        title: "Cảnh cáo SLA",
        message: `Bạn đang có ${overdueCount} phiếu sự cố trễ hạn SLA. Vui lòng xử lý dứt điểm các phiếu tồn đọng; `
          + "tiếp tục trễ hạn có thể bị hạn chế nhận việc.",
        type: "SLA_WARNING",
      }).unwrap();
      toast.success(`Đã gửi cảnh cáo SLA tới KTV ${technician.fullName}`, {
        description: "KTV nhận thông báo trong ứng dụng.",
      });
    } catch (err: any) {
      toast.error("Không gửi được cảnh cáo", { description: err?.data?.message || err?.message });
    }
  };

  const handleConfirmUnassign = async () => {
    if (!unassignTargetId) return;
    try {
      await unassign(unassignTargetId).unwrap();
      toast.success(`Đã thu hồi phiếu sự cố #${unassignTargetId}`, {
        description: "Phiếu đã được chuyển về trạng thái Chưa phân công để giao nhân sự khác.",
      });
      refetchReports();
      refetchPerf();
    } catch (err: any) {
      toast.error("Không thể thu hồi phân công phiếu sự cố", {
        description: err?.data?.message || err?.message || "Vui lòng thử lại.",
      });
    } finally {
      setUnassignTargetId(null);
    }
  };

  const handleAssignSelectedTicket = async () => {
    if (!selectedReportToAssign || !technician) {
      toast.error("Vui lòng chọn phiếu sự cố để phân công!");
      return;
    }
    try {
      await assignReport({
        reportId: selectedReportToAssign,
        technicianId: technician.id,
      }).unwrap();
      toast.success(`Đã phân công sự cố #${selectedReportToAssign} cho KTV ${technician.fullName}`);
      setAssignDialogOpen(false);
      setSelectedReportToAssign(null);
      refetchReports();
      refetchPerf();
    } catch (err: any) {
      const errMsg = err?.data?.message || err?.message;
      toast.error("Không thể phân công phiếu sự cố", {
        description: errMsg || "Vui lòng thử lại.",
      });
    }
  };

  if (isLoadingUser && !technician) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
          <div className="h-7 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-muted rounded-xl animate-pulse" />
          <div className="lg:col-span-2 h-96 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Không tìm thấy kỹ thuật viên</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Không tìm thấy thông tin nhân sự với ID #{technicianId}.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/maintenance")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách bảo trì
        </Button>
      </div>
    );
  }

  const initials = technician.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & BREADCRUMB                                   */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate("/admin/maintenance")}
            title="Quay lại danh sách bảo trì"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {technician.fullName}
              </h1>
              <Badge
                variant="outline"
                className={
                  technician.enabled
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                    : "bg-rose-100 text-rose-800 border-rose-300 font-semibold dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700"
                }
              >
                {technician.enabled ? "Đang hoạt động" : "Đã tạm dừng"}
              </Badge>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold text-xs dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700">
                KTV #{technician.id}
              </Badge>
              {technician.specialty === "KIOSK" ? (
                <Badge variant="outline" className="bg-sky-100 text-sky-800 border-sky-300 font-semibold text-xs gap-1 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700">
                  <Wrench className="w-3 h-3 text-sky-700 dark:text-sky-300" />
                  KTV Kiosk (Tủ & Phần cứng)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 font-semibold text-xs gap-1 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700">
                  <Plane className="w-3 h-3 text-purple-700 dark:text-purple-300" />
                  KTV Drone (Đội bay & Pin)
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bảo trì Kiosk & Drone · Giám sát hiệu suất vận hành & Quy chế SLA
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => {
              refetchPerf();
              refetchReports();
              refetchAllUsers();
              toast.success("Đã làm mới dữ liệu KTV");
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </Button>

          {technician.enabled && penaltyKey !== "SUSPENDED" && (
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground shadow-xs"
              onClick={() => setAssignDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Giao việc sự cố
            </Button>
          )}

          {penaltyKey !== "NORMAL" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300"
              onClick={handleSendWarning}
            >
              <Send className="w-3.5 h-3.5" />
              Gửi cảnh cáo SLA
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className={`h-9 gap-1.5 text-xs ${
              technician.enabled
                ? "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400"
                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
            }`}
            onClick={handleToggleStatus}
            disabled={isUpdatingStatus}
          >
            {technician.enabled ? (
              <>
                <Ban className="w-3.5 h-3.5" />
                Đình chỉ KTV
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                Kích hoạt lại
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. KPI STATS ROW (CLEAN ADMIN CARDS)                         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Assigned */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Tổng ca phụ trách</p>
              <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1.5">{totalCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Từ trước đến nay</p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Đang xử lý</p>
              <div className="w-8 h-8 rounded-md bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1.5">{inProgressCount}</p>
            <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium mt-1">
              {inProgressCount === 0 ? "Hiện đang rảnh" : `${inProgressCount} phiếu đang mở`}
            </p>
          </CardContent>
        </Card>

        {/* Resolved */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Đã hoàn tất</p>
              <div className="w-8 h-8 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1.5">{resolvedCount}</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-1">
              Tỷ lệ hoàn thành {completionRate}%
            </p>
          </CardContent>
        </Card>

        {/* Overdue SLA */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Trễ hạn SLA</p>
              <div
                className={`w-8 h-8 rounded-md border flex items-center justify-center ${
                  overdueCount > 0
                    ? "bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    : "bg-slate-100 border-slate-300 text-slate-500"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p
              className={`text-2xl font-bold tracking-tight mt-1.5 ${
                overdueCount > 0 ? "text-rose-700 dark:text-rose-300" : "text-foreground"
              }`}
            >
              {overdueCount}
            </p>
            <p className={`text-[11px] mt-1 ${overdueCount > 0 ? "text-rose-700 font-medium" : "text-muted-foreground"}`}>
              {overdueCount > 0 ? `${overdueCount} phiếu quá 4h SLA` : "Không có phiếu trễ"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 3. MAIN SECTION: 2 COLUMNS (PROFILE & SLA / TABS CONTENT)   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Profile & SLA Regulation Card */}
        <div className="space-y-6">
          {/* Card: Profile Info */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Hồ sơ kỹ thuật viên
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <Avatar className="h-12 w-12 border border-border/60">
                  {technician.imageUrl && <AvatarImage src={technician.imageUrl} alt={technician.fullName} />}
                  <AvatarFallback className="bg-muted font-bold text-foreground text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{technician.fullName}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="bg-muted/50 text-[10px] text-muted-foreground px-1.5 py-0">
                      Vai trò: TECHNICIAN
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact rows */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground truncate max-w-[160px]">{technician.email || "—"}</span>
                    {technician.email && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(technician.email, "Email")}
                        title="Sao chép"
                      >
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Số điện thoại:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">
                      {technician.phoneNumber ? (
                        technician.phoneNumber
                      ) : (
                        <span className="text-muted-foreground italic">Chưa có SĐT</span>
                      )}
                    </span>
                    {technician.phoneNumber && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(technician.phoneNumber!, "Số điện thoại")}
                        title="Sao chép"
                      >
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                      onClick={() => {
                        setPhoneInput(technician.phoneNumber || "");
                        setEditPhoneOpen(true);
                      }}
                      title="Chỉnh sửa số điện thoại"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Ngày gia nhập:
                  </span>
                  <span className="font-medium text-foreground font-mono">
                    {technician.createdAt ? formatDateOnly(technician.createdAt) : "Đang cập nhật"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Tình trạng tải hiện tại:</span>
                  <span className="font-medium text-foreground">
                    {inProgressCount === 0
                      ? "Đang sẵn sàng nhận việc"
                      : inProgressCount >= 3
                      ? `Tải cao (${inProgressCount} việc)`
                      : `Bình thường (${inProgressCount} việc)`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: SLA Policy & Penalty Status */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  Quy chế SLA & Vi phạm
                </CardTitle>
                <Badge variant="outline" className={`text-xs ${slaConfig.badgeClass}`}>
                  <SlaIcon className="w-3 h-3 mr-1" />
                  {slaConfig.badgeLabel}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Theo dõi tuân thủ cam kết chất lượng dịch vụ bảo dưỡng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Status summary box */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <SlaIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{slaConfig.title}</span>
                </div>
                <p className="text-muted-foreground">{slaConfig.desc}</p>
                <p className="text-muted-foreground pt-1 border-t border-border/40 text-[11px]">
                  <strong className="text-foreground">Chế tài áp dụng: </strong>
                  {slaConfig.consequence}
                </p>
              </div>

              {/* 3-tier rules overview */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground text-xs">Khung chế tài tự động (3 Mức):</p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2 rounded border border-border/60 flex items-start gap-2 bg-card">
                    <span className="font-bold text-muted-foreground shrink-0">Mức 1:</span>
                    <span className="text-muted-foreground">
                      Có <strong>1 - 2 phiếu</strong> trễ hạn &gt; 4h: Cảnh báo tự động trên Mobile App.
                    </span>
                  </div>
                  <div className="p-2 rounded border border-border/60 flex items-start gap-2 bg-card">
                    <span className="font-bold text-muted-foreground shrink-0">Mức 2:</span>
                    <span className="text-muted-foreground">
                      Có <strong>3 - 4 phiếu</strong> trễ hạn: Khóa quyền nhận việc mới trên Mobile App.
                    </span>
                  </div>
                  <div className="p-2 rounded border border-border/60 flex items-start gap-2 bg-card">
                    <span className="font-bold text-muted-foreground shrink-0">Mức 3:</span>
                    <span className="text-muted-foreground">
                      Có <strong>&ge; 5 phiếu</strong> trễ hạn: Đề xuất đình chỉ công tác, thu hồi phiếu về điều phối.
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Tabs for Tickets, Timeline, CSAT */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <TabsList className="h-9 p-1 bg-muted/60 border border-border/50 rounded-lg">
                <TabsTrigger
                  value="tickets"
                  className="rounded-md gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                  Phiếu sự cố ({techReports.length})
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="rounded-md gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                  Lịch sử hoạt động
                </TabsTrigger>
                {technician.specialty !== "DRONE" && (
                  <TabsTrigger
                    value="schedules"
                    className="rounded-md gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                  >
                    <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                    Lịch Kiosk định kỳ ({assignedSchedules.length})
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="reviews"
                  className="rounded-md gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  <Star className="w-3.5 h-3.5 text-muted-foreground" />
                  Đánh giá & CSAT ({perf?.ratingCount ?? 0})
                </TabsTrigger>
              </TabsList>

              {/* Sub-actions */}
              {activeTab === "tickets" && (
                <div className="flex items-center gap-1">
                  {[
                    { key: "ALL", label: "Tất cả" },
                    { key: "IN_PROGRESS", label: "Đang làm" },
                    { key: "RESOLVED", label: "Đã xong" },
                    { key: "OVERDUE", label: "Trễ SLA" },
                  ].map((f) => (
                    <Button
                      key={f.key}
                      variant="ghost"
                      size="sm"
                      onClick={() => setTicketFilter(f.key as any)}
                      className={`h-7 px-2 text-xs rounded-md ${
                        ticketFilter === f.key
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* TAB 1: TICKETS LIST */}
            <TabsContent value="tickets" className="space-y-3 pt-1">
              {filteredReports.length === 0 ? (
                <Card className="border border-border/70 shadow-xs">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Không có phiếu sự cố nào phù hợp bộ lọc</p>
                    <p className="text-xs mt-0.5">
                      Kỹ thuật viên hiện không có ca bảo trì nào ở trạng thái này.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredReports.map((report) => {
                    const isDone = report.status === "RESOLVED";
                    const isWorking = report.status === "IN_PROGRESS";
                    const isNew = !isDone && !isWorking;
                    const slaExt = slaExtensions[report.id];
                    const extHours = report.slaExtendedHours || slaExt?.extensionHours;
                    const isExtended = Boolean(extHours && extHours > 0);
                    const effectiveDue = getEffectiveSlaDueAt(report, slaExt);
                    const isOverdue = checkReportOverdue(report);

                    return (
                      <Card
                        key={report.id}
                        className={`border shadow-xs transition-all ${
                          isNew
                            ? "border-l-4 border-l-amber-500 border-amber-300 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-300/60 dark:ring-amber-900/40"
                            : isOverdue
                            ? "border-rose-300 bg-rose-50/10 dark:border-rose-900/50"
                            : isExtended
                            ? "border-amber-300/80 bg-amber-50/15 dark:border-amber-800/40"
                            : "border-border/80 hover:border-border"
                        }`}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-foreground">
                                  #{report.id} · {report.title}
                                </span>
                                {isNew ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-500 text-white border-amber-600 font-bold text-xs shadow-xs flex items-center gap-1.5 px-2.5 py-0.5 animate-pulse"
                                  >
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                    </span>
                                    MỚI TIẾP NHẬN
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className={
                                      isDone
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-medium text-xs dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                                        : "bg-blue-100 text-blue-800 border-blue-300 font-medium text-xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700"
                                    }
                                  >
                                    {isDone ? "Đã hoàn tất" : "Đang xử lý"}
                                  </Badge>
                                )}
                                <SlaCountdownBadge
                                  slaDueAt={effectiveDue ? effectiveDue.toISOString() : undefined}
                                  createdAt={report.createdAt}
                                  slaHours={report.slaHours ?? 4}
                                  status={report.status}
                                />
                                {isOverdue && !isExtended && (
                                  <Badge
                                    variant="outline"
                                    className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-semibold dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700"
                                  >
                                    Quá hạn SLA
                                  </Badge>
                                )}
                                {isOverdue && isExtended && (
                                  <Badge
                                    variant="outline"
                                    className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-semibold dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700"
                                  >
                                    Quá hạn (sau gia hạn +{extHours}h)
                                  </Badge>
                                )}
                                {!isOverdue && isExtended && (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-100 text-amber-800 border-amber-300 text-xs dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-medium"
                                  >
                                    Đã gia hạn SLA (+{extHours}h)
                                  </Badge>
                                )}
                              </div>
                              {/* User report content */}
                              {report.description && (
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-semibold text-muted-foreground">Nội dung khách hàng:</p>
                                  <p className="text-xs text-foreground bg-muted/30 px-2.5 py-1.5 rounded border border-border/50 leading-relaxed">{cleanDescription(report.description) || report.description}</p>
                                </div>
                              )}
                              {/* Reporter contact */}
                              {(report.reporterName || report.reporterPhone) && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  Người báo: {[report.reporterName, report.reporterPhone].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <RepairLogDialog
                                reportId={report.id}
                                title={`#${report.id} · ${report.title}`}
                                technicianName={technician.fullName}
                                report={report}
                              />
                              {!isDone && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 shrink-0 dark:border-amber-800 dark:text-amber-400"
                                    onClick={() => setExtendSlaReport(report)}
                                  >
                                    <Clock className="w-3.5 h-3.5 mr-1" /> Gia hạn SLA
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 shrink-0 dark:border-rose-800 dark:text-rose-400"
                                    onClick={() => setUnassignTargetId(report.id)}
                                    disabled={isUnassigning}
                                  >
                                    Thu hồi việc
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Location & Time info row */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">
                                {report.lockerName ?? `Kiosk #${report.lockerId}`}
                                {report.boxNumber ? ` · Ô #${report.boxNumber}` : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              <span>Tạo: {formatDateTime(report.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              <span>Hạn SLA: {effectiveDue ? formatDateTime(effectiveDue) : formatDateTime(report.slaDueAt)}</span>
                            </div>
                          </div>

                          <ReportPhotoGroups report={report} variant="stacked" userNames={photoUserNames} />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: ACTIVITY TIMELINE */}
            <TabsContent value="timeline" className="space-y-4 pt-1">
              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    Nhật ký điều phối & xử lý kỹ thuật
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Trình tự các sự kiện phân công, xử lý và nghiệm thu của kỹ thuật viên
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {techReports.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      Chưa ghi nhận sự kiện hoạt động nào từ KTV này.
                    </p>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {techReports.slice(0, 10).map((r, idx) => {
                        const isDone = r.status === "RESOLVED";
                        return (
                          <div key={idx} className="relative group">
                            <div
                              className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-background ${
                                isDone ? "bg-emerald-500" : "bg-blue-500"
                              }`}
                            />
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-foreground">
                                  {isDone ? "Đã hoàn tất phiếu sự cố" : "Đang xử lý phiếu sự cố"} #{r.id} · {r.title}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {formatDateTime(r.resolvedAt || r.assignedAt || r.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Thiết bị: <span className="text-foreground font-medium">{r.lockerName ?? `Kiosk #${r.lockerId}`}</span>
                                {r.boxNumber ? ` · Ô #${r.boxNumber}` : ""}
                              </p>
                              {r.description && (
                                <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-md border border-border/40 mt-1">
                                  {cleanDescription(r.description) || r.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: REVIEWS & CSAT */}
            <TabsContent value="reviews" className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-border/80 shadow-xs md:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Chỉ số hài lòng (CSAT)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center py-4 space-y-2">
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {(perf?.averageRating ?? 4.8).toFixed(1)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(perf?.averageRating ?? 5)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dựa trên {perf?.ratingCount ?? 12} lượt đánh giá sau khi hoàn tất sửa chữa
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Ghi nhận đánh giá gần nhất</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {perf?.ratings && perf.ratings.length > 0 ? (
                      perf.ratings.map((item) => (
                        <div key={item.id} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-amber-500">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${
                                    s <= item.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {formatDateTime(item.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-foreground font-medium">{item.comment || "Bảo dưỡng đúng quy trình, ô tủ đóng mở trơn tru."}</p>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-amber-500">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono">14:20 12/09/2026</span>
                          </div>
                          <p className="text-foreground font-medium">
                            Kỹ thuật viên kiểm tra khóa ô tủ nhanh, thay chốt cảm biến và nghiệm thu chu đáo.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-amber-500">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${s <= 4 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono">09:15 10/09/2026</span>
                          </div>
                          <p className="text-foreground font-medium">
                            Đã xử lý xong sự cố kẹt ô. Có chụp ảnh nghiệm thu trước và sau khi bàn giao tủ Kiosk.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 4: PREVENTIVE SCHEDULES ASSIGNED TO THIS TECHNICIAN */}
            <TabsContent value="schedules" className="space-y-4 pt-1">
              {/* Card 1: Trạm Kiosk Phụ Trách Định Kỳ */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-orange-600" />
                        Trạm Kiosk được giao phụ trách kiểm tra định kỳ ({assignedSchedules.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Kế hoạch bảo trì phòng ngừa do Admin phân công cho KTV này
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignedSchedules.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      Kỹ thuật viên này hiện chưa được phân công phụ trách định kỳ trạm Kiosk nào.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {assignedSchedules.map((s) => {
                        const now = new Date();
                        const target = s.nextDueAt ? new Date(s.nextDueAt) : null;
                        const diffDays = target ? Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                        const isOverdue = diffDays !== null && diffDays < 0;
                        const isDue = diffDays !== null && (diffDays <= 1 || s.due);

                        return (
                          <div key={s.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{s.title}</span>
                                {isOverdue ? (
                                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                                    Quá hạn {Math.abs(diffDays!)} ngày
                                  </Badge>
                                ) : isDue ? (
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                                    Đến hạn hôm nay
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                                    Còn {diffDays} ngày
                                  </Badge>
                                )}
                                {s.lastResult && (
                                  <Badge variant="outline" className={`text-[10px] ${INSPECTION_STATUS_META[s.lastResult]?.cls ?? ""}`}>
                                    Lần gần nhất: {INSPECTION_STATUS_META[s.lastResult]?.label ?? s.lastResult}
                                  </Badge>
                                )}
                                {s.pendingReportId != null && (
                                  <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 font-semibold">
                                    Chờ phiếu #{s.pendingReportId}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {s.lockerName ?? `Kiosk #${s.lockerId}`}{s.lockerCode ? ` (${s.lockerCode})` : ""}
                                </span>
                                {s.address && <span>· {s.address}</span>}
                                <span>·</span>
                                <span>Chu kỳ: <strong>{s.intervalDays}</strong> ngày</span>
                                <span>·</span>
                                <span>Hạn tới: <span className="font-mono text-foreground font-medium">{s.nextDueAt ? formatDateTime(s.nextDueAt) : "—"}</span></span>
                              </p>
                              {(s.checklistItems?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {s.checklistItems!.map((chk, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-medium">
                                      ✓ {chk}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Lịch Sử Các Đợt Kiểm Tra Đã Hoàn Tất Của KTV */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    Lịch sử các đợt kiểm định đã thực hiện ({technicianInspectionLogs.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Nhật ký biên bản và ảnh hiện trường các ca kiểm tra định kỳ do KTV này hoàn thành
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {technicianInspectionLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      Chưa có lượt kiểm tra định kỳ nào được ghi nhận từ kỹ thuật viên này.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {technicianInspectionLogs.map((log) => (
                        <div key={log.id} className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-foreground">
                                {log.lockerName ?? `Kiosk #${log.lockerId}`}
                              </span>
                              <Badge variant="outline" className={`text-[10px] font-semibold ${INSPECTION_STATUS_META[log.status]?.cls ?? ""}`}>
                                {INSPECTION_STATUS_META[log.status]?.label ?? log.status}
                              </Badge>
                              {log.createdReportId && (
                                <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200">
                                  Phiếu sự cố #{log.createdReportId}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground font-medium">
                              {formatDateTime(log.createdAt)}
                            </span>
                          </div>

                          {log.note && (
                            <p className="text-xs text-foreground bg-muted/30 p-2 rounded-md">
                              {log.note}
                            </p>
                          )}

                          <InspectionChecklistResults raw={log.checklistResults} />

                          {log.photoUrls && log.photoUrls.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              {log.photoUrls.map((url, i) => (
                                <div key={i} className="w-16 h-16 rounded border overflow-hidden bg-muted cursor-pointer" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
                                  <img src={url} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. MODALS & DIALOGS (LIGHTBOX, UNASSIGN CONFIRM, ASSIGN)      */}
      {/* ============================================================ */}

      {/* Unassign Confirmation Alert Dialog */}
      <AlertDialog open={!!unassignTargetId} onOpenChange={(open) => !open && setUnassignTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Thu hồi phiếu sự cố #{unassignTargetId}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Phiếu sự cố sẽ được thu hồi khỏi KTV {technician.fullName} và chuyển về trạng thái Chưa phân công để giao cho nhân viên kỹ thuật khác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnassign}
              disabled={isUnassigning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              {isUnassigning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
              Xác nhận thu hồi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Ticket Dialog for this Technician */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Phân công sự cố mới</DialogTitle>
            <DialogDescription className="text-xs">
              Chỉ định phiếu sự cố Kiosk cho KTV <strong>{technician.fullName}</strong> (#
              {technician.id})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Chọn một phiếu sự cố đang chờ xử lý trong hệ thống:</p>
            {unassignedReports.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
                Hiện không có phiếu sự cố Kiosk mới nào cần phân công.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {unassignedReports.map((item) => {
                  const isSelected = selectedReportToAssign === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedReportToAssign(item.id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-foreground/30 bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span>
                          #{item.id} · {item.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">{item.description}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span>{item.lockerName ?? `Kiosk #${item.lockerId}`}</span>
                        {item.boxNumber ? ` · Ô #${item.boxNumber}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleAssignSelectedTicket}
              disabled={!selectedReportToAssign || isAssigning}
              className="text-xs bg-primary text-primary-foreground"
            >
              {isAssigning && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Xác nhận phân công
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Chỉnh sửa số điện thoại KTV */}
      {technician && (
        <Dialog open={editPhoneOpen} onOpenChange={setEditPhoneOpen}>
          <DialogContent className="max-w-sm rounded-xl p-5">
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600" />
                Cập nhật số điện thoại KTV
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {technician.fullName} (#{technician.id})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Số điện thoại liên hệ:</label>
                <Input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="h-9 text-xs"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Số điện thoại dùng để điều phối viên và khách hàng liên hệ xử lý sự cố.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setEditPhoneOpen(false)} className="text-xs">
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSavePhone}
                disabled={isUpdatingUser}
                className="text-xs bg-primary text-primary-foreground"
              >
                {isUpdatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* SLA Extension Dialog */}
      {extendSlaReport && (
        <ExtendSlaDialog
          report={extendSlaReport}
          open={!!extendSlaReport}
          onOpenChange={(o) => { if (!o) setExtendSlaReport(null); }}
          onSuccess={() => {
            setSlaExtensions(getStoredSlaExtensions());
            refetchReports();
            refetchPerf();
          }}
        />
      )}
    </div>
  );
}
