import { formatDateTime, parseBackendDateTime } from "~/lib/datetime";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { TechniciansTab } from "./TechniciansTab";
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

const DRONE_STATUS_LABELS: Record<string, string> = {
  IDLE: "Sẵn sàng",
  RESERVED: "Đã giữ cho nhiệm vụ",
  CHARGING: "Đang sạc",
  IN_FLIGHT: "Đang bay",
  MAINTENANCE: "Đang bảo dưỡng",
  FAULT: "Gặp sự cố",
};

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
    toast.error("Thiết bị này chưa có tọa độ vị trí");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function getRelativeAge(dateStr?: string | null): string {
  if (!dateStr) return "";
  const createdAt = parseBackendDateTime(dateStr);
  if (!createdAt) return "";
  const diffMs = Date.now() - createdAt.getTime();
  if (diffMs < 0) return "Vừa xong";
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function timestampOf(value?: string | null): number {
  return parseBackendDateTime(value)?.getTime() ?? 0;
}

export default function MaintenanceAdminPage() {
  const navigate = useNavigate();
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

  const [pending, setPending] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("kiosk");
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
  // Chỉ lấy phiếu sự cố Kiosk — loại bỏ hoàn toàn phiếu drone để tab Bảo trì Kiosk không lẫn lộn
  const kioskReportList = useMemo(
    () => reportList.filter((r) => !isDroneReport(r)),
    [reportList]
  );
  const droneReportList = useMemo(
    () => reportList.filter(isDroneReport),
    [reportList]
  );
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
        const specialtyLabel = isKiosk ? "KTV Kiosk (Tủ Kiosk)" : "KTV Drone (Đội bay & Pin)";

        return {
          id: u.id,
          fullName: u.fullName || u.name || `KTV #${u.id}`,
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
  }, [usersQuery.data]);

  const techniciansMap = useMemo(() => {
    const map: Record<number, TechnicianSummary> = {};
    for (const t of technicians) {
      map[t.id] = t;
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
    for (const t of technicians) map[t.id] = `${t.fullName} (KTV)`;
    return map;
  }, [usersQuery.data, technicians]);

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
        toast.success(ok, { description: "Thao tác đã được hệ thống ghi nhận thành công." });
      } else {
        toast.success(ok.title, { description: ok.description });
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.message || (typeof fail === "string" ? fail : fail.description) || "Đã xảy ra lỗi trong quá trình xử lý";
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
    if (r.routedToUserId === undefined) return "Chưa phân công";
    // Phiếu tạo trước khi có định tuyến cũng không có routedToUserId ⇒ ghi trung tính.
    if (r.routedToUserId === null) return "Chờ KTV tủ nhận";
    const name = techniciansMap[r.routedToUserId]?.fullName ?? userNames[r.routedToUserId] ?? `KTV #${r.routedToUserId}`;
    return `Đang chờ ${name} nhận`;
  };

  const refetchAll = () => {
    faults.refetch();
    reports.refetch();
    deviceStatuses.refetch();
    dronesQuery.refetch();
    usersQuery.refetch();
    allReportsQuery.refetch();
    toast.info("Đang đồng bộ dữ liệu kỹ thuật...");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Bảo trì thiết bị"
          description="Trung tâm điều hành kỹ thuật — Giám sát phần cứng Kiosk, quản lý bảo dưỡng pin & đội bay Drone"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 font-medium shadow-xs"
          onClick={refetchAll}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Đồng bộ thiết bị
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-3xl h-11 p-1 bg-muted/60 border border-border/50 rounded-xl">
          <TabsTrigger
            value="kiosk"
            className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Boxes className="w-4 h-4 text-orange-600" />
            Bảo trì Kiosk ({openReports + inProgressReports})
          </TabsTrigger>
          <TabsTrigger
            value="technicians"
            className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Users className="w-4 h-4 text-indigo-600" />
            Đội ngũ KTV ({technicians.length})
          </TabsTrigger>
          <TabsTrigger
            value="drone"
            className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Plane className="w-4 h-4 text-blue-600" />
            Bảo trì & Pin Drone ({droneOpenReports + droneInProgressReports})
          </TabsTrigger>
          <TabsTrigger
            value="schedules"
            className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <CalendarClock className="w-4 h-4 text-emerald-600" />
            Lịch bảo trì & Nhật ký
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BẢO TRÌ KIOSK */}
        <TabsContent value="kiosk" className="space-y-6">
          {/* Kiosk KPI Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Sự cố đang mở</p>
                  <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {openReports + inProgressReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-rose-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{openReports + inProgressReports > 0 ? "Cần xử lý kỹ thuật" : "Không có sự cố"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Phiếu mới mở</p>
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {openReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-amber-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{openReports > 0 ? `${openReports} phiếu chờ KTV nhận` : "Đã tiếp nhận hết"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Đang xử lý</p>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {inProgressReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-blue-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Kỹ thuật viên đang xử lý</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Đã hoàn tất</p>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {resolvedReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-emerald-600">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>Tỷ lệ hoàn thành cao</span>
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
                      Cảnh báo: Có {overdueReports} phiếu sự cố Kiosk đang quá hạn xử lý (SLA)
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Cần ưu tiên điều phối kỹ thuật viên tiếp nhận và xử lý ngay để đảm bảo chất lượng vận hành trạm Kiosk.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 bg-white"
                  onClick={() => setReportFilter("OVERDUE")}
                >
                  Xem phiếu quá hạn SLA
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
                    Phiếu xử lý sự cố ({kioskReportList.length})
                    {overdueReports > 0 && (
                      <Badge variant="outline" className="ml-1 bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                        {overdueReports} quá hạn SLA
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Hệ thống tự động ưu tiên các phiếu sự cố mới nhất lên đầu danh sách để xử lý kịp thời
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono font-medium bg-muted">
                    Hiển thị {filteredReports.length} / {kioskReportList.length} phiếu
                  </Badge>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Đặt lại bộ lọc
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
                      placeholder="Tìm mã phiếu (#1), tiêu đề, kiosk, ô, SĐT..."
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
                        <SelectValue placeholder="Lọc theo KTV" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả Kỹ thuật viên</SelectItem>
                        <SelectItem value="UNASSIGNED">Chưa phân công (Mới)</SelectItem>
                        {technicians.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.fullName} (#{t.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lọc Trạm Kiosk */}
                  <div className="md:col-span-2">
                    <Select value={selectedLockerFilter} onValueChange={setSelectedLockerFilter}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background">
                        <SelectValue placeholder="Trạm Kiosk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả trạm Kiosk</SelectItem>
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
                        <SelectValue placeholder="Thời gian" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả thời gian</SelectItem>
                        <SelectItem value="TODAY">Hôm nay</SelectItem>
                        <SelectItem value="7_DAYS">7 ngày gần nhất</SelectItem>
                        <SelectItem value="30_DAYS">30 ngày gần nhất</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sắp xếp */}
                  <div className="md:col-span-2">
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background font-medium border-primary/40 text-primary">
                        <SelectValue placeholder="Sắp xếp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEWEST_FIRST">⚡ Mới nhất lên đầu (Mặc định)</SelectItem>
                        <SelectItem value="PRIORITY_NEW">🔥 Ưu tiên: Mới & Khẩn cấp</SelectItem>
                        <SelectItem value="SLA_URGENT">⏰ Hạn SLA gấp nhất</SelectItem>
                        <SelectItem value="OLDEST_FIRST">📅 Cũ nhất trước</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Hàng 2: Nút chọn Trạng thái (Status Tabs) & Filter tags */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { id: "ALL", label: `Tất cả (${kioskReportList.length})` },
                      { id: "OPEN", label: `Mới mở (${openReports})`, isNewPulse: openReports > 0 },
                      { id: "IN_PROGRESS", label: `Đang làm (${inProgressReports})` },
                      { id: "OVERDUE", label: `Quá hạn SLA (${overdueReports})`, isDanger: overdueReports > 0 },
                      { id: "RESOLVED", label: `Đã xong (${resolvedReports})` },
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
                      <span>Đang lọc:</span>
                      {searchQuery && (
                        <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">
                          Từ khóa: &quot;{searchQuery}&quot;
                          <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setSearchQuery("")} />
                        </Badge>
                      )}
                      {selectedTechFilter !== "ALL" && (
                        <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">
                          {selectedTechFilter === "UNASSIGNED"
                            ? "Chưa phân công"
                            : `KTV: ${techniciansMap[Number(selectedTechFilter)]?.fullName ?? selectedTechFilter}`}
                          <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedTechFilter("ALL")} />
                        </Badge>
                      )}
                      {selectedLockerFilter !== "ALL" && (
                        <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">
                          Trạm: {availableLockers.find((l) => String(l.id) === selectedLockerFilter)?.name ?? selectedLockerFilter}
                          <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedLockerFilter("ALL")} />
                        </Badge>
                      )}
                      {dateFilter !== "ALL" && (
                        <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">
                          Thời gian: {dateFilter === "TODAY" ? "Hôm nay" : dateFilter === "7_DAYS" ? "7 ngày qua" : "30 ngày qua"}
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
                        <span className="font-bold">{openCount} phiếu sự cố mới</span> đang chờ KTV nhận — các phiếu mới nhất đã được tự động hiển thị lên đầu.
                      </p>
                    </div>
                    {reportFilter !== "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReportFilter("OPEN")}
                        className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
                      >
                        Chỉ xem phiếu mới
                      </Button>
                    )}
                  </div>
                ) : null;
              })()}

              {filteredReports.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">Không có phiếu sự cố nào phù hợp với bộ lọc hiện tại.</p>
                  <p className="text-xs text-muted-foreground">Thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc để xem toàn bộ danh sách phiếu.</p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-8 text-xs gap-1 mt-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Đặt lại tất cả bộ lọc
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
                              RPT-{r.id} · {r.title}
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
                                MỚI MỞ · CHỜ KTV NHẬN
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={`text-xs ${REPORT_BADGE[r.status] ?? ""}`}>
                                {r.status === "IN_PROGRESS" ? "Đang xử lý" : r.status === "RESOLVED" ? "Đã hoàn tất" : r.status}
                              </Badge>
                            )}
                            {isRecent && !isNew && (
                              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[11px] shadow-xs flex items-center gap-1 px-2 py-0.5">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                VỪA PHÁT SINH
                              </Badge>
                            )}
                            {r.blocksLocker && r.status !== "RESOLVED" && (
                              <Badge
                                variant="outline"
                                className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs"
                                title="Phiếu đưa cả tủ vào bảo trì; tủ tự mở lại khi phiếu chặn cuối cùng được hoàn tất"
                              >
                                Ngưng cả tủ
                              </Badge>
                            )}
                            {r.scheduleId != null && (
                              <Badge
                                variant="outline"
                                className="bg-sky-50 text-sky-800 border-sky-300 font-medium text-xs"
                                title={`Tự mở từ lần kiểm tra định kỳ KHÔNG ĐẠT (lịch #${r.scheduleId})`}
                              >
                                Từ kiểm tra định kỳ
                              </Badge>
                            )}
                            {r.overdue && (
                              <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                                Quá hạn SLA
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
                              onClick={() => navigate(`/admin/maintenance/technicians/${r.assignedToUserId}`)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200 transition-colors cursor-pointer"
                              title="Xem chi tiết hồ sơ & hoạt động của KTV này"
                            >
                              <UserCheck className="w-3 h-3 text-indigo-700" />
                              <span>
                                KTV: {assignedTech?.fullName ?? userNames[r.assignedToUserId] ?? `#${r.assignedToUserId}`}
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
                          {r.boxNumber ? ` · Ô #${r.boxNumber}` : r.boxId ? ` · Ô #${r.boxId}` : ""}{" "}
                          {r.cellType ? `· Loại ${r.cellType} ` : ""}
                          · Tạo lúc: <span className="text-foreground font-mono">{formatDateTime(r.createdAt)}</span>{" "}
                          {r.createdAt && (
                            <span className="text-[11px] text-muted-foreground font-medium">
                              ({getRelativeAge(r.createdAt)})
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
                          title={`RPT-${r.id} · ${r.title}`}
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
                            <Boxes className="w-3.5 h-3.5" /> Phân công KTV
                          </Button>
                        )}

                        {r.status === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                            onClick={() => setAssigningReport(r)}
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Đổi KTV
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
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn tất
                          </Button>
                        )}

                        {r.status === "RESOLVED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> KTV đã xử lý xong
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
                Sức khỏe thiết bị Kiosk (Cabinet Heartbeat IoT)
              </CardTitle>
              <CardDescription className="text-xs">
                Tín hiệu kết nối máy chủ của từng trạm Kiosk thời gian thực
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deviceList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Chưa có tín hiệu heartbeat nào từ Kiosk.</p>
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
                              {d.lockerId ? `Trạm Kiosk #${d.lockerId}` : "Chưa liên kết trạm"}
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
                            {online ? "Trực tuyến" : "Mất kết nối"}
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
                  <p className="text-xs text-muted-foreground font-medium">Sự cố đang mở</p>
                  <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneOpenReports + droneInProgressReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-rose-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{droneOpenReports + droneInProgressReports > 0 ? "Cần xử lý kỹ thuật" : "Không có sự cố"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Phiếu mới mở</p>
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneOpenReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-amber-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{droneOpenReports > 0 ? `${droneOpenReports} phiếu chờ KTV nhận` : "Đã tiếp nhận hết"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Đang xử lý</p>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneInProgressReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-blue-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Kỹ thuật viên đang xử lý</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Đã hoàn tất</p>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneResolvedReports}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-emerald-600">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>Tỷ lệ hoàn thành cao</span>
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
                      Cảnh báo: Có {droneOverdueReports} phiếu sự cố Drone đang quá hạn xử lý (SLA)
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Cần ưu tiên điều phối kỹ thuật viên tiếp nhận và xử lý ngay để đảm bảo an toàn vận hành đội bay Drone.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 bg-white"
                  onClick={() => setDroneReportFilter("OVERDUE")}
                >
                  Xem phiếu quá hạn SLA
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
                    Phiếu xử lý sự cố Drone ({droneReportList.length})
                    {droneOverdueReports > 0 && (
                      <Badge variant="outline" className="ml-1 bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                        {droneOverdueReports} quá hạn SLA
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Điều phối KTV Drone, theo dõi SLA và lưu đầy đủ hồ sơ xử lý kỹ thuật từ API bảo trì
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold"
                    onClick={() => setCreatingDroneReport(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tạo báo cáo sự cố Drone
                  </Button>
                  <Badge variant="secondary" className="text-xs font-mono font-medium bg-muted">
                    Hiển thị {filteredDroneReports.length} / {droneReportList.length} phiếu
                  </Badge>
                  {hasDroneReportFilters && (
                    <Button variant="ghost" size="sm" onClick={resetDroneReportFilters} className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1">
                      <RotateCcw className="w-3.5 h-3.5" /> Đặt lại bộ lọc
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
                  <div className="relative md:col-span-4">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm mã phiếu, drone, lỗi, KTV, SĐT..."
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
                      <SelectTrigger className="w-full h-8 text-xs bg-background"><SelectValue placeholder="KTV Drone" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả KTV Drone</SelectItem>
                        <SelectItem value="UNASSIGNED">Chưa phân công</SelectItem>
                        {technicians.filter((t) => t.specialty === "DRONE").map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.fullName} (#{t.id})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select value={droneUnitFilter} onValueChange={setDroneUnitFilter}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background"><SelectValue placeholder="Thiết bị Drone" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả thiết bị Drone</SelectItem>
                        {availableDrones.map((drone) => (
                          <SelectItem key={drone.id} value={drone.code}>{drone.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select value={droneDateFilter} onValueChange={setDroneDateFilter}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background"><SelectValue placeholder="Thời gian" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả thời gian</SelectItem>
                        <SelectItem value="TODAY">Hôm nay</SelectItem>
                        <SelectItem value="7_DAYS">7 ngày gần nhất</SelectItem>
                        <SelectItem value="30_DAYS">30 ngày gần nhất</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select value={droneReportSort} onValueChange={(value: "NEWEST_FIRST" | "PRIORITY_NEW" | "SLA_URGENT" | "OLDEST_FIRST") => setDroneReportSort(value)}>
                      <SelectTrigger className="w-full h-8 text-xs bg-background font-medium border-primary/40 text-primary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEWEST_FIRST">⚡ Mới nhất lên đầu (Mặc định)</SelectItem>
                        <SelectItem value="PRIORITY_NEW">🔥 Ưu tiên: Mới & Khẩn cấp</SelectItem>
                        <SelectItem value="SLA_URGENT">⏰ Hạn SLA gấp nhất</SelectItem>
                        <SelectItem value="OLDEST_FIRST">📅 Cũ nhất trước</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: "ALL", label: `Tất cả (${droneReportList.length})` },
                    { id: "OPEN", label: `Mới mở (${droneOpenReports})`, isNewPulse: droneOpenReports > 0 },
                    { id: "IN_PROGRESS", label: `Đang làm (${droneInProgressReports})` },
                    { id: "OVERDUE", label: `Quá hạn SLA (${droneOverdueReports})`, isDanger: droneOverdueReports > 0 },
                    { id: "RESOLVED", label: `Đã xong (${droneResolvedReports})` },
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
                    <span>Đang lọc:</span>
                    {droneSearchQuery && <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">Từ khóa: &quot;{droneSearchQuery}&quot;<X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setDroneSearchQuery("")} /></Badge>}
                    {droneTechFilter !== "ALL" && <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">{droneTechFilter === "UNASSIGNED" ? "Chưa phân công" : `KTV: ${techniciansMap[Number(droneTechFilter)]?.fullName ?? droneTechFilter}`}<X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setDroneTechFilter("ALL")} /></Badge>}
                    {droneUnitFilter !== "ALL" && <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">Drone: {droneUnitFilter}<X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setDroneUnitFilter("ALL")} /></Badge>}
                    {droneDateFilter !== "ALL" && <Badge variant="outline" className="bg-muted/80 gap-1 text-[11px] font-normal py-0">Thời gian: {droneDateFilter === "TODAY" ? "Hôm nay" : droneDateFilter === "7_DAYS" ? "7 ngày qua" : "30 ngày qua"}<X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setDroneDateFilter("ALL")} /></Badge>}
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
                        <span className="font-bold">{openCount} phiếu sự cố mới</span> đang chờ KTV Drone nhận — các phiếu mới nhất đã được tự động hiển thị lên đầu.
                      </p>
                    </div>
                    {droneReportFilter !== "OPEN" && (
                      <Button size="sm" variant="outline" onClick={() => setDroneReportFilter("OPEN")} className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300">
                        Chỉ xem phiếu mới
                      </Button>
                    )}
                  </div>
                ) : null;
              })()}
              {filteredDroneReports.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">Không có phiếu sự cố Drone nào phù hợp với bộ lọc hiện tại.</p>
                  <p className="text-xs text-muted-foreground">Thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc để xem toàn bộ danh sách phiếu.</p>
                  {hasDroneReportFilters && (
                    <Button variant="outline" size="sm" onClick={resetDroneReportFilters} className="h-8 text-xs gap-1 mt-2">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Đặt lại tất cả bộ lọc
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredDroneReports.map((report) => {
                    const assignedTech = report.assignedToUserId ? techniciansMap[report.assignedToUserId] : undefined;
                    const droneCode = (report as LockerReportResponse & { droneCode?: string }).droneCode;
                    const isNew = report.status === "OPEN";
                    return (
                      <div key={report.id} className={`py-3.5 flex items-center justify-between gap-4 flex-wrap px-3 rounded-xl transition-all ${isNew ? "border-l-4 border-l-amber-500 bg-amber-50/50 ring-1 ring-amber-200/70 my-1" : "hover:bg-muted/20 my-0.5 border border-transparent"}`}>
                        <div className="max-w-2xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">RPT-{report.id} · {report.title}</p>
                            <Badge variant="outline" className={`text-xs ${REPORT_BADGE[report.status] ?? ""}`}>
                              {report.status === "OPEN" ? "Mới mở · Chờ KTV Drone" : report.status === "IN_PROGRESS" ? "Đang xử lý" : report.status === "RESOLVED" ? "Đã hoàn tất" : report.status}
                            </Badge>
                            {report.overdue && <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">Quá hạn SLA</Badge>}
                            <SlaCountdownBadge slaDueAt={report.slaDueAt} createdAt={report.createdAt} slaHours={report.slaHours ?? 4} status={report.status} />
                            {report.assignedToUserId ? (
                              <button type="button" onClick={() => navigate(`/admin/maintenance/technicians/${report.assignedToUserId}`)} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200">
                                <UserCheck className="w-3 h-3" /> KTV: {assignedTech?.fullName ?? userNames[report.assignedToUserId] ?? `#${report.assignedToUserId}`}
                              </button>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-foreground">{cleanDescription(report.description) || report.description}</span>
                            {" · "}<span className="font-medium text-foreground">{droneCode ? `Drone ${droneCode}` : report.lockerName ?? "Thiết bị bay"}</span>
                            {" · "}Tạo lúc: <span className="text-foreground font-mono">{formatDateTime(report.createdAt)}</span> ({getRelativeAge(report.createdAt)})
                          </p>
                          {(report.reporterName || report.reporterPhone) && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{[report.reporterName, report.reporterPhone].filter(Boolean).join(" · ")}</p>}
                          <ReportPhotoGroups report={report} variant="compact" userNames={userNames} />
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <RepairLogDialog reportId={report.id} title={`RPT-${report.id} · ${report.title}`} technicianName={assignedTech?.fullName} report={report} />
                          {(report.status === "OPEN" || report.status === "IN_PROGRESS") && (
                            <Button size="sm" variant={report.status === "OPEN" ? "default" : "outline"} className="h-8 text-xs gap-1.5" onClick={() => setAssigningReport(report)}>
                              <UserCheck className="w-3.5 h-3.5" /> {report.status === "OPEN" ? "Phân công KTV Drone" : "Đổi KTV"}
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
                              <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn tất
                            </Button>
                          )}
                          {report.status === "RESOLVED" && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> KTV đã xử lý xong</span>}
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
                    Sức khỏe thiết bị Drone ({droneList.length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Tình trạng kỹ thuật, pin, trạm hoạt động và KTV phụ trách được đồng bộ từ API đội bay
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs font-mono font-medium bg-muted">
                  Hiển thị {filteredDrones.length} / {droneList.length} drone
                </Badge>
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="relative md:col-span-8">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm mã drone, trạm, KTV hoặc nguyên nhân lỗi..."
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
                      <SelectTrigger className="w-full h-8 text-xs bg-background"><SelectValue placeholder="Mức pin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả mức pin</SelectItem>
                        <SelectItem value="LOW">Pin yếu dưới 20%</SelectItem>
                        <SelectItem value="MEDIUM">Pin 20–49%</SelectItem>
                        <SelectItem value="READY">Pin sẵn sàng từ 50%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "ALL", label: `Tất cả (${droneList.length})` },
                    { id: "ATTENTION", label: `Cần can thiệp (${droneFaults + droneLowBattery})` },
                    { id: "IDLE", label: `Sẵn sàng (${droneList.filter((d) => d.status === "IDLE").length})` },
                    { id: "RESERVED", label: `Đã giữ cho nhiệm vụ (${droneList.filter((d) => d.status === "RESERVED").length})` },
                    { id: "IN_FLIGHT", label: `Đang bay (${droneList.filter((d) => d.status === "IN_FLIGHT").length})` },
                    { id: "CHARGING", label: `Đang sạc (${droneList.filter((d) => d.status === "CHARGING").length})` },
                    { id: "MAINTENANCE", label: `Đang bảo dưỡng (${droneList.filter((d) => d.status === "MAINTENANCE").length})` },
                    { id: "FAULT", label: `Sự cố (${droneList.filter((d) => d.status === "FAULT").length})` },
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
                  <p className="text-sm font-medium">Không tìm thấy drone nào phù hợp bộ lọc</p>
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
                                  {d.lockerName ?? (d.lockerId ? `Bãi đáp Kiosk #${d.lockerId}` : "Chưa gắn trạm")}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${DRONE_STATUS_BADGE[d.status] ?? "bg-slate-50 text-slate-700"}`}
                            >
                              {DRONE_STATUS_LABELS[d.status] ?? d.status}
                            </Badge>
                          </div>

                          {/* Battery Bar */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <BatteryCharging className="w-3.5 h-3.5 text-foreground" /> Mức pin:
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
                              <History className="w-3 h-3" /> Xem chi tiết
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
                  ? `Drone: ${(r as any).droneCode ?? r.title ?? "Thiết bị bay"}`
                  : `${r.lockerName ?? `Kiosk #${r.lockerId}`}${r.boxNumber ? ` · Ô #${r.boxNumber}` : ""}`,
                completedAt: formatDateTime(rawDate),
                completedRawDate: rawDate,
                // Người được giao phiếu, không có thì người đóng phiếu — không suy từ người báo
                technician: (() => {
                  const techId = r.assignedToUserId ?? r.resolvedByUserId;
                  return techId ? userNames[techId] ?? `Kỹ thuật viên #${techId}` : "—";
                })(),
                badgeText: "Sự cố đã xử lý",
                resultLabel: "Đã hoàn tất",
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
                log.createdReportId ? `Đã mở phiếu sự cố RPT-${log.createdReportId}.` : null,
              ].filter(Boolean);
              historyItems.push({
                id: `inspection-${log.id}`,
                type: "SCHEDULE",
                title: scheduleTitles.get(log.scheduleId) ?? `Lịch kiểm tra #${log.scheduleId}`,
                target: isDrone
                  ? `Drone: ${log.droneCode ?? `#${log.droneUnitId}`}`
                  : `Trạm: ${log.lockerName ?? (log.lockerId ? `Kiosk #${log.lockerId}` : "Kiosk")}${log.lockerCode ? ` (${log.lockerCode})` : ""}`,
                completedAt: formatDateTime(log.createdAt),
                completedRawDate: log.createdAt,
                technician: log.technicianName ?? (log.technicianId ? userNames[log.technicianId] ?? `Kỹ thuật viên #${log.technicianId}` : "—"),
                badgeText: isDrone ? "Bảo trì Drone" : "Kiểm tra Kiosk",
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
                        Lịch sử hoàn tất bảo trì & xử lý sự cố thiết bị
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {showDroneHistory
                          ? "Hồ sơ sự cố Drone đã xử lý và từng lần kiểm tra định kỳ Drone (kèm kết quả)"
                          : "Hồ sơ sự cố Kiosk đã xử lý và từng lần kiểm tra định kỳ Kiosk (kèm kết quả)"}
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
                        Tất cả ({historyItems.length})
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
                        Sự cố đã xử lý ({resolvedIncidentList.length})
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
                        Kiểm tra định kỳ ({completedInspectionList.length})
                      </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Chưa có hồ sơ bảo trì nào được lưu trữ cho mục này.
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
                              Thiết bị: <span className="font-medium text-foreground">{item.target}</span>
                              {" · "}Thời gian hoàn tất: <span className="text-foreground font-mono font-medium">{item.completedAt}</span>
                              {" · "}Phụ trách: <span className="text-foreground font-medium">{item.technician}</span>
                            </p>
                            {item.detailNote && (
                              <p className="text-xs text-muted-foreground/90 italic">
                                Biên bản: {item.detailNote}
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

        {/* TAB 4: ĐỘI NGŨ KỸ THUẬT VIÊN */}
        <TabsContent value="technicians" className="space-y-6">
          <TechniciansTab
            onAssignToTech={(techId, specialty) => {
              const name = techniciansMap[techId]?.fullName ?? `KTV #${techId}`;
              // KTV Drone chỉ nhận phiếu Drone ⇒ mở tab Drone với bộ lọc KTV Drone
              if (specialty === "DRONE") {
                setDroneTechFilter(String(techId));
                setActiveTab("drone");
              } else {
                setSelectedTechFilter(String(techId));
                setActiveTab("kiosk");
              }
              toast.info(`Đang hiển thị các sự cố phân công cho ${name}`);
            }}
          />
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
        title={resolvingReport ? `Xác nhận hoàn tất xử lý phiếu RPT-${resolvingReport.id}?` : ""}
        description={
          resolvingReport
            ? `Đóng phiếu "${resolvingReport.title}" với tư cách quản trị viên? Phiếu chuyển sang Đã hoàn tất; ô tủ / bãi đáp / tủ liên quan được trả về hoạt động như khi KTV hoàn tất.`
            : undefined
        }
        onSubmit={async ({ note, attachments }) => {
          if (!resolvingReport) return;
          const id = resolvingReport.id;
          setPending(id);
          try {
            // Lỗi được ResolveReportDialog hiển thị và giữ hộp thoại mở
            await resolveAdmin({ reportId: id, note, attachments }).unwrap();
            toast.success(`Phiếu RPT-${id} đã hoàn tất`, {
              description: attachments?.length
                ? `Sự cố đã được đóng hồ sơ kèm ${attachments.length} ảnh nghiệm thu.`
                : "Sự cố kỹ thuật đã được đóng hồ sơ và lưu nhật ký.",
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
              toast.success(`Đã tạo báo cáo sự cố cho Drone ${drone.code}`, {
                description: "Phiếu mới đã được chuyển đến hàng đợi KTV Drone để điều phối.",
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
      toast.error("Vui lòng chọn Drone gặp sự cố");
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error("Vui lòng nhập tiêu đề và mô tả sự cố");
      return;
    }

    setSubmitting(true);
    try {
      const attachments = files.length > 0 ? await upload(files) : undefined;
      await onSubmit({ drone, title, description, attachments });
    } catch (error) {
      if (!isHandledUploadError(error)) {
        toast.error("Không thể tạo báo cáo sự cố Drone", {
          description: getMediaErrorMessage(error, "Có lỗi khi lưu phiếu sự cố trên hệ thống."),
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
            Tạo báo cáo sự cố Drone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Báo cáo sẽ mở phiếu mới ở trạng thái chờ xử lý và đưa Drone vào trạng thái sự cố để KTV Drone tiếp nhận.
          </p>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Drone gặp sự cố</Label>
            <Select value={droneId} onValueChange={setDroneId}>
              <SelectTrigger><SelectValue placeholder="Chọn thiết bị Drone" /></SelectTrigger>
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
            <Label className="mb-1.5 block text-xs font-medium">Tiêu đề sự cố</Label>
            <Input placeholder="VD: Drone mất kết nối GPS" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Mô tả và nguyên nhân ghi nhận</Label>
            <textarea
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Mô tả tình trạng thực tế, thời điểm phát hiện và hạng mục cần KTV kiểm tra..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Ảnh hiện trường (tuỳ chọn)</Label>
            <PhotoPicker
              value={files}
              onChange={setFiles}
              maxFiles={10}
              disabled={busy}
              uploadItems={items}
              hint="Ảnh lỗi Drone, pin, cánh quạt hoặc vị trí phát hiện · tối đa 10 ảnh"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Hủy</Button>
          <Button onClick={submit} disabled={busy || drones.length === 0} className="bg-rose-600 hover:bg-rose-700 text-white">
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isUploading ? "Đang tải ảnh..." : submitting ? "Đang tạo..." : "Tạo báo cáo sự cố"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Chi tiết sức khỏe Drone chỉ đọc; mọi cập nhật được thực hiện ở quy trình kỹ thuật riêng.
function DroneDetailsDialog({ drone, onClose }: { drone: DroneResponse; onClose: () => void }) {
  const historyQuery = useGetDroneMaintenanceHistoryQuery(drone.id);
  const history = historyQuery.data?.data;
  const battery = drone.batteryPercent ?? 0;
  const details = [
    ["Trạm/Kiosk", drone.lockerName ?? (drone.lockerId ? `Kiosk #${drone.lockerId}` : "Chưa gắn trạm")],
    ["KTV phụ trách", drone.assignedTechnicianName ?? "Chưa phân công"],
    ["Lần sạc gần nhất", drone.lastChargedAt ? formatDateTime(drone.lastChargedAt) : "Chưa có dữ liệu"],
    ["Thêm vào đội bay", drone.createdAt ? formatDateTime(drone.createdAt) : "Chưa có dữ liệu"],
    ["Cập nhật gần nhất", drone.updatedAt ? formatDateTime(drone.updatedAt) : "Chưa có dữ liệu"],
  ];

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-600" />
            Chi tiết sức khỏe · Drone {drone.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Thông tin vận hành</p>
                <p className="text-xs text-muted-foreground">Dữ liệu đồng bộ từ đội bay, chỉ dùng để theo dõi.</p>
              </div>
              <Badge variant="outline" className={DRONE_STATUS_BADGE[drone.status] ?? "bg-slate-50 text-slate-700"}>
                {DRONE_STATUS_LABELS[drone.status] ?? drone.status}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><BatteryCharging className="w-3.5 h-3.5" /> Mức pin ghi nhận</span>
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
                <span className="font-semibold">Ghi nhận sự cố: </span>{drone.faultReason}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="text-sm font-semibold">Lịch sử bảo trì hoàn tất</h3></div>
            {historyQuery.isLoading ? (
              <div className="py-5 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />Đang tải lịch sử bảo trì...</div>
            ) : !history?.completedMaintenance.length ? (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">Chưa có lần bảo trì hoàn tất được ghi nhận cho drone này.</p>
            ) : (
              <div className="space-y-2">
                {history.completedMaintenance.map((log) => (
                  <div key={log.id} className="rounded-md border p-3 text-xs">
                    <div className="flex items-start justify-between gap-3"><span className="font-semibold">{log.status === "PASSED" ? "Kiểm tra đạt" : log.status}</span><span className="shrink-0 text-muted-foreground">{formatDateTime(log.createdAt)}</span></div>
                    <p className="mt-1 text-muted-foreground">KTV: {log.technicianName ?? "Chưa xác định"}</p>
                    {log.note && <p className="mt-1.5 whitespace-pre-wrap">{log.note}</p>}
                    {!!log.photoUrls?.length && <p className="mt-1 text-muted-foreground">Có {log.photoUrls.length} ảnh nghiệm thu</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><h3 className="text-sm font-semibold">Sự cố đã hoàn tất</h3></div>
            {historyQuery.isLoading ? null : !history?.resolvedIncidents.length ? (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">Chưa có phiếu sự cố nào đã hoàn tất cho drone này.</p>
            ) : (
              <div className="space-y-2">
                {history.resolvedIncidents.map((report) => (
                  <div key={report.id} className="rounded-md border p-3 text-xs">
                    <div className="flex items-start justify-between gap-3"><span className="font-semibold">#{report.id} · {report.title}</span><span className="shrink-0 text-muted-foreground">{report.resolvedAt ? formatDateTime(report.resolvedAt) : "Đã hoàn tất"}</span></div>
                    {report.description && <p className="mt-1.5 text-muted-foreground whitespace-pre-wrap">{cleanDescription(report.description)}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
