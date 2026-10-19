import { formatDateTime, parseBackendDateTime } from "~/lib/datetime";
import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import i18n from "~/utils/i18n";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  UserCheck,
  Wifi,
  WifiOff,
  Wrench,
  Clock,
  CheckCircle,
  Boxes,
  Plane,
  CalendarClock,
  BatteryCharging,
  BatteryWarning,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  SlidersHorizontal,
  Loader2,
  History,
  Users,
  User,
  Search,
  X,
  RotateCcw,
  Sparkles,
  Plus,
  Radio,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { toast } from "sonner";
import { PageHeader } from "~/components/shared/page-header";
import { RepairLogDialog } from "./RepairLogDialog";
import { MaintenanceSchedules } from "./MaintenanceSchedules";
import type { TechnicianSummary } from "./technician-detail";
import { AssignReportDialog } from "./AssignReportDialog";
import { cleanDescription, isDroneReport, INSPECTION_STATUS_META } from "./maintenancePhotos";
import { ReportPhotoGroups } from "./ReportPhotoGroups";
import { ResolveReportDialog } from "./ResolveReportDialog";
import { SlaCountdownBadge } from "./SlaCountdownBadge";
import { PhotoPicker } from "~/components/shared/media";
import { isHandledUploadError, useImageUpload } from "~/hooks/useImageUpload";
import { getMediaErrorMessage } from "~/lib/media";
import type { ReportAttachmentRequest } from "~/stores/apis/media";
import {
  useGetFaultCellsQuery,
  useGetMaintenanceReportsQuery,
  useGetAllAdminReportsQuery,
  useGetMaintenanceSchedulesQuery,
  useClaimReportMutation,
  useResolveAdminReportMutation,
  useClearBoxFaultMutation,
  useGetDeviceStatusesQuery,
  useGetDroneMaintenanceHistoryQuery,
  useGetAllInspectionLogsQuery,
  type LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import {
  useGetDronesQuery,
  useCreateDroneIncidentReportMutation,
  type DroneResponse,
} from "~/stores/apis/admin/drones";

// Bản cũ dựng Date từ chuỗi trần nên hiển thị giờ UTC; dùng formatDateTime
// dùng chung (src/lib/datetime.ts) để ra đúng giờ VN.

const REPORT_BADGE: Record<string, string> = {
  OPEN: "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 font-semibold",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 font-semibold",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 font-semibold",
};

// Khớp DroneStatus của backend: IDLE, RESERVED, CHARGING, IN_FLIGHT, MAINTENANCE, FAULT
const DRONE_STATUS_BADGE: Record<string, string> = {
  IDLE: "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 font-semibold",
  RESERVED: "bg-cyan-100 text-cyan-800 border-cyan-300 hover:bg-cyan-200 font-semibold",
  CHARGING: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 font-semibold",
  IN_FLIGHT: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 font-semibold",
  MAINTENANCE: "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200 font-semibold",
  FAULT: "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 font-semibold",
};

// Lưu khoá i18n; dịch lúc render bằng t()
const DRONE_STATUS_LABEL_KEYS: Record<string, string> = {
  IDLE: "admin.maintenance.droneStatus.idle",
  RESERVED: "admin.maintenance.droneStatus.reserved",
  CHARGING: "admin.maintenance.droneStatus.charging",
  IN_FLIGHT: "admin.maintenance.droneStatus.inFlight",
  MAINTENANCE: "admin.maintenance.droneStatus.maintenance",
  FAULT: "admin.maintenance.droneStatus.fault",
};

function droneStatusLabel(t: TFunction, status: string): string {
  const key = DRONE_STATUS_LABEL_KEYS[status];
  return key ? t(key) : status;
}

// Cùng cửa sổ backend dùng cho bộ điều khiển tủ: quá 150 s không thấy heartbeat ⇒ mất kết nối
const HEARTBEAT_ONLINE_WINDOW_MS = 150_000;

function batteryColor(pct: number): string {
  if (pct < 20) return "bg-rose-500";
  if (pct < 50) return "bg-amber-500";
  return "bg-emerald-500";
}

type LocationPayload = {
  lockerAddress?: string | null;
  lockerLatitude?: number | null;
  lockerLongitude?: number | null;
};

function openDirections(location: LocationPayload) {
  const { lockerAddress, lockerLatitude, lockerLongitude } = location;
  const url =
    lockerLatitude != null && lockerLongitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lockerLatitude},${lockerLongitude}&travelmode=driving`
      : lockerAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lockerAddress)}`
        : null;

  if (!url) {
    toast.error(i18n.t("admin.maintenance.toast.noLocation"));
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function getRelativeAge(t: TFunction, dateStr?: string | null): string {
  if (!dateStr) return "";
  const createdAt = parseBackendDateTime(dateStr);
  if (!createdAt) return "";
  const diffMs = Date.now() - createdAt.getTime();
  if (diffMs < 0) return t("admin.maintenance.relativeTime.justNow");
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t("admin.maintenance.relativeTime.justNow");
  if (diffMins < 60) return t("admin.maintenance.relativeTime.minutesAgo", { count: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t("admin.maintenance.relativeTime.hoursAgo", { count: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  return t("admin.maintenance.relativeTime.daysAgo", { count: diffDays });
}

function timestampOf(value?: string | null): number {
  return parseBackendDateTime(value)?.getTime() ?? 0;
}

export const SAMPLE_DRONE_DROP_REPORT: LockerReportResponse = {
  id: 9991,
  reportCode: "DRN-DROP-2026-001", // Mã phiếu sự cố đặc biệt khác với RPT-xxx thông thường
  isDroneDrop: true,
  category: "DRONE",
  lockerId: 1,
  lockerCode: "CAB-DEMO-01",
  lockerName: "Tủ thông minh FPT-01 (ĐH FPT)",
  boxId: null,
  boxNumber: null,
  cellType: "DRONE",
  userId: 1,
  title: "Sự cố Drone rơi khẩn cấp — Rơi kiện hàng ORD-2026-8801 cách điểm đáp 350m",
  description:
    "Cảm biến gia tốc phát hiện drone rơi tự do từ độ cao 28m do mất lực nâng cánh quạt số 3. Kiện hàng và drone rơi tại bãi cỏ khuôn viên ĐH FPT (Toạ độ 10.841550, 106.810200). Hệ thống đã kích hoạt quét tìm kiếm KTV Kiosk & Drone gần nhất trong bán kính R.",
  status: "OPEN",
  assignedToUserId: null,
  assignedAt: null,
  resolvedByUserId: null,
  resolvedAt: null,
  createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  lockerAddress: "Khuôn viên Đại học FPT, Đường D1, Khu Công nghệ cao, TP. Thủ Đức",
  lockerLatitude: 10.8411,
  lockerLongitude: 106.8097,
  slaHours: 2,
  slaDueAt: new Date(Date.now() + 95 * 60 * 1000).toISOString(),
  overdue: false,
  reporterName: "Hệ thống Telemetry Drone AI",
  reporterPhone: "0909000999",
  droneUnitId: 101,
  droneCode: "DRN-HCMC-09",
  dropLatitude: 10.84155,
  dropLongitude: 106.8102,
  orderCode: "ORD-2026-8801",
  attachments: [
    {
      id: 901,
      reportId: 9991,
      repairLogId: null,
      stage: "REPORT",
      url: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800",
      thumbnailUrl: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800",
      publicId: "drone_snap_001",
      format: "jpg",
      bytes: 204800,
      width: 1200,
      height: 800,
      caption: "Snapshot camera drone ghi lại khoảnh khắc tiếp đất",
      latitude: 10.84155,
      longitude: 106.8102,
      capturedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      uploadedByUserId: 1,
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 902,
      reportId: 9991,
      repairLogId: null,
      stage: "REPORT",
      url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
      thumbnailUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
      publicId: "drone_scene_001",
      format: "jpg",
      bytes: 204800,
      width: 1200,
      height: 800,
      caption: "Ảnh hiện trường bãi cỏ quanh vị trí rơi",
      latitude: 10.84159,
      longitude: 106.81024,
      capturedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      uploadedByUserId: 12,
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
  ],
};

export default function MaintenanceAdminPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Kiosk operations queries — kích hoạt tự động đồng bộ (polling) để phiếu mới luôn lập tức xuất hiện
  const faults = useGetFaultCellsQuery();
  const reports = useGetMaintenanceReportsQuery(undefined, { pollingInterval: 15000 });
  const deviceStatuses = useGetDeviceStatusesQuery();
  const [claim] = useClaimReportMutation();
  // Admin đóng phiếu qua endpoint admin (PUT /api/admin/lockers/reports/{id}/resolve)
  const [resolveAdmin] = useResolveAdminReportMutation();
  const [clearFault] = useClearBoxFaultMutation();

  // Drone fleet queries & mutations
  const dronesQuery = useGetDronesQuery(undefined, { pollingInterval: 15000 });
  const [createDroneIncidentReport] = useCreateDroneIncidentReportMutation();

  // Users query to get all technicians
  const usersQuery = useGetAllUsersQuery({ page: 0, size: 1000 });
  const allReportsQuery = useGetAllAdminReportsQuery(undefined, { pollingInterval: 15000 });
  const schedulesQuery = useGetMaintenanceSchedulesQuery();
  const schedulesList = useMemo(() => schedulesQuery.data?.data ?? [], [schedulesQuery.data]);
  // Mỗi lần kiểm tra định kỳ là một biên bản — lịch sử thật, không suy từ lastDoneAt của lịch
  const inspectionLogsQuery = useGetAllInspectionLogsQuery();
  const inspectionLogs = useMemo(() => inspectionLogsQuery.data?.data ?? [], [inspectionLogsQuery.data]);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "INCIDENT" | "SCHEDULE">("ALL");
  const [historyAsset, setHistoryAsset] = useState<"KIOSK" | "DRONE">("KIOSK");

  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return tab && ["kiosk", "drone", "schedules"].includes(tab) ? tab : "kiosk";
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const techIdParam = searchParams.get("techId");
    if (tabParam && ["kiosk", "drone", "schedules"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (techIdParam) {
      if (tabParam === "drone") {
        setDroneTechFilter(techIdParam);
      } else {
        setSelectedTechFilter(techIdParam);
      }
    }
  }, [searchParams]);
  const [viewingDrone, setViewingDrone] = useState<DroneResponse | null>(null);
  const [creatingDroneReport, setCreatingDroneReport] = useState(false);
  const [droneFilter, setDroneFilter] = useState<string>("ALL");
  const [droneReportFilter, setDroneReportFilter] = useState<string>("ALL");
  const [droneSearchQuery, setDroneSearchQuery] = useState("");
  const [droneTechFilter, setDroneTechFilter] = useState<string>("ALL");
  const [droneUnitFilter, setDroneUnitFilter] = useState<string>("ALL");
  const [droneDateFilter, setDroneDateFilter] = useState<string>("ALL");
  const [droneReportSort, setDroneReportSort] = useState<"NEWEST_FIRST" | "PRIORITY_NEW" | "SLA_URGENT" | "OLDEST_FIRST">("NEWEST_FIRST");
  const [droneFleetSearch, setDroneFleetSearch] = useState("");
  const [droneBatteryFilter, setDroneBatteryFilter] = useState<"ALL" | "LOW" | "MEDIUM" | "READY">("ALL");

  // Bộ lọc phiếu sự cố Kiosk nâng cao
  const [reportFilter, setReportFilter] = useState<string>("ALL");
  const [selectedTechFilter, setSelectedTechFilter] = useState<string>("ALL");
  const [selectedLockerFilter, setSelectedLockerFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"NEWEST_FIRST" | "PRIORITY_NEW" | "SLA_URGENT" | "OLDEST_FIRST">("NEWEST_FIRST");

  const [assigningReport, setAssigningReport] = useState<LockerReportResponse | null>(null);

  const faultList = faults.data?.data ?? [];
  const allAdminReports = useMemo(() => allReportsQuery.data?.data ?? [], [allReportsQuery.data]);
  const reportList = useMemo(
    () => (allAdminReports.length > 0 ? allAdminReports : (reports.data?.data ?? [])),
    [allAdminReports, reports.data]
  );
  // Chỉ lấy phiếu sự cố Kiosk — loại bỏ hoàn toàn phiếu drone để tab Sự cố Kiosk không lẫn lộn
  const kioskReportList = useMemo(
    () => reportList.filter((r) => !isDroneReport(r)),
    [reportList]
  );
  const droneReportList = useMemo(() => {
    const list = reportList.filter(isDroneReport);
    const hasDropReport = list.some(
      (r) => r.id === SAMPLE_DRONE_DROP_REPORT.id || r.reportCode === SAMPLE_DRONE_DROP_REPORT.reportCode
    );
    return hasDropReport ? list : [SAMPLE_DRONE_DROP_REPORT, ...list];
  }, [reportList]);
  // Danh sách các trạm Kiosk duy nhất có phiếu để hiển thị trong bộ lọc
  const availableLockers = useMemo(() => {
    const map = new Map<number, { id: number; name: string; code?: string | null }>();
    kioskReportList.forEach((r) => {
      if (r.lockerId && !map.has(r.lockerId)) {
        map.set(r.lockerId, {
          id: r.lockerId,
          name: r.lockerName || `Kiosk #${r.lockerId}`,
          code: r.lockerCode,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [kioskReportList]);
  const droneList = useMemo(() => dronesQuery.data?.data ?? [], [dronesQuery.data]);
  const availableDrones = useMemo(
    () => [...droneList].sort((a, b) => (a.code || "").localeCompare(b.code || "")),
    [droneList],
  );
  const deviceList = deviceStatuses.data?.data ?? [];

  // Extract technicians
  const technicians: TechnicianSummary[] = useMemo(() => {
    const raw = usersQuery.data?.data as unknown;
    const list: any[] = Array.isArray(raw)
      ? raw
      : (raw as { content?: any[] })?.content ?? [];

    return list
      .filter((u) => {
        const roles = u.roles ?? [];
        return (
          roles.includes("LOCKER_TECHNICIAN") ||
          roles.includes("ROLE_LOCKER_TECHNICIAN") ||
          roles.includes("DRONE_TECHNICIAN")
        );
      })
      .map((u) => {
        const roles: string[] = u.roles ?? [];
        const isKiosk =
          roles.includes("LOCKER_TECHNICIAN") ||
          roles.includes("ROLE_LOCKER_TECHNICIAN");
        const specialty: "KIOSK" | "DRONE" = isKiosk ? "KIOSK" : "DRONE";
        const specialtyLabel = isKiosk
          ? t("admin.maintenance.specialty.kiosk")
          : t("admin.maintenance.specialty.drone");

        return {
          id: u.id,
          fullName: u.fullName || u.name || t("admin.maintenance.techFallback", { id: u.id }),
          email: u.email || "",
          phoneNumber: u.phoneNumber || "",
          status: (u.status || "ACTIVE").toUpperCase(),
          imageUrl: u.imageUrl || "",
          enabled: (u.status || "ACTIVE").toUpperCase() === "ACTIVE",
          roles,
          specialty,
          specialtyLabel,
        };
      });
  }, [usersQuery.data, t]);

  const techniciansMap = useMemo(() => {
    const map: Record<number, TechnicianSummary> = {};
    for (const tech of technicians) {
      map[tech.id] = tech;
    }
    return map;
  }, [technicians]);

  // Kiosk Stats — chỉ tính trên phiếu Kiosk (không drone). `status` là nguồn sự thật:
  // KTV tự báo đã được server giao luôn (IN_PROGRESS), không đoán theo tên người báo.
  const openReports = kioskReportList.filter((r) => r.status === "OPEN").length;
  const inProgressReports = kioskReportList.filter((r) => r.status === "IN_PROGRESS").length;
  const resolvedReports = kioskReportList.filter((r) => r.status === "RESOLVED").length;
  const overdueReports = kioskReportList.filter((r) => r.overdue).length;

  // Drone Stats
  const droneFaults = droneList.filter((d) => d.status === "FAULT" || d.status === "MAINTENANCE").length;
  const droneLowBattery = droneList.filter((d) => d.batteryPercent != null && d.batteryPercent < 20).length;
  const droneActive = droneList.filter((d) => d.status === "IN_FLIGHT" || d.status === "RESERVED").length;
  const droneReady = droneList.filter((d) => d.status === "IDLE" || d.status === "CHARGING").length;
  const droneOpenReports = droneReportList.filter((r) => r.status === "OPEN").length;
  const droneInProgressReports = droneReportList.filter((r) => r.status === "IN_PROGRESS").length;
  const droneResolvedReports = droneReportList.filter((r) => r.status === "RESOLVED").length;
  const droneOverdueReports = droneReportList.filter((r) => r.overdue).length;

  const [resolvingReport, setResolvingReport] = useState<LockerReportResponse | null>(null);

  // Tên hiển thị "Người tải" cho ảnh phiếu (mọi user, KTV có hậu tố)
  const userNames = useMemo(() => {
    const raw = usersQuery.data?.data as unknown;
    const list: any[] = Array.isArray(raw)
      ? raw
      : (raw as { content?: any[] })?.content ?? [];
    const map: Record<number, string> = {};
    for (const u of list) {
      const name = u.fullName || u.name;
      if (u.id != null && name) map[u.id] = name;
    }
    for (const tech of technicians) map[tech.id] = t("admin.maintenance.techNameSuffix", { name: tech.fullName });
    return map;
  }, [usersQuery.data, technicians, t]);

  const act = async (
    id: number,
    fn: () => Promise<unknown>,
    ok: { title: string; description?: string } | string,
    fail: { title: string; description?: string } | string,
  ) => {
    setPending(id);
    try {
      await fn();
      if (typeof ok === "string") {
        toast.success(ok, { description: t("admin.maintenance.toast.actionRecorded") });
      } else {
        toast.success(ok.title, { description: ok.description });
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.message || (typeof fail === "string" ? fail : fail.description) || t("admin.maintenance.toast.processingError");
      if (typeof fail === "string") {
        toast.error(fail, { description: errorMsg });
      } else {
        toast.error(fail.title, { description: errorMsg });
      }
    } finally {
      setPending(null);
    }
  };

  const filteredDrones = useMemo(() => {
    const filteredByStatus = droneFilter === "ALL"
      ? droneList
      : droneFilter === "ATTENTION"
        ? droneList.filter(
        (d) => d.status === "FAULT" || d.status === "MAINTENANCE" || (d.batteryPercent != null && d.batteryPercent < 20),
      )
        : droneList.filter((d) => d.status === droneFilter);

    const query = droneFleetSearch.trim().toLowerCase();
    return filteredByStatus
      .filter((d) => {
        const battery = d.batteryPercent ?? 0;
        if (droneBatteryFilter === "LOW" && battery >= 20) return false;
        if (droneBatteryFilter === "MEDIUM" && (battery < 20 || battery >= 50)) return false;
        if (droneBatteryFilter === "READY" && battery < 50) return false;
        if (!query) return true;
        return [d.code, d.lockerName, d.assignedTechnicianName, d.faultReason]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const attentionA = a.status === "FAULT" || a.status === "MAINTENANCE" || (a.batteryPercent ?? 0) < 20 ? 1 : 0;
        const attentionB = b.status === "FAULT" || b.status === "MAINTENANCE" || (b.batteryPercent ?? 0) < 20 ? 1 : 0;
        if (attentionA !== attentionB) return attentionB - attentionA;
        return (a.code || "").localeCompare(b.code || "");
      });
  }, [droneList, droneFilter, droneFleetSearch, droneBatteryFilter]);

  const filteredDroneReports = useMemo(() => {
    const query = droneSearchQuery.trim().toLowerCase();
    return droneReportList
      .filter((r) => {
        if (droneReportFilter === "OVERDUE") {
          if (!r.overdue) return false;
        } else if (droneReportFilter !== "ALL" && r.status !== droneReportFilter) {
          return false;
        }
        if (droneTechFilter === "UNASSIGNED" && r.assignedToUserId) return false;
        if (droneTechFilter !== "ALL" && droneTechFilter !== "UNASSIGNED" && String(r.assignedToUserId) !== droneTechFilter) return false;
        const droneCode = r.droneCode;
        if (
          droneUnitFilter !== "ALL"
          && droneCode !== droneUnitFilter
          && !r.title.toLowerCase().includes(droneUnitFilter.toLowerCase())
        ) return false;
        if (droneDateFilter !== "ALL" && r.createdAt) {
          const age = Date.now() - timestampOf(r.createdAt);
          if (droneDateFilter === "TODAY" && age > 86400000) return false;
          if (droneDateFilter === "7_DAYS" && age > 7 * 86400000) return false;
          if (droneDateFilter === "30_DAYS" && age > 30 * 86400000) return false;
        }
        if (!query) return true;
        return [
          `rpt-${r.id}`,
          r.title,
          cleanDescription(r.description),
          (r as LockerReportResponse & { droneCode?: string }).droneCode,
          r.lockerName,
          r.reporterName,
          r.reporterPhone,
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const timeA = timestampOf(a.createdAt);
        const timeB = timestampOf(b.createdAt);
        if (droneReportSort === "OLDEST_FIRST") return timeA - timeB;
        if (droneReportSort === "PRIORITY_NEW") {
          const priorityA = a.status === "OPEN" ? 1 : 0;
          const priorityB = b.status === "OPEN" ? 1 : 0;
          return priorityB - priorityA || timeB - timeA;
        }
        if (droneReportSort === "SLA_URGENT") {
          const slaA = a.slaDueAt ? timestampOf(a.slaDueAt) : Infinity;
          const slaB = b.slaDueAt ? timestampOf(b.slaDueAt) : Infinity;
          return slaA - slaB;
        }
        return timeB - timeA;
      });
  }, [droneReportList, droneReportFilter, droneSearchQuery, droneTechFilter, droneUnitFilter, droneDateFilter, droneReportSort]);

  const hasDroneReportFilters = droneSearchQuery.trim() !== "" || droneReportFilter !== "ALL" || droneTechFilter !== "ALL" || droneUnitFilter !== "ALL" || droneDateFilter !== "ALL" || droneReportSort !== "NEWEST_FIRST";
  const resetDroneReportFilters = () => {
    setDroneSearchQuery("");
    setDroneReportFilter("ALL");
    setDroneTechFilter("ALL");
    setDroneUnitFilter("ALL");
    setDroneDateFilter("ALL");
    setDroneReportSort("NEWEST_FIRST");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    reportFilter !== "ALL" ||
    selectedTechFilter !== "ALL" ||
    selectedLockerFilter !== "ALL" ||
    dateFilter !== "ALL" ||
    sortBy !== "NEWEST_FIRST";

  const handleResetFilters = () => {
    setSearchQuery("");
    setReportFilter("ALL");
    setSelectedTechFilter("ALL");
    setSelectedLockerFilter("ALL");
    setDateFilter("ALL");
    setSortBy("NEWEST_FIRST");
  };

  const filteredReports = useMemo(() => {
    const list = kioskReportList.filter((r) => {
      // 1. Trạng thái phiếu
      if (reportFilter === "OVERDUE") {
        if (!r.overdue) return false;
      } else if (reportFilter !== "ALL" && r.status !== reportFilter) {
        return false;
      }

      // 2. Kỹ thuật viên
      if (selectedTechFilter === "UNASSIGNED") {
        if (r.assignedToUserId) return false;
      } else if (selectedTechFilter !== "ALL") {
        if (String(r.assignedToUserId) !== selectedTechFilter) return false;
      }

      // 3. Trạm Kiosk
      if (selectedLockerFilter !== "ALL") {
        if (String(r.lockerId) !== selectedLockerFilter) return false;
      }

      // 4. Mốc thời gian
      if (dateFilter !== "ALL" && r.createdAt) {
        const created = parseBackendDateTime(r.createdAt);
        if (!created) return false;
        const now = new Date();
        if (dateFilter === "TODAY") {
          const isToday =
            created.getDate() === now.getDate() &&
            created.getMonth() === now.getMonth() &&
            created.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === "7_DAYS") {
          const diffMs = now.getTime() - created.getTime();
          if (diffMs > 7 * 86400000) return false;
        } else if (dateFilter === "30_DAYS") {
          const diffMs = now.getTime() - created.getTime();
          if (diffMs > 30 * 86400000) return false;
        }
      }

      // 5. Tìm kiếm từ khóa (Mã phiếu, Tiêu đề, Mô tả, Tên trạm, Mã trạm, Số ô, Người báo, SĐT)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idStr = `#${r.id}`;
        const rptStr = `rpt-${r.id}`;
        const match =
          idStr.includes(q) ||
          rptStr.includes(q) ||
          String(r.id).includes(q) ||
          (r.title || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          (r.lockerName || "").toLowerCase().includes(q) ||
          (r.lockerCode || "").toLowerCase().includes(q) ||
          (r.boxNumber ? `ô ${r.boxNumber}` : r.boxId ? `ô ${r.boxId}` : "").includes(q) ||
          (r.reporterName || "").toLowerCase().includes(q) ||
          (r.reporterPhone || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    // Sắp xếp: đảm bảo các phiếu khi vừa mới có phải hiển thị lên đầu tiên
    return list.sort((a, b) => {
      const timeA = timestampOf(a.createdAt);
      const timeB = timestampOf(b.createdAt);

      if (sortBy === "PRIORITY_NEW") {
        // Ưu tiên cao nhất: Phiếu OPEN hoặc Quá hạn SLA lên trước
        const isPriorityA = a.status === "OPEN" || Boolean(a.overdue) ? 1 : 0;
        const isPriorityB = b.status === "OPEN" || Boolean(b.overdue) ? 1 : 0;
        if (isPriorityA !== isPriorityB) return isPriorityB - isPriorityA;
        return timeB - timeA;
      }

      if (sortBy === "SLA_URGENT") {
        const slaA = a.slaDueAt ? timestampOf(a.slaDueAt) : Infinity;
        const slaB = b.slaDueAt ? timestampOf(b.slaDueAt) : Infinity;
        return slaA - slaB;
      }

      if (sortBy === "OLDEST_FIRST") {
        return timeA - timeB;
      }

      // Mặc định: NEWEST_FIRST (Mới nhất lên đầu)
      return timeB - timeA;
    });
  }, [
    kioskReportList,
    reportFilter,
    selectedTechFilter,
    selectedLockerFilter,
    dateFilter,
    searchQuery,
    sortBy,
  ]);

  // Phiếu OPEN chưa ai nhận: chờ KTV phụ trách tủ (routedToUserId) hoặc đã báo mọi KTV tủ (null).
  // undefined = backend cũ chưa trả trường định tuyến.
  const routingLabel = (r: LockerReportResponse): string => {
    if (r.routedToUserId === undefined) return t("common.unassigned");
    // Phiếu tạo trước khi có định tuyến cũng không có routedToUserId ⇒ ghi trung tính.
    if (r.routedToUserId === null) return t("admin.maintenance.routing.awaitingLockerTech");
    const name =
      techniciansMap[r.routedToUserId]?.fullName ??
      userNames[r.routedToUserId] ??
      t("admin.maintenance.techFallback", { id: r.routedToUserId });
    return t("admin.maintenance.routing.awaitingNamed", { name });
  };

  const refetchAll = () => {
    faults.refetch();
    reports.refetch();
    deviceStatuses.refetch();
    dronesQuery.refetch();
    usersQuery.refetch();
    allReportsQuery.refetch();
    toast.info(t("admin.maintenance.page.syncing"));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title={t("admin.maintenance.page.title")}
          description={t("admin.maintenance.page.description")}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 font-medium shadow-xs"
          onClick={refetchAll}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t("admin.maintenance.page.syncDevices")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-3xl h-11 p-1 bg-muted/60 border border-border/50 rounded-xl">
          <TabsTrigger
            value="kiosk"
            className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Boxes className="w-4 h-4 text-orange-600" />
            {t("admin.maintenance.tabs.kiosk", { count: openReports + inProgressReports })}
          </TabsTrigger>
          <TabsTrigger
            value="drone"
            className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Plane className="w-4 h-4 text-blue-600" />
            {t("admin.maintenance.tabs.drone", { count: droneOpenReports + droneInProgressReports })}
          </TabsTrigger>
          <TabsTrigger
            value="schedules"
            className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <CalendarClock className="w-4 h-4 text-emerald-600" />
            {t("admin.maintenance.tabs.schedules")}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BẢO TRÌ KIOSK */}
        <TabsContent value="kiosk" className="space-y-6">
          {/* Kiosk KPI Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.kpi.openIncidents")}</p>
                  <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {openReports + inProgressReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-rose-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{openReports + inProgressReports > 0 ? t("admin.maintenance.kpi.needsAction") : t("admin.maintenance.kpi.noIncidents")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.kpi.newReports")}</p>
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {openReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-amber-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{openReports > 0 ? t("admin.maintenance.kpi.awaitingTech", { count: openReports }) : t("admin.maintenance.kpi.allClaimed")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.status.inProgress")}</p>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {inProgressReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-blue-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{t("admin.maintenance.kpi.techWorking")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.status.resolved")}</p>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {resolvedReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-emerald-600">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>{t("admin.maintenance.kpi.highCompletion")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert Banner cảnh báo sự cố Kiosk quá hạn SLA */}
          {overdueReports > 0 && (
            <Card className="border-amber-200/80 bg-amber-50/40 shadow-xs">
              <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-amber-900">
                      {t("admin.maintenance.overdueBanner.kioskTitle", { count: overdueReports })}
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {t("admin.maintenance.overdueBanner.kioskDesc")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 bg-white"
                  onClick={() => setReportFilter("OVERDUE")}
                >
                  {t("admin.maintenance.overdueBanner.viewOverdue")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Phiếu Sự Cố Kiosk */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-500" />
                    {t("admin.maintenance.reports.kioskTitle", { count: kioskReportList.length })}
                    {overdueReports > 0 && (
                      <Badge variant="outline" className="ml-1 bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                        {t("admin.maintenance.reports.overdueCount", { count: overdueReports })}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("admin.maintenance.reports.kioskDesc")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono font-medium bg-muted">
                    {t("admin.maintenance.reports.showing", { shown: filteredReports.length, total: kioskReportList.length })}
                  </Badge>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t("admin.maintenance.filters.resetFilters")}
                    </Button>
                  )}
                </div>
              </div>

              {/* BỘ LỌC ĐA NĂNG (FILTER TOOLBAR) */}
              <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
                {/* Hàng 1: Ô tìm kiếm + Các Dropdown lọc */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
                  {/* Ô tìm kiếm */}
                  <div className="relative md:col-span-4">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("admin.maintenance.reports.kioskSearch")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-7 h-8 text-xs bg-background"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Lọc KTV */}
                  <div className="md:col-span-2">
                    <Select value={selectedTechFilter} onValueChange={setSelectedTechFilter}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background">
                        <SelectValue placeholder={t("admin.maintenance.filters.filterByTech")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("admin.maintenance.filters.allTechnicians")}</SelectItem>
                        <SelectItem value="UNASSIGNED">{t("admin.maintenance.filters.unassignedNew")}</SelectItem>
                        {technicians.map((tech) => (
                          <SelectItem key={tech.id} value={String(tech.id)}>
                            {tech.fullName} (#{tech.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lọc Trạm Kiosk */}
                  <div className="md:col-span-2">
                    <Select value={selectedLockerFilter} onValueChange={setSelectedLockerFilter}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background">
                        <SelectValue placeholder={t("admin.maintenance.filters.kioskStation")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("admin.maintenance.filters.allKioskStations")}</SelectItem>
                        {availableLockers.map((lk) => (
                          <SelectItem key={lk.id} value={String(lk.id)}>
                            {lk.name} {lk.code ? `(${lk.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lọc Thời gian */}
                  <div className="md:col-span-2">
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background">
                        <SelectValue placeholder={t("common.time")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("admin.maintenance.filters.allTime")}</SelectItem>
                        <SelectItem value="TODAY">{t("common.today")}</SelectItem>
                        <SelectItem value="7_DAYS">{t("admin.maintenance.filters.last7Days")}</SelectItem>
                        <SelectItem value="30_DAYS">{t("admin.maintenance.filters.last30Days")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sắp xếp */}
                  <div className="md:col-span-2">
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background font-medium border-primary/40 text-primary">
                        <SelectValue placeholder={t("common.sort")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEWEST_FIRST">{t("admin.maintenance.filters.sortNewest")}</SelectItem>
                        <SelectItem value="PRIORITY_NEW">{t("admin.maintenance.filters.sortPriority")}</SelectItem>
                        <SelectItem value="SLA_URGENT">{t("admin.maintenance.filters.sortSla")}</SelectItem>
                        <SelectItem value="OLDEST_FIRST">{t("admin.maintenance.filters.sortOldest")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Hàng 2: Nút chọn Trạng thái (Status Tabs) & Filter tags */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { id: "ALL", label: t("admin.maintenance.filters.statusAll", { count: kioskReportList.length }) },
                      { id: "OPEN", label: t("admin.maintenance.filters.statusOpen", { count: openReports }), isNewPulse: openReports > 0 },
                      { id: "IN_PROGRESS", label: t("admin.maintenance.filters.statusInProgress", { count: inProgressReports }) },
                      { id: "OVERDUE", label: t("admin.maintenance.filters.statusOverdue", { count: overdueReports }), isDanger: overdueReports > 0 },
                      { id: "RESOLVED", label: t("admin.maintenance.filters.statusResolved", { count: resolvedReports }) },
                    ].map(({ id: st, label, isNewPulse, isDanger }) => (
                      <Button
                        key={st}
                        variant="outline"
                        size="sm"
                        onClick={() => setReportFilter(st)}
                        className={`h-7 px-2.5 text-xs font-medium transition-all ${
                          reportFilter === st
                            ? st === "OVERDUE"
                              ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 shadow-xs"
                              : st === "OPEN"
                                ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700 shadow-xs"
                                : "bg-primary text-primary-foreground border-primary shadow-xs"
                            : isDanger
                              ? "text-rose-600 border-rose-300 bg-rose-50/60 hover:bg-rose-100"
                              : isNewPulse
                                ? "text-amber-700 border-amber-300 bg-amber-50/70 hover:bg-amber-100 font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isNewPulse && (
                          <span className="relative flex h-2 w-2 mr-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                        )}
                        {label}
                      </Button>
                    ))}
                  </div>

                  {/* Active Filter summary tags */}
                  {hasActiveFilters && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                      <span>{t("admin.maintenance.filters.activeFilters")}</span>
                      {searchQuery && (
                        <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">
                          {t("admin.maintenance.filters.keywordChip", { query: searchQuery })}
                          <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setSearchQuery("")} />
                        </Badge>
                      )}
                      {selectedTechFilter !== "ALL" && (
                        <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">
                          {selectedTechFilter === "UNASSIGNED"
                            ? t("common.unassigned")
                            : t("admin.maintenance.technicianLabel", { name: techniciansMap[Number(selectedTechFilter)]?.fullName ?? selectedTechFilter })}
                          <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedTechFilter("ALL")} />
                        </Badge>
                      )}
                      {selectedLockerFilter !== "ALL" && (
                        <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">
                          {t("admin.maintenance.labels.station", { name: availableLockers.find((l) => String(l.id) === selectedLockerFilter)?.name ?? selectedLockerFilter })}
                          <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedLockerFilter("ALL")} />
                        </Badge>
                      )}
                      {dateFilter !== "ALL" && (
                        <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">
                          {t("admin.maintenance.filters.timeChip", {
                            range: dateFilter === "TODAY"
                              ? t("common.today")
                              : dateFilter === "7_DAYS"
                                ? t("admin.maintenance.filters.past7Days")
                                : t("admin.maintenance.filters.past30Days"),
                          })}
                          <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setDateFilter("ALL")} />
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const openCount = filteredReports.filter((r) => r.status === "OPEN").length;
                return openCount > 0 ? (
                  <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                        <Trans
                          i18nKey="admin.maintenance.reports.newBannerKiosk"
                          values={{ count: openCount }}
                          components={{ b: <span className="font-bold" /> }}
                        />
                      </p>
                    </div>
                    {reportFilter !== "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReportFilter("OPEN")}
                        className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
                      >
                        {t("admin.maintenance.reports.onlyNew")}
                      </Button>
                    )}
                  </div>
                ) : null;
              })()}

              {filteredReports.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("admin.maintenance.reports.noMatchKiosk")}</p>
                  <p className="text-xs text-muted-foreground">{t("admin.maintenance.reports.noMatchHint")}</p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-8 text-xs gap-1 mt-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t("admin.maintenance.filters.resetAllFilters")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredReports.map((r) => {
                    const isNew = r.status === "OPEN";
                    const isRecent = r.createdAt && (Date.now() - timestampOf(r.createdAt)) < 3600000;
                    const assignedTech = r.assignedToUserId ? techniciansMap[r.assignedToUserId] : undefined;

                    return (
                      <div
                        key={r.id}
                        className={`py-3.5 flex items-center justify-between gap-4 flex-wrap px-3 rounded-xl transition-all ${
                          isNew
                            ? "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-200/70 dark:ring-amber-900/40 my-1"
                            : "hover:bg-muted/20 my-0.5 border border-transparent"
                        }`}
                      >
                        <div className="max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">
                              {r.reportCode || `RPT-${r.id}`} · {r.title}
                            </p>
                            {/* Status Badge */}
                            {isNew ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-500 text-white border-amber-600 font-bold text-xs shadow-xs flex items-center gap-1.5 px-2.5 py-0.5 animate-pulse"
                              >
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                {t("admin.maintenance.status.openAwaitingTechUpper")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={`text-xs ${REPORT_BADGE[r.status] ?? ""}`}>
                                {r.status === "IN_PROGRESS" ? t("admin.maintenance.status.inProgress") : r.status === "RESOLVED" ? t("admin.maintenance.status.resolved") : r.status}
                              </Badge>
                            )}
                            {isRecent && !isNew && (
                              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[11px] shadow-xs flex items-center gap-1 px-2 py-0.5">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                {t("admin.maintenance.status.justCreated")}
                              </Badge>
                            )}
                            {r.blocksLocker && r.status !== "RESOLVED" && (
                              <Badge
                                variant="outline"
                                className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs"
                                title={t("admin.maintenance.reports.blocksLockerHint")}
                              >
                                {t("admin.maintenance.reports.blocksLocker")}
                              </Badge>
                            )}
                            {r.scheduleId != null && (
                              <Badge
                                variant="outline"
                                className="bg-sky-50 text-sky-800 border-sky-300 font-medium text-xs"
                                title={t("admin.maintenance.reports.fromScheduleHint", { id: r.scheduleId })}
                              >
                                {t("admin.maintenance.reports.fromSchedule")}
                              </Badge>
                            )}
                            {r.overdue && (
                              <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                                {t("admin.maintenance.status.overdueSla")}
                              </Badge>
                            )}
                            <SlaCountdownBadge
                              slaDueAt={r.slaDueAt}
                              createdAt={r.createdAt}
                              slaHours={r.slaHours ?? 4}
                              status={r.status}
                            />
                          {/* Technician badge — chỉ theo người được giao (assignedToUserId) */}
                          {r.assignedToUserId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/technicians/${r.assignedToUserId}`)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200 transition-colors cursor-pointer"
                              title={t("admin.maintenance.reports.viewTechProfile")}
                            >
                              <UserCheck className="w-3 h-3 text-indigo-700" />
                              <span>
                                {t("admin.maintenance.technicianLabel", { name: assignedTech?.fullName ?? userNames[r.assignedToUserId] ?? `#${r.assignedToUserId}` })}
                              </span>
                              {assignedTech?.phoneNumber && (
                                <span className="text-[10px] text-indigo-600 font-mono">
                                  ({assignedTech.phoneNumber})
                                </span>
                              )}
                            </button>
                          ) : r.status === "OPEN" ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold">
                              {routingLabel(r)}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="text-foreground">{cleanDescription(r.description) || r.description}</span> · <span className="font-medium text-foreground">{r.lockerName ?? `Kiosk #${r.lockerId}`}</span>
                          {r.boxNumber
                            ? ` · ${t("admin.maintenance.boxNumber", { number: r.boxNumber })}`
                            : r.boxId
                              ? ` · ${t("admin.maintenance.boxNumber", { number: r.boxId })}`
                              : ""}{" "}
                          {r.cellType ? `· ${t("admin.maintenance.reports.cellType", { type: r.cellType })} ` : ""}
                          · {t("common.createdAtTime")}: <span className="text-foreground font-mono">{formatDateTime(r.createdAt)}</span>{" "}
                          {r.createdAt && (
                            <span className="text-[11px] text-muted-foreground font-medium">
                              ({getRelativeAge(t, r.createdAt)})
                            </span>
                          )}
                        </p>
                        {(r.reporterName || r.reporterPhone) && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            {[r.reporterName, r.reporterPhone].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {r.lockerAddress && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {r.lockerAddress}
                          </p>
                        )}

                        <ReportPhotoGroups report={r} variant="compact" userNames={userNames} />
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <RepairLogDialog
                          reportId={r.id}
                          title={`${r.reportCode || `RPT-${r.id}`} · ${r.title}`}
                          technicianName={
                            r.assignedToUserId
                              ? assignedTech?.fullName ?? userNames[r.assignedToUserId]
                              : undefined
                          }
                          report={r}
                        />

                        {r.status === "OPEN" && (
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold hover:shadow-indigo-200"
                            onClick={() => setAssigningReport(r)}
                          >
                            <Boxes className="w-3.5 h-3.5" /> {t("admin.maintenance.reports.assignTech")}
                          </Button>
                        )}

                        {r.status === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                            onClick={() => setAssigningReport(r)}
                          >
                            <UserCheck className="w-3.5 h-3.5" /> {t("admin.maintenance.reports.changeTech")}
                          </Button>
                        )}

                        {(r.status === "OPEN" || r.status === "IN_PROGRESS") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => setResolvingReport(r)}
                            disabled={pending === r.id}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t("admin.maintenance.reports.complete")}
                          </Button>
                        )}

                        {r.status === "RESOLVED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t("admin.maintenance.reports.techDone")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </CardContent>
          </Card>

          {/* Sức Khỏe Kiosk (Cabinet Heartbeat) */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600" />
                {t("admin.maintenance.heartbeat.title")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("admin.maintenance.heartbeat.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deviceList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{t("admin.maintenance.heartbeat.empty")}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {deviceList.map((d) => {
                    // Trạng thái lưu có thể cũ (tủ mất điện không kịp báo OFFLINE) ⇒ đòi thêm heartbeat gần đây
                    const lastSeen = parseBackendDateTime(d.lastSeenAt);
                    const online =
                      d.status?.toUpperCase() === "ONLINE" &&
                      lastSeen != null &&
                      Date.now() - lastSeen.getTime() <= HEARTBEAT_ONLINE_WINDOW_MS;
                    return (
                      <div
                        key={d.id}
                        className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between gap-3 hover:border-border transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              online ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"
                            }`}
                          >
                            {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{d.deviceId}</p>
                            <p className="text-xs text-muted-foreground">
                              {d.lockerId ? t("admin.maintenance.heartbeat.station", { id: d.lockerId }) : t("admin.maintenance.heartbeat.unlinked")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              online
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                                : "bg-rose-50 text-rose-700 border-rose-200 text-xs"
                            }
                          >
                            {online ? t("admin.maintenance.heartbeat.online") : t("common.disconnected")}
                          </Badge>
                          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                            {formatDateTime(d.lastSeenAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: BẢO TRÌ & PIN DRONE */}
        <TabsContent value="drone" className="space-y-6">
          {/* Drone KPI Cards — cùng layout với Bảo trì Kiosk */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.kpi.openIncidents")}</p>
                  <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneOpenReports + droneInProgressReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-rose-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{droneOpenReports + droneInProgressReports > 0 ? t("admin.maintenance.kpi.needsAction") : t("admin.maintenance.kpi.noIncidents")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.kpi.newReports")}</p>
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneOpenReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-amber-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{droneOpenReports > 0 ? t("admin.maintenance.kpi.awaitingTech", { count: droneOpenReports }) : t("admin.maintenance.kpi.allClaimed")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.status.inProgress")}</p>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneInProgressReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-blue-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{t("admin.maintenance.kpi.techWorking")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.status.resolved")}</p>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneResolvedReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-emerald-600">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>{t("admin.maintenance.kpi.highCompletion")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cảnh báo SLA — cùng layout với Bảo trì Kiosk */}
          {droneOverdueReports > 0 && (
            <Card className="border-amber-200/80 bg-amber-50/40 shadow-xs">
              <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-amber-900">
                      {t("admin.maintenance.overdueBanner.droneTitle", { count: droneOverdueReports })}
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {t("admin.maintenance.overdueBanner.droneDesc")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 bg-white"
                  onClick={() => setDroneReportFilter("OVERDUE")}
                >
                  {t("admin.maintenance.overdueBanner.viewOverdue")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Phiếu sự cố Drone — cùng cấu trúc vận hành với phiếu Kiosk */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    {t("admin.maintenance.reports.droneTitle", { count: droneReportList.length })}
                    {droneOverdueReports > 0 && (
                      <Badge variant="outline" className="ml-1 bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                        {t("admin.maintenance.reports.overdueCount", { count: droneOverdueReports })}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("admin.maintenance.reports.droneDesc")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold"
                    onClick={() => setCreatingDroneReport(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("admin.maintenance.reports.createDrone")}
                  </Button>
                  <Badge variant="secondary" className="text-xs font-mono font-medium bg-muted">
                    {t("admin.maintenance.reports.showing", { shown: filteredDroneReports.length, total: droneReportList.length })}
                  </Badge>
                  {hasDroneReportFilters && (
                    <Button variant="ghost" size="sm" onClick={resetDroneReportFilters} className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1">
                      <RotateCcw className="w-3.5 h-3.5" /> {t("admin.maintenance.filters.resetFilters")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
                  <div className="relative md:col-span-4">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("admin.maintenance.reports.droneSearch")}
                      value={droneSearchQuery}
                      onChange={(e) => setDroneSearchQuery(e.target.value)}
                      className="pl-8 pr-7 h-8 text-xs bg-background"
                    />
                    {droneSearchQuery && (
                      <button type="button" onClick={() => setDroneSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Select value={droneTechFilter} onValueChange={setDroneTechFilter}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background"><SelectValue placeholder={t("admin.maintenance.filters.droneTech")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("admin.maintenance.filters.allDroneTechs")}</SelectItem>
                        <SelectItem value="UNASSIGNED">{t("common.unassigned")}</SelectItem>
                        {technicians.filter((tech) => tech.specialty === "DRONE").map((tech) => (
                          <SelectItem key={tech.id} value={String(tech.id)}>{tech.fullName} (#{tech.id})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select value={droneUnitFilter} onValueChange={setDroneUnitFilter}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background"><SelectValue placeholder={t("admin.maintenance.filters.droneDevice")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("admin.maintenance.filters.allDroneDevices")}</SelectItem>
                        {availableDrones.map((drone) => (
                          <SelectItem key={drone.id} value={drone.code}>{drone.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select value={droneDateFilter} onValueChange={setDroneDateFilter}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background"><SelectValue placeholder={t("common.time")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("admin.maintenance.filters.allTime")}</SelectItem>
                        <SelectItem value="TODAY">{t("common.today")}</SelectItem>
                        <SelectItem value="7_DAYS">{t("admin.maintenance.filters.last7Days")}</SelectItem>
                        <SelectItem value="30_DAYS">{t("admin.maintenance.filters.last30Days")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select value={droneReportSort} onValueChange={(value: "NEWEST_FIRST" | "PRIORITY_NEW" | "SLA_URGENT" | "OLDEST_FIRST") => setDroneReportSort(value)}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background font-medium border-primary/40 text-primary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEWEST_FIRST">{t("admin.maintenance.filters.sortNewest")}</SelectItem>
                        <SelectItem value="PRIORITY_NEW">{t("admin.maintenance.filters.sortPriority")}</SelectItem>
                        <SelectItem value="SLA_URGENT">{t("admin.maintenance.filters.sortSla")}</SelectItem>
                        <SelectItem value="OLDEST_FIRST">{t("admin.maintenance.filters.sortOldest")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: "ALL", label: t("admin.maintenance.filters.statusAll", { count: droneReportList.length }) },
                    { id: "OPEN", label: t("admin.maintenance.filters.statusOpen", { count: droneOpenReports }), isNewPulse: droneOpenReports > 0 },
                    { id: "IN_PROGRESS", label: t("admin.maintenance.filters.statusInProgress", { count: droneInProgressReports }) },
                    { id: "OVERDUE", label: t("admin.maintenance.filters.statusOverdue", { count: droneOverdueReports }), isDanger: droneOverdueReports > 0 },
                    { id: "RESOLVED", label: t("admin.maintenance.filters.statusResolved", { count: droneResolvedReports }) },
                  ].map(({ id: status, label, isNewPulse, isDanger }) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => setDroneReportFilter(status)}
                      className={`h-7 px-2.5 text-xs font-medium transition-all ${
                        droneReportFilter === status
                          ? status === "OVERDUE"
                            ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 shadow-xs"
                            : status === "OPEN"
                              ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700 shadow-xs"
                              : "bg-primary text-primary-foreground border-primary shadow-xs"
                          : isDanger
                            ? "text-rose-600 border-rose-300 bg-rose-50/60 hover:bg-rose-100"
                            : isNewPulse
                              ? "text-amber-700 border-amber-300 bg-amber-50/70 hover:bg-amber-100 font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isNewPulse && (
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      )}
                      {label}
                    </Button>
                  ))}
                </div>
                {hasDroneReportFilters && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                    <span>{t("admin.maintenance.filters.activeFilters")}</span>
                    {droneSearchQuery && <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">{t("admin.maintenance.filters.keywordChip", { query: droneSearchQuery })}<X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setDroneSearchQuery("")} /></Badge>}
                    {droneTechFilter !== "ALL" && <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">{droneTechFilter === "UNASSIGNED" ? t("common.unassigned") : t("admin.maintenance.technicianLabel", { name: techniciansMap[Number(droneTechFilter)]?.fullName ?? droneTechFilter })}<X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setDroneTechFilter("ALL")} /></Badge>}
                    {droneUnitFilter !== "ALL" && <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">Drone: {droneUnitFilter}<X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setDroneUnitFilter("ALL")} /></Badge>}
                    {droneDateFilter !== "ALL" && <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">{t("admin.maintenance.filters.timeChip", { range: droneDateFilter === "TODAY" ? t("common.today") : droneDateFilter === "7_DAYS" ? t("admin.maintenance.filters.past7Days") : t("admin.maintenance.filters.past30Days") })}<X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setDroneDateFilter("ALL")} /></Badge>}
                  </div>
                )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const openCount = filteredDroneReports.filter((report) => report.status === "OPEN").length;
                return openCount > 0 ? (
                  <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                        <Trans
                          i18nKey="admin.maintenance.reports.newBannerDrone"
                          values={{ count: openCount }}
                          components={{ b: <span className="font-bold" /> }}
                        />
                      </p>
                    </div>
                    {droneReportFilter !== "OPEN" && (
                      <Button size="sm" variant="outline" onClick={() => setDroneReportFilter("OPEN")} className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300">
                        {t("admin.maintenance.reports.onlyNew")}
                      </Button>
                    )}
                  </div>
                ) : null;
              })()}
              {filteredDroneReports.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("admin.maintenance.reports.noMatchDrone")}</p>
                  <p className="text-xs text-muted-foreground">{t("admin.maintenance.reports.noMatchHint")}</p>
                  {hasDroneReportFilters && (
                    <Button variant="outline" size="sm" onClick={resetDroneReportFilters} className="h-8 text-xs gap-1 mt-2">
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t("admin.maintenance.filters.resetAllFilters")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredDroneReports.map((report) => {
                    const assignedTech = report.assignedToUserId ? techniciansMap[report.assignedToUserId] : undefined;
                    const droneCode = (report as LockerReportResponse & { droneCode?: string }).droneCode;
                    const isNew = report.status === "OPEN";
                    const isDropIncident = Boolean(
                      report.isDroneDrop ||
                      report.reportCode?.startsWith("DRN-DROP") ||
                      report.id === SAMPLE_DRONE_DROP_REPORT.id
                    );
                    const displayCode = report.reportCode || `RPT-${report.id}`;
                    return (
                      <div
                        key={report.id}
                        className={`py-3.5 flex items-center justify-between gap-4 flex-wrap px-3 rounded-xl transition-all ${
                          isDropIncident
                            ? "border-l-4 border-l-red-600 bg-red-50/70 dark:bg-red-950/30 ring-1 ring-red-300 dark:ring-red-900/60 my-1.5 shadow-sm"
                            : isNew
                              ? "border-l-4 border-l-amber-500 bg-amber-50/50 ring-1 ring-amber-200/70 my-1"
                              : "hover:bg-muted/20 my-0.5 border border-transparent"
                        }`}
                      >
                        <div className="max-w-2xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isDropIncident ? (
                              <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-300 shadow-xs tracking-wide">
                                {displayCode}
                              </span>
                            ) : (
                              <p className="font-semibold text-sm text-foreground">{displayCode}</p>
                            )}
                            <p className="font-semibold text-sm text-foreground">· {report.title}</p>
                            {isDropIncident && (
                              <Badge className="bg-red-600 text-white border-red-700 font-bold text-xs shadow-xs animate-pulse flex items-center gap-1.5">
                                <Radio className="w-3 h-3 animate-ping" />
                                🚨 SỰ CỐ RƠI DRONE KHẨN CẤP
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                isDropIncident
                                  ? "bg-red-100 text-red-800 border-red-300 font-semibold"
                                  : REPORT_BADGE[report.status] ?? ""
                              }`}
                            >
                              {report.status === "OPEN"
                                ? isDropIncident
                                  ? "MỚI MỞ · CẦN ĐIỀU PHỐI TÌM KIẾM"
                                  : t("admin.maintenance.status.openAwaitingDroneTech")
                                : report.status === "IN_PROGRESS"
                                  ? t("admin.maintenance.status.inProgress")
                                  : report.status === "RESOLVED"
                                    ? t("admin.maintenance.status.resolved")
                                    : report.status}
                            </Badge>
                            {report.overdue && <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">{t("admin.maintenance.status.overdueSla")}</Badge>}
                            <SlaCountdownBadge slaDueAt={report.slaDueAt} createdAt={report.createdAt} slaHours={report.slaHours ?? 4} status={report.status} />
                            {report.assignedToUserId ? (
                              <button type="button" onClick={() => navigate(`/admin/technicians/${report.assignedToUserId}`)} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200">
                                <UserCheck className="w-3 h-3" /> {t("admin.maintenance.technicianLabel", { name: assignedTech?.fullName ?? userNames[report.assignedToUserId] ?? `#${report.assignedToUserId}` })}
                              </button>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-foreground">{cleanDescription(report.description) || report.description}</span>
                            {" · "}<span className="font-medium text-foreground">{droneCode ? `Drone ${droneCode}` : report.lockerName ?? t("admin.maintenance.reports.flyingDevice")}</span>
                            {report.dropLatitude != null && (
                              <>
                                {" · "}Tọa độ rơi: <span className="font-mono text-red-700 font-semibold">{report.dropLatitude.toFixed(6)}, {report.dropLongitude?.toFixed(6)}</span>
                              </>
                            )}
                            {report.orderCode && (
                              <>
                                {" · "}Mã đơn: <span className="font-mono text-foreground font-semibold">{report.orderCode}</span>
                              </>
                            )}
                            {" · "}{t("common.createdAtTime")}: <span className="text-foreground font-mono">{formatDateTime(report.createdAt)}</span> ({getRelativeAge(t, report.createdAt)})
                          </p>
                          {(report.reporterName || report.reporterPhone) && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{[report.reporterName, report.reporterPhone].filter(Boolean).join(" · ")}</p>}
                          <ReportPhotoGroups report={report} variant="compact" userNames={userNames} />
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          {isDropIncident && (
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
                              onClick={() => navigate(`/admin/drone-incidents?order=${report.orderCode ?? 'ORD-2026-8801'}`)}
                            >
                              <Radio className="w-3.5 h-3.5 animate-pulse" />
                              Điều phối KTV bán kính R
                            </Button>
                          )}
                          <RepairLogDialog reportId={report.id} title={`${displayCode} · ${report.title}`} technicianName={assignedTech?.fullName} report={report} />
                          {(report.status === "OPEN" || report.status === "IN_PROGRESS") && (
                            <Button size="sm" variant={report.status === "OPEN" ? "default" : "outline"} className="h-8 text-xs gap-1.5" onClick={() => setAssigningReport(report)}>
                              <UserCheck className="w-3.5 h-3.5" /> {report.status === "OPEN" ? t("admin.maintenance.reports.assignDroneTech") : t("admin.maintenance.reports.changeTech")}
                            </Button>
                          )}
                          {(report.status === "OPEN" || report.status === "IN_PROGRESS") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setResolvingReport(report)}
                              disabled={pending === report.id}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t("admin.maintenance.reports.complete")}
                            </Button>
                          )}
                          {report.status === "RESOLVED" && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> {t("admin.maintenance.reports.techDone")}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danh sách Drone & Thao Tác Kỹ Thuật */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Plane className="w-4 h-4 text-blue-600" />
                    {t("admin.maintenance.fleet.title", { count: droneList.length })}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("admin.maintenance.fleet.description")}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs font-mono font-medium bg-muted">
                  {t("admin.maintenance.fleet.showing", { shown: filteredDrones.length, total: droneList.length })}
                </Badge>
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="relative md:col-span-8">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("admin.maintenance.fleet.search")}
                      value={droneFleetSearch}
                      onChange={(e) => setDroneFleetSearch(e.target.value)}
                      className="pl-8 pr-7 h-8 text-xs bg-background"
                    />
                    {droneFleetSearch && (
                      <button type="button" onClick={() => setDroneFleetSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="md:col-span-4">
                    <Select value={droneBatteryFilter} onValueChange={(value: "ALL" | "LOW" | "MEDIUM" | "READY") => setDroneBatteryFilter(value)}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background"><SelectValue placeholder={t("admin.maintenance.fleet.batteryLevel")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("admin.maintenance.fleet.allBattery")}</SelectItem>
                        <SelectItem value="LOW">{t("admin.maintenance.fleet.lowBattery")}</SelectItem>
                        <SelectItem value="MEDIUM">{t("admin.maintenance.fleet.mediumBattery")}</SelectItem>
                        <SelectItem value="READY">{t("admin.maintenance.fleet.readyBattery")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "ALL", label: t("admin.maintenance.filters.statusAll", { count: droneList.length }) },
                    { id: "ATTENTION", label: t("admin.maintenance.fleet.attention", { count: droneFaults + droneLowBattery }) },
                    { id: "IDLE", label: `${droneStatusLabel(t, "IDLE")} (${droneList.filter((d) => d.status === "IDLE").length})` },
                    { id: "RESERVED", label: `${droneStatusLabel(t, "RESERVED")} (${droneList.filter((d) => d.status === "RESERVED").length})` },
                    { id: "IN_FLIGHT", label: `${droneStatusLabel(t, "IN_FLIGHT")} (${droneList.filter((d) => d.status === "IN_FLIGHT").length})` },
                    { id: "CHARGING", label: `${droneStatusLabel(t, "CHARGING")} (${droneList.filter((d) => d.status === "CHARGING").length})` },
                    { id: "MAINTENANCE", label: `${droneStatusLabel(t, "MAINTENANCE")} (${droneList.filter((d) => d.status === "MAINTENANCE").length})` },
                    { id: "FAULT", label: t("admin.maintenance.fleet.faultCount", { count: droneList.filter((d) => d.status === "FAULT").length }) },
                  ].map((f) => (
                    <Button
                      key={f.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setDroneFilter(f.id)}
                      className={`h-7 px-2.5 text-xs font-medium ${
                        droneFilter === f.id ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"
                      }`}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDrones.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Plane className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">{t("admin.maintenance.fleet.noMatch")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrones.map((d) => {
                    const battery = d.batteryPercent ?? 0;
                    const isUnderMaintenance = d.status === "MAINTENANCE";
                    const isFaulty = d.status === "FAULT";

                    return (
                      <Card
                        key={d.id}
                        className={`border transition-all ${
                          isFaulty
                            ? "border-rose-300 bg-rose-50/20 shadow-xs"
                            : isUnderMaintenance
                              ? "border-purple-300 bg-purple-50/20 shadow-xs"
                              : "border-border/80 hover:border-border hover:shadow-xs"
                        }`}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs">
                                <Plane className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-sm text-foreground">{d.code}</span>
                                <p className="text-[11px] text-muted-foreground">
                                  {d.lockerName ?? (d.lockerId ? t("admin.maintenance.fleet.landingPad", { id: d.lockerId }) : t("admin.maintenance.fleet.noStation"))}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${DRONE_STATUS_BADGE[d.status] ?? "bg-slate-50 text-slate-700"}`}
                            >
                              {droneStatusLabel(t, d.status)}
                            </Badge>
                          </div>

                          {/* Battery Bar */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <BatteryCharging className="w-3.5 h-3.5 text-foreground" /> {t("admin.maintenance.fleet.batteryLabel")}
                              </span>
                              <span className="font-semibold text-foreground font-mono">{battery}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${batteryColor(battery)}`}
                                style={{ width: `${Math.max(4, Math.min(100, battery))}%` }}
                              />
                            </div>
                          </div>

                          {/* Fault reason alert if any */}
                          {d.faultReason && (
                            <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                              <span>{d.faultReason}</span>
                            </div>
                          )}

                          <div className="pt-2 border-t border-border/60">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-full text-xs gap-1"
                              onClick={() => setViewingDrone(d)}
                            >
                              <History className="w-3 h-3" /> {t("dropdown.viewDetail")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LỊCH BẢO TRÌ & NHẬT KÝ */}
        <TabsContent value="schedules" className="space-y-6">
          <MaintenanceSchedules />

          {/* Nhật Ký Sửa Chữa & Bảo Trì Đã Hoàn Tất */}
          {(() => {
            const showDroneHistory = historyAsset === "DRONE";
            const resolvedIncidentList = reportList.filter(
              (r) => r.status === "RESOLVED" && (showDroneHistory ? isDroneReport(r) : !isDroneReport(r)),
            );
            // Biên bản kiểm tra định kỳ (mỗi lần một bản ghi, kể cả KHÔNG ĐẠT) — lịch drone gắn droneUnitId
            const scheduleTitles = new Map(schedulesList.map((s) => [s.id, s.title]));
            const completedInspectionList = inspectionLogs.filter((log) =>
              showDroneHistory ? log.droneUnitId != null : log.droneUnitId == null,
            );

            interface UnifiedHistoryItem {
              id: string;
              type: "INCIDENT" | "SCHEDULE";
              title: string;
              target: string;
              completedAt: string;
              completedRawDate?: string;
              technician: string;
              badgeText: string;
              /** Nhãn + màu kết quả thật (Đã hoàn tất / Đạt / Không đạt). */
              resultLabel: string;
              resultClass: string;
              detailNote?: string;
              originalReport?: LockerReportResponse;
            }

            const historyItems: UnifiedHistoryItem[] = [];

            // 1. Thêm các phiếu sự cố đã giải quyết
            resolvedIncidentList.forEach((r) => {
              const rawDate = r.resolvedAt ?? r.updatedAt ?? r.createdAt;
              historyItems.push({
                id: `incident-${r.id}`,
                type: "INCIDENT",
                title: `RPT-${r.id} · ${r.title}`,
                target: showDroneHistory
                  ? `Drone: ${(r as any).droneCode ?? r.title ?? t("admin.maintenance.reports.flyingDevice")}`
                  : `${r.lockerName ?? `Kiosk #${r.lockerId}`}${r.boxNumber ? ` · ${t("admin.maintenance.boxNumber", { number: r.boxNumber })}` : ""}`,
                completedAt: formatDateTime(rawDate),
                completedRawDate: rawDate,
                // Người được giao phiếu, không có thì người đóng phiếu — không suy từ người báo
                technician: (() => {
                  const techId = r.assignedToUserId ?? r.resolvedByUserId;
                  return techId ? userNames[techId] ?? t("admin.maintenance.technicianFallback", { id: techId }) : "—";
                })(),
                badgeText: t("admin.maintenance.history.incidentResolved"),
                resultLabel: t("admin.maintenance.status.resolved"),
                resultClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
                detailNote: cleanDescription(r.description) || r.description,
                originalReport: r,
              });
            });

            // 2. Thêm từng lần kiểm tra định kỳ đã ghi biên bản (kết quả thật: Đạt / Không đạt)
            completedInspectionList.forEach((log) => {
              const isDrone = log.droneUnitId != null;
              const meta = INSPECTION_STATUS_META[log.status];
              const noteParts = [
                log.note?.trim(),
                log.createdReportId ? t("admin.maintenance.history.openedReport", { id: log.createdReportId }) : null,
              ].filter(Boolean);
              historyItems.push({
                id: `inspection-${log.id}`,
                type: "SCHEDULE",
                title: scheduleTitles.get(log.scheduleId) ?? t("admin.maintenance.history.scheduleFallback", { id: log.scheduleId }),
                target: isDrone
                  ? `Drone: ${log.droneCode ?? `#${log.droneUnitId}`}`
                  : t("admin.maintenance.labels.station", {
                      name: `${log.lockerName ?? (log.lockerId ? `Kiosk #${log.lockerId}` : "Kiosk")}${log.lockerCode ? ` (${log.lockerCode})` : ""}`,
                    }),
                completedAt: formatDateTime(log.createdAt),
                completedRawDate: log.createdAt,
                technician: log.technicianName ?? (log.technicianId ? userNames[log.technicianId] ?? t("admin.maintenance.technicianFallback", { id: log.technicianId }) : "—"),
                badgeText: isDrone ? t("admin.maintenance.history.droneMaintenance") : t("admin.maintenance.history.kioskInspection"),
                resultLabel: meta?.label ?? log.status,
                resultClass: meta?.cls ?? "bg-slate-50 text-slate-700 border-slate-200",
                detailNote: noteParts.length > 0 ? noteParts.join(" ") : undefined,
              });
            });

            // Sắp xếp lịch sử: Mới hoàn tất nhất lên đầu
            historyItems.sort((a, b) => {
              const tA = timestampOf(a.completedRawDate);
              const tB = timestampOf(b.completedRawDate);
              return tB - tA;
            });

            const filteredHistory =
              historyFilter === "INCIDENT"
                ? historyItems.filter((i) => i.type === "INCIDENT")
                : historyFilter === "SCHEDULE"
                  ? historyItems.filter((i) => i.type === "SCHEDULE")
                  : historyItems;

            return (
              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-600" />
                        {t("admin.maintenance.history.title")}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {showDroneHistory
                          ? t("admin.maintenance.history.descDrone")
                          : t("admin.maintenance.history.descKiosk")}
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {/* Bộ lọc tài sản: Kiosk hoặc Drone */}
                      <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-lg border border-border/60 text-xs">
                        <button
                          type="button"
                          onClick={() => { setHistoryAsset("KIOSK"); setHistoryFilter("ALL"); }}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${historyAsset === "KIOSK" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          📦 Kiosk
                        </button>
                        <button
                          type="button"
                          onClick={() => { setHistoryAsset("DRONE"); setHistoryFilter("ALL"); }}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${historyAsset === "DRONE" ? "bg-background text-blue-700 shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          ✈ Drone
                        </button>
                      </div>

                      {/* Bộ lọc loại hồ sơ: Tất cả, Sự cố, Định kỳ */}
                      <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-lg border border-border/60 text-xs">
                      <button
                        type="button"
                        onClick={() => setHistoryFilter("ALL")}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                          historyFilter === "ALL"
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t("admin.maintenance.filters.statusAll", { count: historyItems.length })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryFilter("INCIDENT")}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                          historyFilter === "INCIDENT"
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t("admin.maintenance.history.filterIncident", { count: resolvedIncidentList.length })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryFilter("SCHEDULE")}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                          historyFilter === "SCHEDULE"
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t("admin.maintenance.history.filterSchedule", { count: completedInspectionList.length })}
                      </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      {t("admin.maintenance.history.empty")}
                    </p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {filteredHistory.map((item) => (
                        <div
                          key={item.id}
                          className="py-3 flex items-start justify-between gap-4 flex-wrap hover:bg-muted/20 px-2 rounded-lg transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-foreground">{item.title}</p>
                              <Badge variant="outline" className={`text-xs font-medium ${item.resultClass}`}>
                                {item.resultLabel}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={
                                  item.type === "INCIDENT"
                                    ? "bg-amber-50 text-amber-700 border-amber-200 text-xs font-medium"
                                    : "bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
                                }
                              >
                                {item.badgeText}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t("admin.maintenance.labels.device")} <span className="font-medium text-foreground">{item.target}</span>
                              {" · "}{t("admin.maintenance.labels.completedAt")} <span className="text-foreground font-mono font-medium">{item.completedAt}</span>
                              {" · "}{t("admin.maintenance.history.owner")} <span className="text-foreground font-medium">{item.technician}</span>
                            </p>
                            {item.detailNote && (
                              <p className="text-xs text-muted-foreground/90 italic">
                                {t("admin.maintenance.history.record")} {item.detailNote}
                              </p>
                            )}
                          </div>
                          {item.type === "INCIDENT" && item.originalReport && (
                            <RepairLogDialog reportId={item.originalReport.id} title={item.title} report={item.originalReport} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Assign Report Dialog */}
      <AssignReportDialog
        report={assigningReport}
        technicians={technicians}
        open={!!assigningReport}
        onOpenChange={(open) => !open && setAssigningReport(null)}
        onSuccess={() => {
          reports.refetch();
          allReportsQuery.refetch();
        }}
      />

      {/* Hoàn tất phiếu: tuỳ chọn ghi chú + ảnh nghiệm thu (stage RESOLUTION) */}
      <ResolveReportDialog
        open={!!resolvingReport}
        onOpenChange={(open) => !open && setResolvingReport(null)}
        title={resolvingReport ? t("admin.maintenance.resolveDialog.title", { id: resolvingReport.id }) : ""}
        description={
          resolvingReport
            ? t("admin.maintenance.resolveDialog.description", { title: resolvingReport.title })
            : undefined
        }
        onSubmit={async ({ note, attachments }) => {
          if (!resolvingReport) return;
          const id = resolvingReport.id;
          setPending(id);
          try {
            // Lỗi được ResolveReportDialog hiển thị và giữ hộp thoại mở
            await resolveAdmin({ reportId: id, note, attachments }).unwrap();
            toast.success(t("admin.maintenance.resolveDialog.success", { id }), {
              description: attachments?.length
                ? t("admin.maintenance.resolveDialog.successWithPhotos", { count: attachments.length })
                : t("admin.maintenance.resolveDialog.successNoPhotos"),
            });
            faults.refetch();
          } finally {
            setPending(null);
          }
        }}
      />

      {creatingDroneReport && (
        <CreateDroneIncidentDialog
          drones={availableDrones}
          onClose={() => setCreatingDroneReport(false)}
          onSubmit={async ({ drone, title, description, attachments }) => {
            try {
              await createDroneIncidentReport({
                id: drone.id,
                title: title.trim(),
                description: description.trim(),
                attachments,
              }).unwrap();
              await Promise.all([dronesQuery.refetch(), reports.refetch(), allReportsQuery.refetch()]);
              setDroneReportFilter("OPEN");
              setDroneSearchQuery("");
              setDroneTechFilter("ALL");
              setDroneUnitFilter("ALL");
              setDroneDateFilter("ALL");
              setDroneReportSort("NEWEST_FIRST");
              toast.success(t("admin.maintenance.createDrone.success", { code: drone.code }), {
                description: t("admin.maintenance.createDrone.successDesc"),
              });
              setCreatingDroneReport(false);
            } catch (err: any) {
              throw err;
            }
          }}
        />
      )}

      {viewingDrone && <DroneDetailsDialog drone={viewingDrone} onClose={() => setViewingDrone(null)} />}
    </div>
  );
}

function CreateDroneIncidentDialog({
  drones,
  onClose,
  onSubmit,
}: {
  drones: DroneResponse[];
  onClose: () => void;
  onSubmit: (data: { drone: DroneResponse; title: string; description: string; attachments?: ReportAttachmentRequest[] }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [droneId, setDroneId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { upload, items, isUploading } = useImageUpload("REPORT_EVIDENCE");
  const busy = submitting || isUploading;

  const submit = async () => {
    const drone = drones.find((item) => String(item.id) === droneId);
    if (!drone) {
      toast.error(t("admin.maintenance.createDrone.selectDroneError"));
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error(t("admin.maintenance.createDrone.titleDescRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const attachments = files.length > 0 ? await upload(files) : undefined;
      await onSubmit({ drone, title, description, attachments });
    } catch (error) {
      if (!isHandledUploadError(error)) {
        toast.error(t("admin.maintenance.createDrone.createFailed"), {
          description: getMediaErrorMessage(error, t("admin.maintenance.createDrone.saveFailed")),
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            {t("admin.maintenance.reports.createDrone")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            {t("admin.maintenance.createDrone.intro")}
          </p>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">{t("admin.maintenance.createDrone.droneLabel")}</Label>
            <Select value={droneId} onValueChange={setDroneId}>
              <SelectTrigger><SelectValue placeholder={t("admin.maintenance.createDrone.dronePlaceholder")} /></SelectTrigger>
              <SelectContent>
                {drones.map((drone) => (
                  <SelectItem key={drone.id} value={String(drone.id)}>
                    {drone.code}{drone.lockerName ? ` · ${drone.lockerName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">{t("admin.maintenance.createDrone.titleLabel")}</Label>
            <Input placeholder={t("admin.maintenance.createDrone.titlePlaceholder")} value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">{t("admin.maintenance.createDrone.descLabel")}</Label>
            <textarea
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={t("admin.maintenance.createDrone.descPlaceholder")}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("admin.maintenance.createDrone.photosLabel")}</Label>
            <PhotoPicker
              value={files}
              onChange={setFiles}
              maxFiles={10}
              disabled={busy}
              uploadItems={items}
              hint={t("admin.maintenance.createDrone.photosHint")}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{t("button.cancel")}</Button>
          <Button onClick={submit} disabled={busy || drones.length === 0} className="bg-rose-600 hover:bg-rose-700 text-white">
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isUploading
              ? t("admin.maintenance.uploadingPhotos")
              : submitting
                ? t("admin.maintenance.createDrone.creating")
                : t("admin.maintenance.createDrone.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Chi tiết sức khỏe Drone chỉ đọc; mọi cập nhật được thực hiện ở quy trình kỹ thuật riêng.
function DroneDetailsDialog({ drone, onClose }: { drone: DroneResponse; onClose: () => void }) {
  const { t } = useTranslation();
  const historyQuery = useGetDroneMaintenanceHistoryQuery(drone.id);
  const history = historyQuery.data?.data;
  const battery = drone.batteryPercent ?? 0;
  const details: [string, React.ReactNode][] = [
    [t("admin.maintenance.droneDetail.station"), drone.lockerName ?? (drone.lockerId ? `Kiosk #${drone.lockerId}` : t("admin.maintenance.fleet.noStation"))],
    [
      t("admin.maintenance.droneDetail.assignedTech"),
      drone.assignedTechnicianId ? (
        <Link
          to={`/admin/technicians/${drone.assignedTechnicianId}`}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>
            {drone.assignedTechnicianName ??
              t("admin.lockers.table.technicianId", {
                id: drone.assignedTechnicianId,
              })}
          </span>
        </Link>
      ) : (
        drone.assignedTechnicianName ?? t("common.unassigned")
      ),
    ],
    [t("admin.maintenance.droneDetail.lastCharged"), drone.lastChargedAt ? formatDateTime(drone.lastChargedAt) : t("common.noDataYet")],
    [t("admin.maintenance.droneDetail.addedToFleet"), drone.createdAt ? formatDateTime(drone.createdAt) : t("common.noDataYet")],
    [t("admin.maintenance.droneDetail.lastUpdated"), drone.updatedAt ? formatDateTime(drone.updatedAt) : t("common.noDataYet")],
  ];

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-600" />
            {t("admin.maintenance.droneDetail.title", { code: drone.code })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{t("admin.maintenance.droneDetail.opsInfo")}</p>
                <p className="text-xs text-muted-foreground">{t("admin.maintenance.droneDetail.opsInfoDesc")}</p>
              </div>
              <Badge variant="outline" className={DRONE_STATUS_BADGE[drone.status] ?? "bg-slate-50 text-slate-700"}>
                {droneStatusLabel(t, drone.status)}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><BatteryCharging className="w-3.5 h-3.5" /> {t("admin.maintenance.droneDetail.batteryRecorded")}</span>
                <span className="font-mono font-semibold">{battery}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${batteryColor(battery)}`} style={{ width: `${Math.max(4, Math.min(100, battery))}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium break-words">{value}</p>
                </div>
              ))}
            </div>
            {drone.faultReason && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                <span className="font-semibold">{t("admin.maintenance.droneDetail.faultRecorded")}</span>{drone.faultReason}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="text-sm font-semibold">{t("admin.maintenance.droneDetail.maintenanceHistory")}</h3></div>
            {historyQuery.isLoading ? (
              <div className="py-5 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />{t("admin.maintenance.droneDetail.loadingHistory")}</div>
            ) : !history?.completedMaintenance.length ? (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{t("admin.maintenance.droneDetail.noMaintenance")}</p>
            ) : (
              <div className="space-y-2">
                {history.completedMaintenance.map((log) => (
                  <div key={log.id} className="rounded-md border p-3 text-xs">
                    <div className="flex items-start justify-between gap-3"><span className="font-semibold">{log.status === "PASSED" ? t("admin.maintenance.droneDetail.inspectionPassed") : log.status}</span><span className="shrink-0 text-muted-foreground">{formatDateTime(log.createdAt)}</span></div>
                    <p className="mt-1 text-muted-foreground">{t("admin.maintenance.technicianLabel", { name: log.technicianName ?? t("admin.maintenance.droneDetail.unknown") })}</p>
                    {log.note && <p className="mt-1.5 whitespace-pre-wrap">{log.note}</p>}
                    {!!log.photoUrls?.length && <p className="mt-1 text-muted-foreground">{t("admin.maintenance.droneDetail.photosCount", { count: log.photoUrls.length })}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><h3 className="text-sm font-semibold">{t("admin.maintenance.droneDetail.resolvedIncidents")}</h3></div>
            {historyQuery.isLoading ? null : !history?.resolvedIncidents.length ? (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{t("admin.maintenance.droneDetail.noResolved")}</p>
            ) : (
              <div className="space-y-2">
                {history.resolvedIncidents.map((report) => (
                  <div key={report.id} className="rounded-md border p-3 text-xs">
                    <div className="flex items-start justify-between gap-3"><span className="font-semibold">#{report.id} · {report.title}</span><span className="shrink-0 text-muted-foreground">{report.resolvedAt ? formatDateTime(report.resolvedAt) : t("admin.maintenance.status.resolved")}</span></div>
                    {report.description && <p className="mt-1.5 text-muted-foreground whitespace-pre-wrap">{cleanDescription(report.description)}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("button.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
