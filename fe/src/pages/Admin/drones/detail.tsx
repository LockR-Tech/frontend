import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Cpu,
  ExternalLink,
  History,
  Loader2,
  MapPin,
  Plane,
  RefreshCw,
  Route,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDateTime } from "~/lib/datetime";
import { extractList } from "~/lib/extract-list";
import {
  useGetAllAdminReportsQuery,
  useGetLockerStatsQuery,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { useGetDroneOrdersQuery } from "~/stores/apis/admin/droneOrders";
import {
  useAssignDroneTechnicianMutation,
  useGetDroneOperationLogsQuery,
  useGetDroneQuery,
  useGetDronesQuery,
  useUpdateDroneMutation,
  useGetDroneIotLogsQuery,
} from "~/stores/apis/admin/drones";
import { DroneAdminActions } from "./DroneAdminActions";
import { DroneHardwarePanel } from "./components/DroneHardwarePanel";
import { DroneIotLogsPanel } from "./components/DroneIotLogsPanel";

const NO_TECHNICIAN = "NONE";
// Giá trị là khoá i18n; dịch lúc render.
const STATUS_LABELS: Record<string, string> = {
  IDLE: "admin.drones.status.idle",
  RESERVED: "admin.drones.status.reserved",
  CHARGING: "admin.drones.status.charging",
  IN_FLIGHT: "admin.drones.status.inFlight",
  MAINTENANCE: "admin.drones.status.underMaintenance",
  FAULT: "admin.drones.status.fault",
};
const MISSION_STATUS_LABELS: Record<string, string> = {
  AWAITING_LOADING: "admin.drones.missionStatus.awaitingLoading",
  ASSIGNED: "admin.drones.missionStatus.assigned",
  LOADING: "admin.drones.missionStatus.loading",
  READY_TO_LAUNCH: "admin.drones.missionStatus.readyToLaunch",
  LAUNCHING: "admin.drones.missionStatus.launching",
  DEPARTED: "admin.drones.missionStatus.departed",
  EN_ROUTE: "admin.drones.missionStatus.inFlight",
  APPROACHING: "admin.drones.missionStatus.approaching",
  IN_FLIGHT: "admin.drones.missionStatus.inFlight",
  ARRIVED: "admin.drones.missionStatus.arrived",
  DEPOSITED: "admin.drones.missionStatus.deposited",
  READY_FOR_PICKUP: "admin.drones.missionStatus.readyForPickup",
  COMPLETED: "admin.drones.missionStatus.completed",
  CANCELED: "admin.drones.missionStatus.canceled",
  EXPIRED: "admin.drones.missionStatus.expired",
  FAILED: "admin.drones.missionStatus.failed",
  DROP_REPORTED: "admin.drones.missionStatus.dropReported",
};
const STATUS_BADGE: Record<string, string> = {
  IDLE: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
  RESERVED: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-700",
  CHARGING: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
  IN_FLIGHT: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700",
  MAINTENANCE: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700",
  FAULT: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700",
};

function missionStatusLabel(status: string, t: TFunction) {
  const key = MISSION_STATUS_LABELS[status];
  return key ? t(key) : status;
}

function reportStatusLabel(status: string, t: TFunction) {
  if (status === "RESOLVED") return t("admin.drones.reportStatus.resolved");
  if (status === "IN_PROGRESS") return t("admin.drones.reportStatus.inProgress");
  return t("admin.drones.reportStatus.open");
}

function flightStatusClass(status?: string | null) {
  const value = status?.toUpperCase() ?? "";
  if (["FAILED", "CANCELED", "CANCELLED", "EXPIRED", "DROP_REPORTED"].includes(value)) {
    return "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
  }
  if (
    ["ARRIVED", "DEPOSITED", "READY_FOR_PICKUP", "COMPLETED"].includes(value)
  ) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (
    ["LAUNCHING", "DEPARTED", "EN_ROUTE", "APPROACHING", "IN_FLIGHT"].includes(
      value,
    )
  ) {
    return "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  }
  if (
    ["AWAITING_LOADING", "ASSIGNED", "LOADING", "READY_TO_LAUNCH"].includes(
      value,
    )
  ) {
    return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }
  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default function DroneDetailPage() {
  const { t } = useTranslation();
  const { droneId } = useParams<{ droneId: string }>();
  const navigate = useNavigate();
  const id = Number(droneId);
  const invalidId = !Number.isSafeInteger(id) || id <= 0;

  const droneQuery = useGetDroneQuery(id, {
    skip: invalidId,
    pollingInterval: 15000,
  });
  const dronesQuery = useGetDronesQuery(undefined, { pollingInterval: 15000 });
  const flightsQuery = useGetDroneOrdersQuery(undefined, {
    pollingInterval: 15000,
  });
  const reportsQuery = useGetAllAdminReportsQuery(undefined, {
    pollingInterval: 15000,
  });
  const logsQuery = useGetDroneOperationLogsQuery(id, {
    skip: invalidId,
    pollingInterval: 15000,
  });
  const iotLogsQuery = useGetDroneIotLogsQuery(id, {
    skip: invalidId,
    pollingInterval: 10000,
  });
  const iotLogsCount = iotLogsQuery.data?.data?.length ?? 0;
  const lockersQuery = useGetLockerStatsQuery();
  // Một danh sách người dùng dùng chung: lọc KTV Drone cho ô chọn và tra tên người
  // xử lý phiếu / người thao tác trong nhật ký (backend chỉ trả userId).
  const usersQuery = useGetAllUsersQuery({ page: 0, size: 1000 });
  const [assignDroneTechnician, assignmentState] =
    useAssignDroneTechnicianMutation();
  const [updateDrone, updateDroneState] = useUpdateDroneMutation();
  const [techChoice, setTechChoice] = useState<string | null>(null);
  const [lockerChoice, setLockerChoice] = useState<string | null>(null);
  const [activeLogTab, setActiveLogTab] = useState<
    "iot" | "flights" | "reports" | "operations"
  >("iot");

  const drone =
    droneQuery.data?.data ??
    dronesQuery.data?.data?.find((item) => item.id === id);
  const droneReports = useMemo(
    () =>
      (reportsQuery.data?.data ?? [])
        .filter((report) => report.droneUnitId === id)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [id, reportsQuery.data],
  );
  const flightLogs = useMemo(
    () =>
      (flightsQuery.data?.data ?? [])
        .filter(
          (order) =>
            order.droneUnitId === id ||
            (!!drone?.code && order.droneCode === drone.code),
        )
        .sort((a, b) =>
          (b.missionCreatedAt ?? b.createdAt ?? "").localeCompare(
            a.missionCreatedAt ?? a.createdAt ?? "",
          ),
        ),
    [drone?.code, flightsQuery.data, id],
  );
  const userNames = useMemo(() => {
    const names = new Map<number, string>();
    extractList<any>(usersQuery.data?.data).forEach((user) => {
      if (user?.id != null) {
        names.set(
          Number(user.id),
          user.fullName || user.name || user.email || `#${user.id}`,
        );
      }
    });
    return names;
  }, [usersQuery.data]);
  // Nhật ký backend trả cũ → mới; hiển thị mới nhất trước
  const operationLogs = useMemo(
    () =>
      [...(logsQuery.data?.data ?? [])].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    [logsQuery.data],
  );
  // Chỉ Kiosk có bãi đáp mới nhận được Drone (giữ Kiosk hiện tại để Select hiển thị đúng)
  const landingPadLockers = useMemo(
    () =>
      (lockersQuery.data?.data ?? []).filter(
        (locker) => locker.landingPad || locker.lockerId === drone?.lockerId,
      ),
    [lockersQuery.data, drone?.lockerId],
  );
  const droneTechnicians = useMemo(
    () =>
      extractList<any>(usersQuery.data?.data)
        .filter((user) => {
          const roles: string[] = user.roles ?? [];
          return (
            roles.includes("DRONE_TECHNICIAN") ||
            roles.includes("ROLE_DRONE_TECHNICIAN")
          );
        })
        .map((user) => ({
          id: user.id as number,
          name: (user.fullName ||
            user.name ||
            t("admin.drones.detail.tech.fallbackName", { id: user.id })) as string,
          phone: (user.phoneNumber || "") as string,
          // users slice suy `enabled` từ status của user-service; tài khoản khoá không chọn được
          active: user.enabled !== false,
        }))
        // KTV đang hoạt động lên trước
        .sort((a, b) => Number(b.active) - Number(a.active)),
    [usersQuery.data, t],
  );

  const refresh = () =>
    void Promise.all([
      droneQuery.refetch(),
      dronesQuery.refetch(),
      flightsQuery.refetch(),
      reportsQuery.refetch(),
      logsQuery.refetch(),
      iotLogsQuery.refetch(),
    ]);

  if (
    invalidId ||
    (!droneQuery.isLoading && !dronesQuery.isLoading && !drone)
  ) {
    return (
      <div className="py-16 text-center">
        <Plane className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h1 className="mt-3 text-lg font-semibold">{t("admin.drones.detail.notFound")}</h1>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => navigate("/admin/drones")}
        >
          {t("admin.drones.detail.backToList")}
        </Button>
      </div>
    );
  }
  if (!drone)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const assignedTechId = drone.assignedTechnicianId;
  const assignedTechName =
    drone.assignedTechnicianName ??
    droneTechnicians.find((technician) => technician.id === assignedTechId)
      ?.name ??
    (assignedTechId != null
      ? t("admin.drones.detail.tech.fallbackName", { id: assignedTechId })
      : null);
  const currentTechValue =
    assignedTechId == null ? NO_TECHNICIAN : String(assignedTechId);
  const selectedTechValue = techChoice ?? currentTechValue;
  const currentLockerValue =
    drone.lockerId == null ? "" : String(drone.lockerId);
  const selectedLockerValue = lockerChoice ?? currentLockerValue;
  const activeMission = ["RESERVED", "IN_FLIGHT"].includes(drone.status);

  const saveTechnician = async () => {
    const technicianId =
      selectedTechValue === NO_TECHNICIAN ? null : Number(selectedTechValue);
    try {
      await assignDroneTechnician({ id, technicianId }).unwrap();
      setTechChoice(null);
      toast.success(
        technicianId == null
          ? t("admin.drones.detail.tech.unassignedToast")
          : t("admin.drones.detail.tech.assignedToast", {
              name:
                droneTechnicians.find((item) => item.id === technicianId)?.name ??
                t("admin.drones.detail.tech.fallbackName", { id: technicianId }),
            }),
      );
      await droneQuery.refetch();
    } catch (error: any) {
      toast.error(t("admin.drones.detail.tech.saveFailed"), {
        description:
          error?.data?.message || error?.message || t("common.pleaseRetry"),
      });
    }
  };

  const saveLocker = async () => {
    const lockerId = Number(selectedLockerValue);
    if (!Number.isSafeInteger(lockerId) || lockerId <= 0) return;
    try {
      await updateDrone({ id, lockerId }).unwrap();
      setLockerChoice(null);
      const locker = lockersQuery.data?.data?.find(
        (item) => item.lockerId === lockerId,
      );
      toast.success(
        t("admin.drones.detail.station.movedToast", {
          code: drone.code,
          locker:
            locker?.name ??
            locker?.code ??
            t("admin.drones.detail.station.kiosk", { id: lockerId }),
        }),
      );
      await Promise.all([droneQuery.refetch(), dronesQuery.refetch()]);
    } catch (error: any) {
      toast.error(t("admin.drones.detail.station.moveFailed"), {
        description:
          error?.data?.message ||
          error?.message ||
          t("admin.drones.detail.station.moveFailedHint"),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header tổng quan */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate("/admin/drones")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">
                {t("admin.drones.detail.title", { code: drone.code })}
              </h1>
              <Badge
                variant="outline"
                className={`px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[drone.status] ?? "bg-muted"}`}
              >
                {STATUS_LABELS[drone.status] ? t(STATUS_LABELS[drone.status]) : drone.status}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
              <span>{t("admin.drones.detail.deviceId", { id: drone.id })}</span>
              <span>•</span>
              <span>
                {t("admin.drones.detail.station.currentLabel")}{" "}
                <strong className="font-medium text-foreground">
                  {drone.lockerName ??
                    (drone.lockerId
                      ? t("admin.drones.detail.station.kiosk", { id: drone.lockerId })
                      : t("admin.drones.detail.station.notAttached"))}
                </strong>
              </span>
              <span>•</span>
              <span>
                {drone.active !== false ? (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Đang vận hành
                  </span>
                ) : (
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    Đã ngừng hoạt động
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="h-9 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          {t("button.refresh")}
        </Button>
      </div>

      {/* 2. Cảnh báo lỗi kỹ thuật (nếu drone đang có faultReason) */}
      {drone.faultReason && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50/90 p-4 text-rose-900 shadow-2xs dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
              {t("admin.drones.detail.info.faultReason")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-rose-700 dark:text-rose-300/90">
              {drone.faultReason}
            </p>
          </div>
        </div>
      )}

      {/* 3. Điều phối & Thông tin thiết bị (Bố cục 3 card gọn gàng, KHÔNG TRÙNG LẶP) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Card 1: Kỹ thuật viên phụ trách */}
        <Card className="flex flex-col justify-between border border-border/80 shadow-xs">
          <CardHeader className="px-4 pb-2 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-200/60 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {t("admin.drones.detail.tech.title")}
                </CardTitle>
                <CardDescription className="text-xs">
                  Phân công kỹ thuật viên theo dõi
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-3 p-4 pt-1">
            <div className="rounded-lg border bg-muted/20 p-2.5 text-xs text-muted-foreground">
              {assignedTechId != null ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="text-muted-foreground">Đang phụ trách:</span>
                    <Link
                      to={`/admin/technicians/${assignedTechId}`}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      {assignedTechName}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t("admin.drones.detail.tech.assignedHint", { name: assignedTechName })}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  {t("admin.drones.detail.tech.unassignedHint")}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Select
                value={selectedTechValue}
                onValueChange={setTechChoice}
                disabled={assignmentState.isLoading}
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder={t("admin.drones.detail.tech.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TECHNICIAN}>
                    {t("admin.drones.detail.tech.noneOption")}
                  </SelectItem>
                  {assignedTechId != null &&
                    !droneTechnicians.some(
                      (technician) => technician.id === assignedTechId,
                    ) && (
                      <SelectItem value={currentTechValue}>
                        {assignedTechName}
                      </SelectItem>
                    )}
                  {droneTechnicians.map((technician) => (
                    <SelectItem
                      key={technician.id}
                      value={String(technician.id)}
                      disabled={!technician.active}
                    >
                      {technician.name} (#{technician.id})
                      {technician.phone ? ` · ${technician.phone}` : ""}
                      {!technician.active ? ` · ${t("admin.drones.detail.tech.locked")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 shrink-0 px-3 text-xs"
                onClick={saveTechnician}
                disabled={
                  assignmentState.isLoading ||
                  selectedTechValue === currentTechValue
                }
              >
                {assignmentState.isLoading ? t("common.saving") : t("button.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Trạm gắn kết / Bãi đáp */}
        <Card className="flex flex-col justify-between border border-border/80 shadow-xs">
          <CardHeader className="px-4 pb-2 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-200/60 bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {t("admin.drones.detail.station.title")}
                </CardTitle>
                <CardDescription className="text-xs">
                  Bãi đáp và trạm đỗ hiện tại
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-3 p-4 pt-1">
            <div className="rounded-lg border bg-muted/20 p-2.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-1">
                <span className="text-muted-foreground">{t("admin.drones.detail.station.currentLabel")}</span>
                <span className="truncate font-semibold text-foreground">
                  {drone.lockerName ??
                    (drone.lockerId
                      ? t("admin.drones.detail.station.kiosk", { id: drone.lockerId })
                      : t("admin.drones.detail.station.notAttached"))}
                </span>
              </div>
              {activeMission && (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                  {t("admin.drones.detail.station.activeMissionHint")}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Select
                value={selectedLockerValue}
                onValueChange={setLockerChoice}
                disabled={activeMission || updateDroneState.isLoading}
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder={t("admin.drones.detail.station.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {landingPadLockers.map((locker) => (
                    <SelectItem
                      key={locker.lockerId}
                      value={String(locker.lockerId)}
                    >
                      {locker.name} ({locker.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 shrink-0 px-3 text-xs"
                onClick={saveLocker}
                disabled={
                  activeMission ||
                  updateDroneState.isLoading ||
                  !selectedLockerValue ||
                  selectedLockerValue === currentLockerValue
                }
              >
                {updateDroneState.isLoading ? t("common.saving") : t("button.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Thông tin hệ thống (Được cơ cấu lại, loại bỏ trùng lặp mã drone, trạm và pin) */}
        <Card className="flex flex-col justify-between border border-border/80 shadow-xs">
          <CardHeader className="px-4 pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-200/60 bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {t("admin.drones.detail.info.title")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Thông số vòng đời & hồ sơ hệ thống
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={drone.active !== false ? "outline" : "destructive"}
                className={`text-[10px] font-medium ${drone.active !== false ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : ""}`}
              >
                {drone.active !== false ? "Đang vận hành" : "Ngừng hoạt động"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-2.5 p-4 pt-1 text-xs">
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-2.5">
              <div>
                <p className="text-[11px] text-muted-foreground">{t("admin.drones.detail.info.lastCharged")}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                  {drone.lastChargedAt ? formatDateTime(drone.lastChargedAt) : t("common.noDataYet")}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Mã ID hệ thống</p>
                <p className="mt-0.5 font-mono text-xs font-medium text-foreground">
                  #{drone.id}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("common.createdAtTime")}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                  {formatDateTime(drone.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("admin.drones.detail.info.updatedAt")}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                  {formatDateTime(drone.updatedAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span>Trạng thái nhiệm vụ:</span>
              <span className="font-semibold text-foreground">
                {STATUS_LABELS[drone.status] ? t(STATUS_LABELS[drone.status]) : drone.status}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Thao tác quản trị */}
      <DroneAdminActions drone={drone} activeMission={activeMission} />

      {/* 5. Bộ điều khiển & Thiết bị phần cứng (Raspberry Pi, Pixhawk, Pin & Camera trực tiếp) */}
      <DroneHardwarePanel
        droneId={id}
        droneCode={drone.code}
        onOperationLogged={() => {
          void Promise.all([logsQuery.refetch(), iotLogsQuery.refetch()]);
        }}
      />

      {/* 6. NHẬT KÝ VẬN HÀNH (1 DÒNG RIÊNG, TOÀN BỘ CHIỀU RỘNG!) */}
      <Card className="w-full overflow-hidden border border-border/80 shadow-xs">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4.5 w-4.5 text-primary" />
                {t("admin.drones.detail.logs.title", { code: drone.code })}
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                {t("admin.drones.detail.logs.description")}
              </CardDescription>
            </div>
            <div className="inline-flex rounded-lg border bg-background p-0.5 text-xs">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${activeLogTab === "iot" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveLogTab("iot")}
              >
                {t("admin.drones.detail.logs.iotTab", { count: iotLogsCount })}
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${activeLogTab === "flights" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveLogTab("flights")}
              >
                {t("admin.drones.detail.logs.flightsTab", { count: flightLogs.length })}
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${activeLogTab === "reports" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveLogTab("reports")}
              >
                {t("admin.drones.detail.logs.reportsTab", { count: droneReports.length })}
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${activeLogTab === "operations" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveLogTab("operations")}
              >
                {t("admin.drones.detail.logs.operationsTab", { count: operationLogs.length })}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {activeLogTab === "iot" ? (
            <DroneIotLogsPanel droneId={id} droneCode={drone.code} embedded={true} />
          ) : activeLogTab === "flights" ? (
            flightsQuery.isLoading ? (
              <LoadingRows />
            ) : flightLogs.length === 0 ? (
              <EmptyState
                icon={<Route className="h-8 w-8" />}
                text={t("admin.drones.detail.logs.noFlights")}
              />
            ) : (
              <FlightTable flights={flightLogs} />
            )
          ) : activeLogTab === "operations" ? (
            logsQuery.isLoading ? (
              <LoadingRows />
            ) : logsQuery.isError ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8" />}
                text={t("admin.drones.detail.logs.operationsLoadFailed")}
              />
            ) : operationLogs.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8" />}
                text={t("admin.drones.detail.logs.noOperations")}
              />
            ) : (
              <OperationLogTable logs={operationLogs} userNames={userNames} />
            )
          ) : reportsQuery.isLoading ? (
            <LoadingRows />
          ) : droneReports.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
              text={t("admin.drones.detail.logs.noReports")}
            />
          ) : (
            <ReportTable reports={droneReports} userNames={userNames} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FlightTable({
  flights,
}: {
  flights: ReturnType<typeof useGetDroneOrdersQuery>["data"] extends {
    data: infer T;
  }
    ? T
    : never;
}) {
  const { t } = useTranslation();
  const rows = flights as NonNullable<
    ReturnType<typeof useGetDroneOrdersQuery>["data"]
  >["data"];
  return (
    <div className="overflow-hidden rounded-lg border border-border/80">
      <Table className="text-xs">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[110px] font-semibold">{t("admin.drones.detail.flightTable.missionCode")}</TableHead>
            <TableHead className="w-[130px] font-semibold">{t("admin.drones.detail.flightTable.orderCode")}</TableHead>
            <TableHead className="font-semibold">{t("admin.drones.detail.flightTable.route")}</TableHead>
            <TableHead className="w-[150px] font-semibold">
              {t("common.status")}
            </TableHead>
            <TableHead className="w-[170px] font-semibold">{t("admin.drones.detail.flightTable.dispatch")}</TableHead>
            <TableHead className="w-[160px] font-semibold">{t("common.time")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((flight) => (
            <TableRow key={flight.orderId} className="hover:bg-muted/30">
              <TableCell className="font-bold text-primary">
                {flight.missionId != null ? `MSN-${flight.missionId}` : "—"}
              </TableCell>
              <TableCell className="font-mono font-semibold">
                {flight.orderCode}
              </TableCell>
              <TableCell>
                {flight.sourceLocker?.code ??
                  t("admin.drones.detail.station.kiosk", { id: flight.sourceLockerId ?? "—" })}{" "}
                →{" "}
                {flight.destinationLocker?.code ??
                  t("admin.drones.detail.station.kiosk", { id: flight.destinationLockerId ?? "—" })}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${flightStatusClass(flight.missionStatus ?? flight.deliveryStage ?? flight.status)}`}
                >
                  {missionStatusLabel(
                    flight.missionStatus ??
                      flight.deliveryStage ??
                      flight.status,
                    t,
                  )}
                </Badge>
                {(flight.missionStatus ?? flight.status) === "DROP_REPORTED" && (
                  <Link
                    to="/admin/drone-incidents"
                    className="ml-1.5 text-[10px] font-medium text-rose-700 underline-offset-2 hover:underline"
                  >
                    {t("admin.drones.detail.flightTable.viewIncident")}
                  </Link>
                )}
              </TableCell>
              <TableCell>
                {flight.assignedByName ??
                  (flight.assignedByUserId
                    ? `#${flight.assignedByUserId}`
                    : t("common.system"))}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                {flight.missionCreatedAt || flight.createdAt
                  ? formatDateTime(flight.missionCreatedAt ?? flight.createdAt!)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ReportTable({
  reports,
  userNames,
}: {
  reports: ReturnType<typeof useGetAllAdminReportsQuery>["data"] extends {
    data: infer T;
  }
    ? T
    : never;
  userNames: Map<number, string>;
}) {
  const { t } = useTranslation();
  const rows = reports as NonNullable<
    ReturnType<typeof useGetAllAdminReportsQuery>["data"]
  >["data"];
  return (
    <div className="overflow-hidden rounded-lg border border-border/80">
      <Table className="text-xs">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[110px] font-semibold">{t("admin.drones.detail.reportTable.code")}</TableHead>
            <TableHead className="w-[120px] font-semibold">{t("admin.drones.detail.reportTable.category")}</TableHead>
            <TableHead className="w-[130px] font-semibold">
              {t("common.status")}
            </TableHead>
            <TableHead className="w-[180px] font-semibold">{t("admin.drones.detail.reportTable.technician")}</TableHead>
            <TableHead className="font-semibold">{t("admin.drones.detail.reportTable.description")}</TableHead>
            <TableHead className="w-[160px] font-semibold">{t("common.time")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((report) => (
            <TableRow key={report.id} className="hover:bg-muted/30">
              <TableCell className="font-bold text-primary">
                RPT-{report.id}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">
                  DRONE
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  className={`text-[10px] ${report.status === "RESOLVED" ? "bg-emerald-100 text-emerald-800" : report.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}
                >
                  {reportStatusLabel(report.status, t)}
                </Badge>
              </TableCell>
              <TableCell>
                {report.assignedToUserId != null
                  ? (userNames.get(report.assignedToUserId) ??
                    t("admin.drones.detail.tech.fallbackName", { id: report.assignedToUserId }))
                  : t("common.unassigned")}
              </TableCell>
              <TableCell
                className="max-w-[500px] truncate"
                title={report.description}
              >
                {report.description || report.title}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                {formatDateTime(report.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OperationLogTable({
  logs,
  userNames,
}: {
  logs: NonNullable<
    ReturnType<typeof useGetDroneOperationLogsQuery>["data"]
  >["data"];
  userNames: Map<number, string>;
}) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-lg border border-border/80">
      <Table className="text-xs">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[170px] font-semibold">{t("common.time")}</TableHead>
            <TableHead className="w-[200px] font-semibold">
              {t("admin.drones.detail.operationTable.actor")}
            </TableHead>
            <TableHead className="font-semibold">{t("admin.drones.detail.operationTable.content")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="hover:bg-muted/30">
              <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                {formatDateTime(log.createdAt)}
              </TableCell>
              <TableCell>
                {log.actorUserId != null
                  ? (userNames.get(log.actorUserId) ?? `#${log.actorUserId}`)
                  : t("common.system")}
              </TableCell>
              <TableCell className="whitespace-pre-wrap">{log.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LoadingRows() {
  const { t } = useTranslation();
  return (
    <div className="py-12 text-center text-xs text-muted-foreground">
      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />
      {t("admin.drones.detail.loadingData")}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-lg border border-dashed py-12 text-center text-xs text-muted-foreground">
      <div className="mx-auto mb-2 flex justify-center opacity-60">{icon}</div>
      {text}
    </div>
  );
}
