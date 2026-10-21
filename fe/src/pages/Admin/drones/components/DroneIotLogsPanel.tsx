import { useState, useMemo } from "react";
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

// Cấu hình nhãn và icon cho các thành phần phần cứng IoT của Drone
const COMPONENT_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; cls: string }
> = {
  PI_CONTROLLER: {
    label: "Pi Controller",
    icon: Cpu,
    cls: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
  },
  PIXHAWK: {
    label: "Pixhawk Autopilot",
    icon: Compass,
    cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800",
  },
  CARGO_HOOK: {
    label: "Móc treo hàng",
    icon: Package,
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  },
  VISION_CAMERA: {
    label: "Camera AI thị giác",
    icon: Camera,
    cls: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800",
  },
  BATTERY_POWER: {
    label: "Nguồn & Pin",
    icon: BatteryCharging,
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
  },
  TELEMETRY: {
    label: "Viễn thông Telemetry",
    icon: RadioTower,
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
  },
};

// Cấu hình nhãn cho loại sự kiện
const EVENT_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  POWER_CONNECTED: { label: "Cắm nguồn trực tuyến", icon: Zap },
  POWER_DISCONNECTED: { label: "Rút nguồn / Ngắt điện", icon: Unplug },
  TELEMETRY_ONLINE: { label: "Telemetry kết nối", icon: RadioTower },
  TELEMETRY_LOST: { label: "Mất tín hiệu Telemetry", icon: Unplug },
  PIXHAWK_CONNECTED: { label: "Pi kết nối Pixhawk", icon: Compass },
  PIXHAWK_DISCONNECTED: { label: "Pi mất kết nối Pixhawk", icon: AlertTriangle },
  DETECT_TARGET: { label: "Detect mã ô/tủ", icon: Scan },
  MARKER_MISMATCH: { label: "Mã ô không khớp", icon: AlertTriangle },
  HOOK_ATTACH: { label: "Móc ngậm hàng", icon: Package },
  HOOK_RELEASE: { label: "Móc thả hàng", icon: Package },
  HOOK_JAMMED: { label: "Kẹt móc treo hàng", icon: AlertTriangle },
  MANUAL_OVERRIDE: { label: "Can thiệp thủ công (User/KTV)", icon: Wrench },
  ARMED: { label: "Khởi động động cơ (ARMED)", icon: Zap },
  DISARMED: { label: "Khóa an toàn (DISARMED)", icon: CheckCircle2 },
  FLIGHT_MODE_CHANGED: { label: "Đổi chế độ bay", icon: Compass },
  FAILSAFE_TRIGGERED: { label: "Kích hoạt Failsafe", icon: AlertTriangle },
};

// Cấu hình nhãn kết quả
const RESULT_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  ONLINE: {
    label: "Trực tuyến",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/50",
    icon: RadioTower,
  },
  OFFLINE: {
    label: "Mất kết nối",
    cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/50",
    icon: Unplug,
  },
  CONNECTED: {
    label: "Đã kết nối",
    cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-400/50",
    icon: CheckCircle2,
  },
  DISCONNECTED: {
    label: "Mất MAVLink",
    cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/50",
    icon: Unplug,
  },
  SUCCESS: {
    label: "Thành công",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Thất bại",
    cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800",
    icon: XCircle,
  },
  RELEASED: {
    label: "Đã thả hàng",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/50",
    icon: CheckCircle2,
  },
  LOCKED: {
    label: "Đã khóa chốt",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/50",
    icon: Package,
  },
  DETECTED: {
    label: "Đã nhận diện",
    cls: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-400/50",
    icon: Scan,
  },
  JAMMED: {
    label: "Bị kẹt cơ khí",
    cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/50",
    icon: AlertTriangle,
  },
  TIMEOUT: {
    label: "Hết thời gian",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300",
    icon: Clock,
  },
  WARNING: {
    label: "Cảnh báo",
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
                    ? `Drone ${droneCode} đang trực tuyến (Cắm nguồn & Kết nối)`
                    : `Drone ${droneCode} đang ngoại tuyến (Rút nguồn hoặc Mất mạng)`}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold py-0 px-2 ${
                    device.online
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                      : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400"
                  }`}
                >
                  {device.online ? "TRỰC TUYẾN" : "NGOẠI TUYẾN"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {device.online
                  ? `Pi Controller: ${device.ipAddress || "—"} · MAVLink Pixhawk: ${
                      device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED"
                        ? "MAVLink OK"
                        : device.mavlinkStatus || "Chưa kết nối"
                    } · Cập nhật: ${device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "Vừa xong"}`
                  : `Lần cuối kết nối: ${device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "Chưa có tín hiệu gần đây"}`}
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
                    : device.mavlinkStatus || "Chưa kết nối"
                  : "Ngoại tuyến"}
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
            placeholder="Tìm theo nội dung, đơn hàng #, KTV, lỗi, IP, MAC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Lọc theo Bộ phận phần cứng */}
        <Select value={selectedComponent} onValueChange={setSelectedComponent}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Bộ phận phần cứng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả bộ phận</SelectItem>
            <SelectItem value="PI_CONTROLLER">Bộ xử lý Pi Controller</SelectItem>
            <SelectItem value="PIXHAWK">Bộ điều khiển Pixhawk</SelectItem>
            <SelectItem value="CARGO_HOOK">Móc treo hàng (Hook)</SelectItem>
            <SelectItem value="VISION_CAMERA">Camera AI thị giác</SelectItem>
            <SelectItem value="BATTERY_POWER">Nguồn & Pin</SelectItem>
            <SelectItem value="TELEMETRY">Viễn thông Telemetry</SelectItem>
          </SelectContent>
        </Select>

        {/* Lọc theo Loại sự kiện */}
        <Select value={selectedEventType} onValueChange={setSelectedEventType}>
          <SelectTrigger className="w-[190px] h-8 text-xs">
            <SelectValue placeholder="Loại sự kiện" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả sự kiện</SelectItem>
            <SelectItem value="POWER_CONNECTED">Cắm nguồn trực tuyến</SelectItem>
            <SelectItem value="POWER_DISCONNECTED">Rút nguồn / Ngắt điện</SelectItem>
            <SelectItem value="PIXHAWK_CONNECTED">Pi kết nối Pixhawk</SelectItem>
            <SelectItem value="PIXHAWK_DISCONNECTED">Pi mất kết nối Pixhawk</SelectItem>
            <SelectItem value="DETECT_TARGET">Detect mã ô/tủ</SelectItem>
            <SelectItem value="HOOK_RELEASE">Móc thả hàng</SelectItem>
            <SelectItem value="HOOK_ATTACH">Móc ngậm hàng</SelectItem>
            <SelectItem value="HOOK_JAMMED">Kẹt móc treo hàng</SelectItem>
            <SelectItem value="MANUAL_OVERRIDE">Can thiệp thủ công (User/KTV)</SelectItem>
            <SelectItem value="ARMED">Khởi động động cơ</SelectItem>
          </SelectContent>
        </Select>

        {/* Lọc theo Kết quả */}
        <Select value={selectedResult} onValueChange={setSelectedResult}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Kết quả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả kết quả</SelectItem>
            <SelectItem value="ONLINE">Trực tuyến (ONLINE)</SelectItem>
            <SelectItem value="OFFLINE">Mất kết nối (OFFLINE)</SelectItem>
            <SelectItem value="CONNECTED">Đã kết nối</SelectItem>
            <SelectItem value="DISCONNECTED">Mất MAVLink</SelectItem>
            <SelectItem value="RELEASED">Đã thả hàng</SelectItem>
            <SelectItem value="LOCKED">Đã khóa chốt</SelectItem>
            <SelectItem value="DETECTED">Đã nhận diện</SelectItem>
            <SelectItem value="JAMMED">Bị kẹt cơ khí</SelectItem>
            <SelectItem value="SUCCESS">Thành công</SelectItem>
            <SelectItem value="FAILED">Thất bại</SelectItem>
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
            Đặt lại lọc
          </Button>
        )}
      </div>

      {/* Bảng dữ liệu nhật ký IoT Drone: Bỏ cột vị trí và payload; Chi tiết thông điệp hiển thị đầy đủ nhiều dòng */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
          Đang tải dữ liệu nhật ký IoT drone...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {allLogs.length === 0
            ? "Chưa có bản ghi nhật ký IoT nào cho Drone này."
            : "Không tìm thấy bản ghi IoT nào phù hợp với bộ lọc."}
        </div>
      ) : (
        <div className="rounded-lg border border-border/80 overflow-hidden shadow-2xs">
          <div className="max-h-[520px] overflow-y-auto">
            <Table className="text-xs">
              <TableHeader className="bg-muted/40 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[145px] font-semibold">Thời gian</TableHead>
                  <TableHead className="w-[160px] font-semibold">Bộ phận thiết bị</TableHead>
                  <TableHead className="w-[190px] font-semibold">Loại sự kiện</TableHead>
                  <TableHead className="w-[130px] font-semibold">Kết quả</TableHead>
                  <TableHead className="w-[140px] font-semibold">Đối tượng</TableHead>
                  <TableHead className="font-semibold">Nội dung thông điệp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const comp = COMPONENT_CONFIG[log.component] ?? {
                    label: log.component,
                    icon: Cpu,
                    cls: "bg-secondary text-foreground border-border",
                  };
                  const CompIcon = comp.icon;

                  const evt = EVENT_TYPE_LABELS[log.eventType] ?? {
                    label: log.eventType,
                    icon: History,
                  };
                  const EvtIcon = evt.icon;

                  const res = RESULT_CONFIG[log.result?.toUpperCase()] ?? {
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
                            <span>Đơn #{log.orderId}</span>
                          </div>
                        ) : log.actorType === "TECHNICIAN" ? (
                          <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            <Wrench className="w-3 h-3 shrink-0" />
                            <span>{log.actorId || "Kỹ thuật viên"}</span>
                          </div>
                        ) : log.actorType === "USER" ? (
                          <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <User className="w-3 h-3 shrink-0" />
                            <span>{log.actorId || "Người dùng"}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {log.actorId || "Hệ thống Pi"}
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
                  Nhật ký IoT Drone {droneCode}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Toàn bộ chuỗi sự kiện phần cứng: Pi Controller, Pixhawk MAVLink, Móc treo thả hàng, Camera ArUco và Pin
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    refetch();
                    toast.success("Đã làm mới nhật ký IoT của drone");
                  }}
                  disabled={isFetching}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                  Làm mới
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
