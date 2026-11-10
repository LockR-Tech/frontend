import { useState, useMemo } from "react";
import { AppLoading } from "~/components/ui/app-loading";
import {
  History,
  Cpu,
  Compass,
  Package,
  Camera,
  BatteryCharging,
  RadioTower,
  Unplug,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Scan,
  Zap,
  Clock,
  Wrench,
  User,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
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
import {
  useGetDroneIotLogsQuery,
  useGetDroneDeviceQuery,
  type DroneIotLogResponse,
  type DroneDeviceResponse,
} from "~/stores/apis/admin/drones";

interface DroneIotLogsPanelProps {
  droneId: number;
  droneCode: string;
  embedded?: boolean;
  device?: DroneDeviceResponse | null;
}

// Cấu hình nhãn và icon cho các thành phần phần cứng IoT của Drone (labelKey là khoá i18n, dịch lúc render)
const COMPONENT_CONFIG: Record<
  string,
  { labelKey: string; icon: React.ElementType; cls: string }
> = {
  PI_CONTROLLER: {
    labelKey: "admin.drones.hardware.iot.component.piController",
    icon: Cpu,
    cls: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
  },
  PIXHAWK: {
    labelKey: "admin.drones.hardware.iot.component.pixhawk",
    icon: Compass,
    cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800",
  },
  CARGO_HOOK: {
    labelKey: "admin.drones.hardware.iot.component.cargoHook",
    icon: Package,
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  },
  VISION_CAMERA: {
    labelKey: "admin.drones.hardware.iot.component.visionCamera",
    icon: Camera,
    cls: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800",
  },
  BATTERY_POWER: {
    labelKey: "admin.drones.hardware.iot.component.batteryPower",
    icon: BatteryCharging,
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
  },
  TELEMETRY: {
    labelKey: "admin.drones.hardware.iot.component.telemetry",
    icon: RadioTower,
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
  },
};

// Cấu hình nhãn cho loại sự kiện (labelKey là khoá i18n)
const EVENT_TYPE_LABELS: Record<string, { labelKey: string; icon: React.ElementType }> = {
  POWER_CONNECTED: { labelKey: "admin.drones.hardware.iot.event.powerConnected", icon: Zap },
  POWER_DISCONNECTED: { labelKey: "admin.drones.hardware.iot.event.powerDisconnected", icon: Unplug },
  TELEMETRY_ONLINE: { labelKey: "admin.drones.hardware.iot.event.telemetryOnline", icon: RadioTower },
  TELEMETRY_LOST: { labelKey: "admin.drones.hardware.iot.event.telemetryLost", icon: Unplug },
  PIXHAWK_CONNECTED: { labelKey: "admin.drones.hardware.iot.event.pixhawkConnected", icon: Compass },
  PIXHAWK_DISCONNECTED: { labelKey: "admin.drones.hardware.iot.event.pixhawkDisconnected", icon: AlertTriangle },
  DETECT_TARGET: { labelKey: "admin.drones.hardware.iot.event.detectTarget", icon: Scan },
  MARKER_MISMATCH: { labelKey: "admin.drones.hardware.iot.event.markerMismatch", icon: AlertTriangle },
  HOOK_ATTACH: { labelKey: "admin.drones.hardware.iot.event.hookAttach", icon: Package },
  HOOK_RELEASE: { labelKey: "admin.drones.hardware.iot.event.hookRelease", icon: Package },
  HOOK_JAMMED: { labelKey: "admin.drones.hardware.iot.event.hookJammed", icon: AlertTriangle },
  MANUAL_OVERRIDE: { labelKey: "admin.drones.hardware.iot.event.manualOverride", icon: Wrench },
  ARMED: { labelKey: "admin.drones.hardware.iot.event.armed", icon: Zap },
  DISARMED: { labelKey: "admin.drones.hardware.iot.event.disarmed", icon: CheckCircle2 },
  FLIGHT_MODE_CHANGED: { labelKey: "admin.drones.hardware.iot.event.flightModeChanged", icon: Compass },
  FAILSAFE_TRIGGERED: { labelKey: "admin.drones.hardware.iot.event.failsafeTriggered", icon: AlertTriangle },
  // Gán / gỡ bộ điều khiển Pi (locker-service ghi khi admin gắn thiết bị).
  HARDWARE_ATTACH: { labelKey: "admin.drones.hardware.iot.event.hardwareAttach", icon: Cpu },
  HARDWARE_DETACH: { labelKey: "admin.drones.hardware.iot.event.hardwareDetach", icon: Unplug },
  HARDWARE_FAULT: { labelKey: "admin.drones.hardware.iot.event.hardwareFault", icon: AlertTriangle },
  // Dữ liệu cũ: bản Pi trước ghi "ARUCO_DETECTED" thay cho DETECT_TARGET.
  ARUCO_DETECTED: { labelKey: "admin.drones.hardware.iot.event.detectTarget", icon: Scan },
};

function humanizeCode(code: string | null | undefined) {
  if (!code) return "—";
  const words = code.toLowerCase().split("_").filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/// Người thao tác: "USER#20" (locker-service) ⇒ "Người dùng #20"; tên service backend ⇒ "Máy chủ".
function actorText(actorId: string | null | undefined, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (!actorId) return null;
  const user = /^USER#(\d+)$/.exec(actorId);
  if (user) return t("admin.drones.hardware.iot.actor.userId", { id: user[1] });
  if (actorId === "SYSTEM" || /Service$/.test(actorId)) return t("admin.drones.hardware.iot.actor.server");
  return actorId;
}

// Cấu hình nhãn kết quả (labelKey là khoá i18n)
const RESULT_CONFIG: Record<string, { labelKey: string; cls: string; icon: React.ElementType }> = {
  ONLINE: {
    labelKey: "admin.drones.hardware.online",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/50",
    icon: RadioTower,
  },
  OFFLINE: {
    labelKey: "common.disconnected",
    cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/50",
    icon: Unplug,
  },
  CONNECTED: {
    labelKey: "admin.drones.hardware.iot.result.connected",
    cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-400/50",
    icon: CheckCircle2,
  },
  DISCONNECTED: {
    labelKey: "admin.drones.hardware.iot.result.mavlinkLost",
    cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/50",
    icon: Unplug,
  },
  SUCCESS: {
    labelKey: "common.success",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  FAILED: {
    labelKey: "common.failed",
    cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800",
    icon: XCircle,
  },
  RELEASED: {
    labelKey: "admin.drones.hardware.iot.result.released",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/50",
    icon: CheckCircle2,
  },
  LOCKED: {
    labelKey: "admin.drones.hardware.iot.result.locked",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/50",
    icon: Package,
  },
  DETECTED: {
    labelKey: "admin.drones.hardware.iot.result.detected",
    cls: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-400/50",
    icon: Scan,
  },
  JAMMED: {
    labelKey: "admin.drones.hardware.iot.result.jammed",
    cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/50",
    icon: AlertTriangle,
  },
  TIMEOUT: {
    labelKey: "admin.drones.hardware.iot.result.timeout",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300",
    icon: Clock,
  },
  WARNING: {
    labelKey: "admin.drones.hardware.iot.result.warning",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/50",
    icon: AlertTriangle,
  },
};

export function DroneIotLogsPanel({
  droneId,
  droneCode,
  embedded = false,
  device: propDevice,
}: DroneIotLogsPanelProps) {
  const { t } = useTranslation();

  // Queries
  const { data: logsData, isLoading, isFetching, refetch } = useGetDroneIotLogsQuery(droneId, {
    pollingInterval: 8000,
  });
  const { data: deviceData } = useGetDroneDeviceQuery(droneId, {
    pollingInterval: 5000,
    skip: propDevice !== undefined,
  });
  const device = propDevice !== undefined ? propDevice : (deviceData?.data ?? null);

  // Filters
  const [selectedComponent, setSelectedComponent] = useState<string>("ALL");
  const [selectedEventType, setSelectedEventType] = useState<string>("ALL");
  const [selectedResult, setSelectedResult] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Danh sách logs từ server (dữ liệu thật từ cơ sở dữ liệu)
  const allLogs: DroneIotLogResponse[] = useMemo(() => {
    const serverLogs = logsData?.data ?? [];
    return [...serverLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [logsData]);

  // Bộ lọc danh sách logs
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (selectedComponent !== "ALL" && log.component !== selectedComponent) {
        return false;
      }
      if (selectedEventType !== "ALL" && log.eventType !== selectedEventType) {
        return false;
      }
      if (selectedResult !== "ALL" && log.result?.toUpperCase() !== selectedResult) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msgMatch = log.message?.toLowerCase().includes(q);
        const orderMatch = log.orderId != null && String(log.orderId).includes(q);
        const actorMatch = log.actorId?.toLowerCase().includes(q);
        const compMatch = log.component?.toLowerCase().includes(q);
        if (!msgMatch && !orderMatch && !actorMatch && !compMatch) {
          return false;
        }
      }
      return true;
    });
  }, [allLogs, selectedComponent, selectedEventType, selectedResult, searchQuery]);



  const bodyContent = (
    <div className="space-y-4">
      {/* Banner trạng thái kết nối phần cứng Drone thời gian thực (chỉ hiển thị khi đã gán bộ điều khiển Pi) */}
      {device && (
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors shadow-2xs ${
            device.online
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200"
              : "border-rose-500/30 bg-rose-500/5 text-rose-950 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {device.online ? (
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
              </span>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">
                  {device.online
                    ? t("admin.drones.hardware.iot.banner.online", { code: droneCode })
                    : t("admin.drones.hardware.iot.banner.offline", { code: droneCode })}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold py-0 px-2 ${
                    device.online
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                      : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400"
                  }`}
                >
                  {device.online
                    ? t("admin.drones.hardware.iot.banner.onlineBadge")
                    : t("admin.drones.hardware.iot.banner.offlineBadge")}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {device.online
                  ? t("admin.drones.hardware.iot.banner.onlineDetail", {
                      ip: device.ipAddress || "—",
                      mavlink:
                        device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED"
                          ? "MAVLink OK"
                          : device.mavlinkStatus || t("admin.drones.hardware.notConnected"),
                      time: device.lastSeenAt
                        ? formatDateTime(device.lastSeenAt)
                        : t("admin.maintenance.relativeTime.justNow"),
                    })
                  : t("admin.drones.hardware.iot.banner.lastSeen", {
                      time: device.lastSeenAt
                        ? formatDateTime(device.lastSeenAt)
                        : t("admin.drones.hardware.iot.banner.noRecentSignal"),
                    })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-md border text-[11px]">
              <Compass className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-muted-foreground">Autopilot:</span>
              <span className="font-semibold">
                {device.online
                  ? device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED"
                    ? "Pixhawk OK"
                    : device.mavlinkStatus || t("admin.drones.hardware.notConnected")
                  : t("admin.drones.hardware.offline")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Thanh công cụ tìm kiếm và bộ lọc */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("admin.drones.hardware.iot.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Lọc theo Bộ phận phần cứng */}
        <Select value={selectedComponent} onValueChange={setSelectedComponent}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder={t("admin.drones.hardware.iot.filter.componentPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("admin.drones.hardware.iot.filter.allComponents")}</SelectItem>
            <SelectItem value="PI_CONTROLLER">{t("admin.drones.hardware.iot.filter.piController")}</SelectItem>
            <SelectItem value="PIXHAWK">{t("admin.drones.hardware.iot.filter.pixhawk")}</SelectItem>
            <SelectItem value="CARGO_HOOK">{t("admin.drones.hardware.iot.filter.cargoHook")}</SelectItem>
            <SelectItem value="VISION_CAMERA">{t("admin.drones.hardware.iot.component.visionCamera")}</SelectItem>
            <SelectItem value="BATTERY_POWER">{t("admin.drones.hardware.iot.component.batteryPower")}</SelectItem>
            <SelectItem value="TELEMETRY">{t("admin.drones.hardware.iot.component.telemetry")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Lọc theo Loại sự kiện */}
        <Select value={selectedEventType} onValueChange={setSelectedEventType}>
          <SelectTrigger className="w-[190px] h-8 text-xs">
            <SelectValue placeholder={t("admin.lockers.logs.filter.eventType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("admin.drones.hardware.iot.filter.allEvents")}</SelectItem>
            <SelectItem value="POWER_CONNECTED">{t("admin.drones.hardware.iot.event.powerConnected")}</SelectItem>
            <SelectItem value="POWER_DISCONNECTED">{t("admin.drones.hardware.iot.event.powerDisconnected")}</SelectItem>
            <SelectItem value="PIXHAWK_CONNECTED">{t("admin.drones.hardware.iot.event.pixhawkConnected")}</SelectItem>
            <SelectItem value="PIXHAWK_DISCONNECTED">{t("admin.drones.hardware.iot.event.pixhawkDisconnected")}</SelectItem>
            <SelectItem value="DETECT_TARGET">{t("admin.drones.hardware.iot.event.detectTarget")}</SelectItem>
            <SelectItem value="HOOK_RELEASE">{t("admin.drones.hardware.iot.event.hookRelease")}</SelectItem>
            <SelectItem value="HOOK_ATTACH">{t("admin.drones.hardware.iot.event.hookAttach")}</SelectItem>
            <SelectItem value="HOOK_JAMMED">{t("admin.drones.hardware.iot.event.hookJammed")}</SelectItem>
            <SelectItem value="MANUAL_OVERRIDE">{t("admin.drones.hardware.iot.event.manualOverride")}</SelectItem>
            <SelectItem value="ARMED">{t("admin.drones.hardware.iot.filter.armed")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Lọc theo Kết quả */}
        <Select value={selectedResult} onValueChange={setSelectedResult}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder={t("admin.lockers.logs.filter.result")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("admin.lockers.logs.filter.allResults")}</SelectItem>
            <SelectItem value="ONLINE">{t("admin.drones.hardware.iot.filter.online")}</SelectItem>
            <SelectItem value="OFFLINE">{t("admin.drones.hardware.iot.filter.offline")}</SelectItem>
            <SelectItem value="CONNECTED">{t("admin.drones.hardware.iot.result.connected")}</SelectItem>
            <SelectItem value="DISCONNECTED">{t("admin.drones.hardware.iot.result.mavlinkLost")}</SelectItem>
            <SelectItem value="RELEASED">{t("admin.drones.hardware.iot.result.released")}</SelectItem>
            <SelectItem value="LOCKED">{t("admin.drones.hardware.iot.result.locked")}</SelectItem>
            <SelectItem value="DETECTED">{t("admin.drones.hardware.iot.result.detected")}</SelectItem>
            <SelectItem value="JAMMED">{t("admin.drones.hardware.iot.result.jammed")}</SelectItem>
            <SelectItem value="SUCCESS">{t("common.success")}</SelectItem>
            <SelectItem value="FAILED">{t("common.failed")}</SelectItem>
          </SelectContent>
        </Select>

        {(selectedComponent !== "ALL" || selectedEventType !== "ALL" || selectedResult !== "ALL" || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedComponent("ALL");
              setSelectedEventType("ALL");
              setSelectedResult("ALL");
              setSearchQuery("");
            }}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {t("admin.drones.hardware.iot.filter.reset")}
          </Button>
        )}
      </div>

      {/* Bảng dữ liệu nhật ký IoT Drone: Bỏ cột vị trí và payload; Chi tiết thông điệp hiển thị đầy đủ nhiều dòng */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          <AppLoading size={72} message={t("admin.drones.hardware.iot.loading")} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {allLogs.length === 0
            ? t("admin.drones.hardware.iot.empty")
            : t("admin.drones.hardware.iot.emptyFiltered")}
        </div>
      ) : (
        <div className="rounded-lg border border-border/80 overflow-hidden shadow-2xs">
          <div className="max-h-[520px] overflow-y-auto">
            <Table className="text-xs">
              <TableHeader className="bg-muted/40 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[145px] font-semibold">{t("common.time")}</TableHead>
                  <TableHead className="w-[160px] font-semibold">{t("admin.drones.hardware.iot.col.component")}</TableHead>
                  <TableHead className="w-[190px] font-semibold">{t("admin.lockers.logs.filter.eventType")}</TableHead>
                  <TableHead className="w-[130px] font-semibold">{t("admin.lockers.logs.filter.result")}</TableHead>
                  <TableHead className="w-[140px] font-semibold">{t("admin.lockers.logs.col.actor")}</TableHead>
                  <TableHead className="font-semibold">{t("admin.drones.hardware.iot.col.message")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const compCfg = COMPONENT_CONFIG[log.component];
                  const comp = compCfg
                    ? { label: t(compCfg.labelKey), icon: compCfg.icon, cls: compCfg.cls }
                    : {
                        label: log.component,
                        icon: Cpu,
                        cls: "bg-secondary text-foreground border-border",
                      };
                  const CompIcon = comp.icon;

                  const evtCfg = EVENT_TYPE_LABELS[log.eventType];
                  const evt = evtCfg
                    ? { label: t(evtCfg.labelKey), icon: evtCfg.icon }
                    : {
                        // Mã mới chưa có nhãn: đọc được thay vì hiện mã thô (vd. "LID_TEST_HOLD" ⇒ "Lid test hold").
                        label: humanizeCode(log.eventType),
                        icon: History,
                      };
                  const EvtIcon = evt.icon;

                  const resCfg = RESULT_CONFIG[log.result?.toUpperCase()];
                  const res = resCfg
                    ? { label: t(resCfg.labelKey), cls: resCfg.cls, icon: resCfg.icon }
                    : {
                        label: log.result,
                        cls: "bg-secondary text-foreground border-border",
                        icon: CheckCircle2,
                      };
                  const ResIcon = res.icon;

                  const isOffline = log.result?.toUpperCase() === "OFFLINE" || log.result?.toUpperCase() === "DISCONNECTED";
                  const isJammed = log.result?.toUpperCase() === "JAMMED" || log.result?.toUpperCase() === "FAILED";
                  const isHookRelease = log.eventType === "HOOK_RELEASE";
                  const isTargetDetect = log.eventType === "DETECT_TARGET";

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30 align-top">
                      {/* Thời gian */}
                      <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap pt-3">
                        {formatDateTime(log.createdAt)}
                      </TableCell>

                      {/* Bộ phận thiết bị */}
                      <TableCell className="pt-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap ${comp.cls}`}
                        >
                          <CompIcon className="w-3.5 h-3.5 shrink-0" />
                          {comp.label}
                        </span>
                      </TableCell>

                      {/* Loại sự kiện */}
                      <TableCell className="pt-3">
                        <div className="flex items-center gap-1.5 font-medium text-[11px]">
                          <EvtIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{evt.label}</span>
                        </div>
                      </TableCell>

                      {/* Kết quả */}
                      <TableCell className="pt-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${res.cls}`}
                        >
                          <ResIcon className="w-3 h-3 shrink-0" />
                          {res.label}
                        </span>
                      </TableCell>

                      {/* Tác nhân / Đối tượng */}
                      <TableCell className="pt-3">
                        {log.orderId ? (
                          <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-primary">
                            <ShoppingBag className="w-3 h-3 shrink-0" />
                            <span>{t("admin.lockers.logs.orderRef", { id: log.orderId })}</span>
                          </div>
                        ) : log.actorType === "TECHNICIAN" ? (
                          <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            <Wrench className="w-3 h-3 shrink-0" />
                            <span>{actorText(log.actorId, t) || t("admin.drones.hardware.iot.actor.technician")}</span>
                          </div>
                        ) : log.actorType === "USER" ? (
                          <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <User className="w-3 h-3 shrink-0" />
                            <span>{actorText(log.actorId, t) || t("admin.drones.hardware.iot.actor.user")}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {actorText(log.actorId, t) || t("admin.drones.hardware.iot.actor.piSystem")}
                          </span>
                        )}
                      </TableCell>

                      {/* Chi tiết thông điệp IoT: Ghi ra hết toàn bộ, hỗ trợ xuống dòng tự nhiên, không cắt ngắn */}
                      <TableCell className="pt-3 pb-3">
                        <div
                          className={`whitespace-pre-line leading-relaxed text-xs break-words ${
                            isOffline
                              ? "text-rose-700 dark:text-rose-400 font-medium"
                              : isJammed
                              ? "text-rose-700 dark:text-rose-400 font-medium"
                              : isHookRelease
                              ? "text-emerald-800 dark:text-emerald-300 font-medium"
                              : isTargetDetect
                              ? "text-teal-800 dark:text-teal-300 font-medium"
                              : "text-foreground"
                          }`}
                        >
                          {log.message}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {embedded ? (
        bodyContent
      ) : (
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="w-4.5 h-4.5 text-primary" />
                  {t("admin.drones.hardware.iot.title", { code: droneCode })}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t("admin.drones.hardware.iot.description")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    refetch();
                    toast.success(t("admin.drones.hardware.iot.refreshed"));
                  }}
                  disabled={isFetching}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                  {t("button.refresh")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">{bodyContent}</CardContent>
        </Card>
      )}
    </>
  );
}
