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
  Zap,
  Users,
  User,
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
import { PageHeader } from "~/components/shared/page-header";
import { RepairLogDialog } from "./RepairLogDialog";
import { MaintenanceSchedules } from "./MaintenanceSchedules";
import { TechniciansTab } from "./TechniciansTab";
import type { TechnicianSummary } from "./technician-detail";
import { AssignReportDialog } from "./AssignReportDialog";
import { cleanDescription } from "./maintenancePhotos";
import { ReportPhotoGroups } from "./ReportPhotoGroups";
import { ResolveReportDialog } from "./ResolveReportDialog";
import {
  useGetFaultCellsQuery,
  useGetMaintenanceReportsQuery,
  useGetAllAdminReportsQuery,
  useClaimReportMutation,
  useResolveReportMutation,
  useClearBoxFaultMutation,
  useGetDeviceStatusesQuery,
  type LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import {
  useGetDronesQuery,
  useUpdateDroneStatusMutation,
  useUpdateDroneBatteryMutation,
  type DroneResponse,
} from "~/stores/apis/admin/drones";

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const DD = pad(d.getDate());
  const MM = pad(d.getMonth() + 1);
  const YYYY = d.getFullYear();
  return `${hh}:${mm}:${ss} ${DD}/${MM}/${YYYY}`;
};

const REPORT_BADGE: Record<string, string> = {
  OPEN: "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 font-semibold",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 font-semibold",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 font-semibold",
};

const DRONE_STATUS_BADGE: Record<string, string> = {
  IDLE: "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 font-semibold",
  CHARGING: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 font-semibold",
  IN_FLIGHT: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 font-semibold",
  IN_USE: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 font-semibold",
  MAINTENANCE: "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200 font-semibold",
  FAULT: "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 font-semibold",
};

const DRONE_STATUS_LABELS: Record<string, string> = {
  IDLE: "Sẵn sàng",
  CHARGING: "Đang sạc",
  IN_FLIGHT: "Đang bay",
  IN_USE: "Đang sử dụng",
  MAINTENANCE: "Đang bảo dưỡng",
  FAULT: "Gặp sự cố",
};

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

export default function MaintenanceAdminPage() {
  const navigate = useNavigate();
  // Kiosk operations queries
  const faults = useGetFaultCellsQuery();
  const reports = useGetMaintenanceReportsQuery();
  const deviceStatuses = useGetDeviceStatusesQuery();
  const [claim] = useClaimReportMutation();
  const [resolve] = useResolveReportMutation();
  const [clearFault] = useClearBoxFaultMutation();

  // Drone fleet queries & mutations
  const dronesQuery = useGetDronesQuery();
  const [updateDroneStatus] = useUpdateDroneStatusMutation();
  const [updateDroneBattery] = useUpdateDroneBatteryMutation();

  // Users query to get all technicians
  const usersQuery = useGetAllUsersQuery({ page: 0, size: 1000 });
  const allReportsQuery = useGetAllAdminReportsQuery();

  const [pending, setPending] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("kiosk");
  const [managingDrone, setManagingDrone] = useState<DroneResponse | null>(null);
  const [droneFilter, setDroneFilter] = useState<string>("ALL");
  const [reportFilter, setReportFilter] = useState<string>("ALL");
  const [selectedTechFilter, setSelectedTechFilter] = useState<string>("ALL");
  const [assigningReport, setAssigningReport] = useState<LockerReportResponse | null>(null);

  const faultList = faults.data?.data ?? [];
  const reportList = reports.data?.data ?? [];
  const droneList = useMemo(() => dronesQuery.data?.data ?? [], [dronesQuery.data]);
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
          roles.includes("TECHNICIAN") ||
          roles.includes("ROLE_TECHNICIAN") ||
          roles.includes("MAINTENANCE")
        );
      })
      .map((u) => {
        const roles: string[] = u.roles ?? [];
        const isKiosk = roles.includes("TECHNICIAN") || roles.includes("ROLE_TECHNICIAN");
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

  // Kiosk Stats
  const openReports = reportList.filter((r) => {
    const isTech = Boolean(
      !r.assignedToUserId &&
      ((r.userId && techniciansMap[r.userId]) ||
      r.reporterName?.toLowerCase().includes("kỹ thuật viên") ||
      r.reporterName?.toLowerCase().includes("ktv") ||
      r.reporterName?.toLowerCase().includes("technician"))
    );
    return r.status === "OPEN" && !isTech;
  }).length;

  const inProgressReports = reportList.filter((r) => {
    const isTech = Boolean(
      !r.assignedToUserId &&
      ((r.userId && techniciansMap[r.userId]) ||
      r.reporterName?.toLowerCase().includes("kỹ thuật viên") ||
      r.reporterName?.toLowerCase().includes("ktv") ||
      r.reporterName?.toLowerCase().includes("technician"))
    );
    return r.status === "IN_PROGRESS" || (r.status === "OPEN" && isTech);
  }).length;
  const resolvedReports = reportList.filter((r) => r.status === "RESOLVED").length;
  const overdueReports = reportList.filter((r) => r.overdue).length;

  // Drone Stats
  const droneFaults = droneList.filter((d) => d.status === "FAULT" || d.status === "MAINTENANCE").length;
  const droneLowBattery = droneList.filter((d) => d.batteryPercent != null && d.batteryPercent < 20).length;
  const droneActive = droneList.filter((d) => d.status === "IN_FLIGHT" || d.status === "IN_USE").length;
  const droneReady = droneList.filter((d) => d.status === "IDLE" || d.status === "CHARGING").length;

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionLabel: string;
    variant?: "default" | "destructive";
    onConfirm: () => Promise<void> | void;
  }>({
    open: false,
    title: "",
    description: "",
    actionLabel: "Xác nhận",
    variant: "default",
    onConfirm: () => {},
  });

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

  const handleQuickMaintenance = async (drone: DroneResponse, targetStatus: "MAINTENANCE" | "IDLE") => {
    setPending(drone.id);
    try {
      await updateDroneStatus({
        id: drone.id,
        status: targetStatus,
        reason: targetStatus === "MAINTENANCE" ? "Bắt đầu bảo dưỡng định kỳ" : undefined,
      }).unwrap();
      toast.success(
        targetStatus === "MAINTENANCE"
          ? `Đã chuyển Drone ${drone.code} sang chế độ bảo dưỡng`
          : `Drone ${drone.code} đã hoàn tất bảo dưỡng`,
        {
          description:
            targetStatus === "MAINTENANCE"
              ? "Thiết bị tạm dừng nhận nhiệm vụ bay để kỹ thuật viên kiểm tra."
              : "Đã kiểm tra an toàn kỹ thuật, drone sẵn sàng nhận chuyến bay mới.",
        },
      );
    } catch (err: any) {
      toast.error("Không cập nhật được trạng thái bảo dưỡng", {
        description: err?.data?.message || err?.message || "Vui lòng kiểm tra lại kết nối thiết bị.",
      });
    } finally {
      setPending(null);
    }
  };

  const handleChargeDrone = async (drone: DroneResponse) => {
    setPending(drone.id);
    try {
      await updateDroneBattery({ id: drone.id, batteryPercent: 100 }).unwrap();
      toast.success(`Nạp pin 100% thành công cho Drone ${drone.code}`, {
        description: "Mức pin đã được cập nhật đạt chuẩn năng lượng cất cánh.",
      });
    } catch (err: any) {
      toast.error("Không cập nhật được pin drone", {
        description: err?.data?.message || err?.message || "Không thể đồng bộ với bộ điều khiển sạc.",
      });
    } finally {
      setPending(null);
    }
  };

  const filteredDrones = useMemo(() => {
    if (droneFilter === "ALL") return droneList;
    if (droneFilter === "ATTENTION") {
      return droneList.filter(
        (d) => d.status === "FAULT" || d.status === "MAINTENANCE" || (d.batteryPercent != null && d.batteryPercent < 20),
      );
    }
    return droneList.filter((d) => d.status === droneFilter);
  }, [droneList, droneFilter]);

  const filteredReports = useMemo(() => {
    return reportList.filter((r) => {
      const isTech = Boolean(
        !r.assignedToUserId &&
        ((r.userId && techniciansMap[r.userId]) ||
        r.reporterName?.toLowerCase().includes("kỹ thuật viên") ||
        r.reporterName?.toLowerCase().includes("ktv") ||
        r.reporterName?.toLowerCase().includes("technician"))
      );
      const effectiveStatus = r.status === "OPEN" && isTech ? "IN_PROGRESS" : r.status;
      const effectiveTechId = r.assignedToUserId ?? (isTech ? r.userId : undefined);

      if (reportFilter !== "ALL" && effectiveStatus !== reportFilter) return false;
      if (selectedTechFilter === "UNASSIGNED") return !effectiveTechId;
      if (selectedTechFilter !== "ALL") return String(effectiveTechId) === selectedTechFilter;
      return true;
    });
  }, [reportList, reportFilter, selectedTechFilter, techniciansMap]);

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
            Bảo trì & Pin Drone ({droneFaults + droneLowBattery})
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
                  <span>{openReports > 0 ? `${openReports} phiếu chờ phân công` : "Đã tiếp nhận hết"}</span>
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
                  onClick={() => setReportFilter("OPEN")}
                >
                  Xem phiếu quá hạn SLA
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Phiếu Sự Cố Kiosk */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-500" />
                    Phiếu xử lý sự cố ({reportList.length})
                    {overdueReports > 0 && (
                      <Badge variant="outline" className="ml-1 bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                        {overdueReports} quá hạn SLA
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Điều phối và theo dõi tiến độ sửa chữa của kỹ thuật viên
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={selectedTechFilter} onValueChange={setSelectedTechFilter}>
                    <SelectTrigger className="w-48 h-8 text-xs bg-background">
                      <SelectValue placeholder="Lọc theo KTV" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả Kỹ thuật viên</SelectItem>
                      <SelectItem value="UNASSIGNED">Chưa phân công (Mới)</SelectItem>
                      {technicians.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.fullName} (#{t.id}) · {t.specialty === "KIOSK" ? "KTV Kiosk" : "KTV Drone"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-1.5">
                    {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((st) => (
                      <Button
                        key={st}
                        variant="outline"
                        size="sm"
                        onClick={() => setReportFilter(st)}
                        className={`h-7 px-2.5 text-xs font-medium ${
                          reportFilter === st ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"
                        }`}
                      >
                        {st === "ALL" ? "Tất cả" : st === "OPEN" ? "Mới mở" : st === "IN_PROGRESS" ? "Đang làm" : "Đã xong"}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredReports.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Không có phiếu sự cố nào phù hợp.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredReports.map((r) => (
                    <div key={r.id} className="py-3 flex items-center justify-between gap-4 flex-wrap hover:bg-muted/20 px-2 rounded-lg transition-colors">
                      <div className="max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground">
                            #{r.id} · {r.title}
                          </p>
                          {/* Status Badge */}
                          {(() => {
                            const isTech = Boolean(
                              !r.assignedToUserId &&
                              ((r.userId && techniciansMap[r.userId]) ||
                              r.reporterName?.toLowerCase().includes("kỹ thuật viên") ||
                              r.reporterName?.toLowerCase().includes("ktv") ||
                              r.reporterName?.toLowerCase().includes("technician"))
                            );
                            const effStatus = r.status === "OPEN" && isTech ? "IN_PROGRESS" : r.status;
                            return (
                              <Badge variant="outline" className={`text-xs ${REPORT_BADGE[effStatus] ?? ""}`}>
                                {effStatus === "OPEN" ? "Mới mở" : effStatus === "IN_PROGRESS" ? "Đang xử lý" : "Đã hoàn tất"}
                                {isTech && !r.assignedToUserId ? " (KTV tự báo)" : ""}
                              </Badge>
                            );
                          })()}
                          {r.overdue && (
                            <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                              Quá hạn SLA
                            </Badge>
                          )}
                          {/* Technician badge */}
                          {(() => {
                            const isTech = Boolean(
                              !r.assignedToUserId &&
                              ((r.userId && techniciansMap[r.userId]) ||
                              r.reporterName?.toLowerCase().includes("kỹ thuật viên") ||
                              r.reporterName?.toLowerCase().includes("ktv") ||
                              r.reporterName?.toLowerCase().includes("technician"))
                            );
                            const assignedTech = r.assignedToUserId ? techniciansMap[r.assignedToUserId] : undefined;
                            const reporterTech = r.userId ? techniciansMap[r.userId] : undefined;
                            const effectiveTech = assignedTech || (isTech ? (reporterTech || { id: r.userId, fullName: r.reporterName, phoneNumber: r.reporterPhone }) : undefined);

                            if (effectiveTech) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (effectiveTech.id) {
                                      navigate(`/admin/maintenance/technicians/${effectiveTech.id}`);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200 transition-colors cursor-pointer"
                                  title="Xem chi tiết hồ sơ & hoạt động của KTV này"
                                >
                                  <UserCheck className="w-3 h-3 text-indigo-700" />
                                  <span>KTV: {effectiveTech.fullName || `#${effectiveTech.id}`}</span>
                                  {isTech && !r.assignedToUserId && (
                                    <span className="text-[10px] text-indigo-600 font-normal">
                                      (Người báo)
                                    </span>
                                  )}
                                  {effectiveTech.phoneNumber && (
                                    <span className="text-[10px] text-indigo-600 font-mono">
                                      ({effectiveTech.phoneNumber})
                                    </span>
                                  )}
                                </button>
                              );
                            }
                            return (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold">
                                Chưa phân công
                              </Badge>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="text-foreground">{cleanDescription(r.description) || r.description}</span> · <span className="font-medium text-foreground">{r.lockerName ?? `Kiosk #${r.lockerId}`}</span>
                          {r.boxNumber ? ` · Ô #${r.boxNumber}` : r.boxId ? ` · Ô #${r.boxId}` : ""}{" "}
                          {r.cellType ? `· Loại ${r.cellType} ` : ""}
                          · Tạo lúc: <span className="text-foreground font-mono">{formatDateTime(r.createdAt)}</span>
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
                        {(() => {
                          const isTech = Boolean(
                            !r.assignedToUserId &&
                            ((r.userId && techniciansMap[r.userId]) ||
                            r.reporterName?.toLowerCase().includes("kỹ thuật viên") ||
                            r.reporterName?.toLowerCase().includes("ktv") ||
                            r.reporterName?.toLowerCase().includes("technician"))
                          );
                          const techName = r.assignedToUserId
                            ? techniciansMap[r.assignedToUserId]?.fullName
                            : isTech
                            ? (techniciansMap[r.userId]?.fullName || r.reporterName)
                            : undefined;

                          return (
                            <>
                              <RepairLogDialog
                                reportId={r.id}
                                title={`#${r.id} · ${r.title}`}
                                technicianName={techName}
                                report={r}
                              />

                              {r.status === "OPEN" && !isTech && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50 shadow-xs"
                                  onClick={() => setAssigningReport(r)}
                                >
                                  <Boxes className="w-3.5 h-3.5" /> Phân công KTV
                                </Button>
                              )}

                              {(r.status === "IN_PROGRESS" || (r.status === "OPEN" && isTech)) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                                  onClick={() => setAssigningReport(r)}
                                >
                                  <UserCheck className="w-3.5 h-3.5" /> Đổi KTV
                                </Button>
                              )}
                            </>
                          );
                        })()}

                        {r.status === "RESOLVED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> KTV đã xử lý xong
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
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
                    const online = d.status?.toUpperCase() === "ONLINE";
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
          {/* Drone KPI Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Cần bảo trì / Lỗi</p>
                  <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneFaults}
                </p>
                <div className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${droneFaults > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {droneFaults > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{droneFaults > 0 ? "Cần kiểm tra kỹ thuật" : "Đội bay an toàn"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Pin yếu (&lt; 20%)</p>
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                    <BatteryWarning className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneLowBattery}
                </p>
                <div className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${droneLowBattery > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {droneLowBattery > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{droneLowBattery > 0 ? "Cần sạc hoặc thay pin" : "Tất cả pin ổn định"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Đang bay / Sử dụng</p>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                    <Plane className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneActive}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-blue-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Nhiệm vụ vận chuyển</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Sẵn sàng / Đang sạc</p>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {droneReady}
                </p>
                <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-emerald-600">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>Sẵn sàng cất cánh</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attention Banner if any Drone has issues */}
          {(droneFaults > 0 || droneLowBattery > 0) && (
            <Card className="border-rose-200/80 bg-rose-50/40 shadow-xs">
              <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-rose-900">
                      Cần can thiệp kỹ thuật ngay cho {droneFaults + droneLowBattery} thiết bị Drone
                    </h4>
                    <p className="text-xs text-rose-700 mt-0.5">
                      Phát hiện drone gặp sự cố kỹ thuật hoặc mức pin dưới 20%. Hãy tiến hành bảo dưỡng hoặc sạc pin để tránh gián đoạn các chuyến bay giao nhận.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-rose-300 text-rose-700 hover:bg-rose-100 bg-white"
                  onClick={() => setDroneFilter("ATTENTION")}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Xem danh sách cần bảo trì
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Danh sách Drone & Thao Tác Kỹ Thuật */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Plane className="w-4 h-4 text-blue-600" />
                    Giám sát kỹ thuật & bảo dưỡng đội bay Drone ({filteredDrones.length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Quản lý chu kỳ bảo trì, theo dõi phần trăm pin và cập nhật tình trạng bay
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "ALL", label: "Tất cả" },
                    { id: "ATTENTION", label: "Cần bảo trì / Pin yếu" },
                    { id: "IDLE", label: "Sẵn sàng" },
                    { id: "CHARGING", label: "Đang sạc" },
                    { id: "MAINTENANCE", label: "Đang bảo dưỡng" },
                    { id: "FAULT", label: "Sự cố" },
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

                          {/* Action Buttons for Maintenance */}
                          <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1.5">
                            {isUnderMaintenance ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1 flex-1"
                                disabled={pending === d.id}
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    title: `Xác nhận hoàn tất bảo dưỡng Drone ${d.code}?`,
                                    description: `Xác nhận thiết bị đã được kiểm tra kỹ thuật đạt chuẩn an toàn bay và sẵn sàng đưa trở lại đội bay hoạt động.`,
                                    actionLabel: "Đưa vào hoạt động (Sẵn sàng)",
                                    variant: "default",
                                    onConfirm: () => handleQuickMaintenance(d, "IDLE"),
                                  })
                                }
                              >
                                <CheckCircle2 className="w-3 h-3" /> Hoàn tất bảo dưỡng
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50 gap-1 flex-1"
                                disabled={pending === d.id}
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    title: `Chuyển Drone ${d.code} sang chế độ bảo dưỡng?`,
                                    description: `Thiết bị sẽ tạm dừng nhận các chuyến bay vận chuyển cho đến khi kỹ thuật viên hoàn tất kiểm tra bảo dưỡng.`,
                                    actionLabel: "Bắt đầu bảo dưỡng",
                                    variant: "default",
                                    onConfirm: () => handleQuickMaintenance(d, "MAINTENANCE"),
                                  })
                                }
                              >
                                <Wrench className="w-3 h-3" /> Bảo dưỡng
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 gap-1"
                              disabled={pending === d.id || battery >= 98}
                              onClick={() =>
                                setConfirmDialog({
                                  open: true,
                                  title: `Nạp đầy pin 100% cho Drone ${d.code}?`,
                                  description: `Hệ thống sẽ gửi lệnh cập nhật mức năng lượng pin của drone lên 100% để đảm bảo sẵn sàng cất cánh.`,
                                  actionLabel: "Nạp đầy pin 100%",
                                  variant: "default",
                                  onConfirm: () => handleChargeDrone(d),
                                })
                              }
                              title="Nạp đầy pin 100%"
                            >
                              <Zap className="w-3 h-3" /> Sạc 100%
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setManagingDrone(d)}
                            >
                              Chi tiết
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

          {/* Nhật Ký Sửa Chữa Đã Hoàn Tất */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Lịch sử hoàn tất bảo trì & xử lý sự cố thiết bị
              </CardTitle>
              <CardDescription className="text-xs">
                Toàn bộ hồ sơ các phiếu sự cố Kiosk và đợt bảo trì đã giải quyết thành công
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportList.filter((r) => r.status === "RESOLVED").length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Chưa có phiếu bảo trì nào được lưu trữ.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {reportList
                    .filter((r) => r.status === "RESOLVED")
                    .map((r) => (
                      <div key={r.id} className="py-3 flex items-center justify-between gap-4 flex-wrap hover:bg-muted/20 px-2 rounded-lg transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-foreground">
                              #{r.id} · {r.title}
                            </p>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              Đã hoàn tất
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {r.description} · Thiết bị: <span className="font-medium text-foreground">{r.lockerName ?? `Kiosk #${r.lockerId}`}</span>
                            {r.boxNumber ? ` · Ô #${r.boxNumber}` : ""}
                            · Thời gian: <span className="text-foreground font-mono">{formatDateTime(r.createdAt)}</span>
                            {r.assignedToUserId ? ` · Kỹ thuật viên: #${r.assignedToUserId}` : ""}
                          </p>
                        </div>
                        <RepairLogDialog reportId={r.id} title={`#${r.id} · ${r.title}`} report={r} />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ĐỘI NGŨ KỸ THUẬT VIÊN */}
        <TabsContent value="technicians" className="space-y-6">
          <TechniciansTab
            onAssignToTech={(techId) => {
              setSelectedTechFilter(String(techId));
              setActiveTab("kiosk");
              toast.info(`Đang hiển thị các sự cố phân công cho KTV #${techId}`);
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
        title={resolvingReport ? `Xác nhận hoàn tất xử lý phiếu #${resolvingReport.id}?` : ""}
        description={
          resolvingReport
            ? `Xác nhận sự cố "${resolvingReport.title}" đã được sửa chữa triệt để? Phiếu sẽ chuyển sang trạng thái Đã hoàn tất và ô tủ liên quan sẽ mở khóa phục vụ khách hàng.`
            : undefined
        }
        onSubmit={async ({ note, attachments }) => {
          if (!resolvingReport) return;
          const id = resolvingReport.id;
          setPending(id);
          try {
            await resolve({ reportId: id, note, attachments }).unwrap();
            toast.success(`Phiếu #${id} đã hoàn tất thành công`, {
              description: attachments?.length
                ? `Sự cố đã được đóng hồ sơ kèm ${attachments.length} ảnh nghiệm thu.`
                : "Sự cố kỹ thuật đã được đóng hồ sơ và lưu nhật ký.",
            });
          } finally {
            setPending(null);
          }
        }}
      />


      {/* Drone Technical Manage Dialog */}
      {managingDrone && (
        <DroneMaintenanceDialog
          drone={managingDrone}
          onClose={() => setManagingDrone(null)}
          onSave={async ({ id, status, reason, battery }) => {
            try {
              await updateDroneStatus({
                id,
                status,
                reason: status === "FAULT" || status === "MAINTENANCE" ? reason : undefined,
              }).unwrap();

              if (battery != null) {
                await updateDroneBattery({ id, batteryPercent: battery }).unwrap();
              }
              toast.success(`Cập nhật thông số Drone ${managingDrone.code} thành công`, {
                description: "Trạng thái kỹ thuật và mức pin đã được đồng bộ hóa với hệ thống.",
              });
              setManagingDrone(null);
            } catch (err: any) {
              toast.error("Không cập nhật được thông số drone", {
                description: err?.data?.message || err?.message || "Đã xảy ra lỗi khi lưu thông số.",
              });
            }
          }}
        />
      )}

      {/* Confirmation Alert Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog((prev) => ({ ...prev, open: false }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.variant === "destructive" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}
              onClick={async () => {
                await confirmDialog.onConfirm();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
            >
              {confirmDialog.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Dialog hỗ trợ chỉnh sửa thông số bảo trì & pin của Drone
function DroneMaintenanceDialog({
  drone,
  onClose,
  onSave,
}: {
  drone: DroneResponse;
  onClose: () => void;
  onSave: (data: { id: number; status: string; reason?: string; battery: number | null }) => Promise<void>;
}) {
  const [status, setStatus] = useState(drone.status);
  const [reason, setReason] = useState(drone.faultReason ?? "");
  const [battery, setBattery] = useState(drone.batteryPercent != null ? String(drone.batteryPercent) : "100");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (status === "FAULT" && !reason.trim()) {
      toast.error("Vui lòng nhập lý do phát sinh sự cố");
      return;
    }
    setSaving(true);
    const parsedBattery = battery.trim() === "" ? null : Number(battery);
    await onSave({
      id: drone.id,
      status,
      reason: reason.trim(),
      battery: parsedBattery != null && !isNaN(parsedBattery) ? parsedBattery : null,
    });
    setSaving(false);
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-600" />
            Cập nhật bảo trì · Drone {drone.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Trạng thái kỹ thuật</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDLE">Sẵn sàng hoạt động (IDLE)</SelectItem>
                <SelectItem value="CHARGING">Đang nạp sạc (CHARGING)</SelectItem>
                <SelectItem value="MAINTENANCE">Đang bảo dưỡng kỹ thuật (MAINTENANCE)</SelectItem>
                <SelectItem value="FAULT">Báo cáo sự cố / Hỏng hóc (FAULT)</SelectItem>
                <SelectItem value="IN_FLIGHT">Đang bay làm nhiệm vụ (IN_FLIGHT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === "FAULT" || status === "MAINTENANCE") && (
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                {status === "FAULT" ? "Nguyên nhân sự cố (bắt buộc)" : "Hạng mục bảo dưỡng"}
              </Label>
              <Input
                placeholder="VD: Kiểm tra cánh quạt, căn chỉnh GPS, bảo dưỡng motor..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="block text-xs font-medium">Mức pin ghi nhận (%)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-blue-600 hover:text-blue-700 px-1.5"
                onClick={() => setBattery("100")}
              >
                Đặt đầy 100%
              </Button>
            </div>
            <Input
              type="number"
              min={0}
              max={100}
              value={battery}
              onChange={(e) => setBattery(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={saving} className="bg-primary text-primary-foreground">
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Lưu thông số
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
