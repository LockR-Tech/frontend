import { useMemo, useState } from "react";
import {
  Cpu,
  RadioTower,
  Camera,
  Compass,
  BatteryCharging,
  Unplug,
  RefreshCw,
  Maximize2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { formatDateTime } from "~/lib/datetime";
import {
  type DroneDeviceResponse,
  useGetDroneDeviceQuery,
  useGetDroneDevicesQuery,
  useAssignDroneDeviceMutation,
  useUnassignDroneDeviceMutation,
} from "~/stores/apis/admin/drones";

interface DroneHardwarePanelProps {
  droneId: number;
  droneCode: string;
}

export function DroneHardwarePanel({ droneId, droneCode }: DroneHardwarePanelProps) {
  const { t } = useTranslation();
  
  // Polling mỗi 3 giây để cập nhật trạng thái Pi, Pixhawk và telemetry gần như tức thì
  const { data: deviceData, isLoading, refetch, isFetching } = useGetDroneDeviceQuery(droneId, {
    pollingInterval: 3000,
  });
  const { data: allDevicesData, refetch: refetchAll } = useGetDroneDevicesQuery(undefined, {
    pollingInterval: 5000,
  });

  const device = deviceData?.data ?? null;
  const allDevices = useMemo(() => allDevicesData?.data ?? [], [allDevicesData]);
  // Danh sách các Pi chưa gán vào drone nào
  const unassignedDevices = useMemo(
    () => allDevices.filter((d) => d.droneId == null),
    [allDevices]
  );

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraReloadKey, setCameraReloadKey] = useState<number>(Date.now());
  const [cameraFullscreen, setCameraFullscreen] = useState(false);

  const [assignDevice, { isLoading: assigning }] = useAssignDroneDeviceMutation();
  const [unassignDevice, { isLoading: unassigning }] = useUnassignDroneDeviceMutation();

  const handleAssign = async () => {
    if (!selectedDeviceId) return;
    try {
      await assignDevice({ deviceId: Number(selectedDeviceId), droneId }).unwrap();
      toast.success("Gán bộ điều khiển thành công vào drone " + droneCode);
      setAssignModalOpen(false);
      setSelectedDeviceId("");
      refetch();
      refetchAll();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Không thể gán bộ điều khiển");
    }
  };

  const handleUnassign = async () => {
    if (!device) return;
    try {
      await unassignDevice(device.id).unwrap();
      toast.success("Đã gỡ bộ điều khiển khỏi drone " + droneCode);
      refetch();
      refetchAll();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Không thể gỡ bộ điều khiển");
    }
  };

  const streamUrl = useMemo(() => {
    if (!device) return null;
    if (device.cameraStreamUrl) {
      return device.cameraStreamUrl;
    }
    if (device.ipAddress) {
      return `http://${device.ipAddress}:8080/stream.mjpg`;
    }
    return null;
  }, [device]);

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-5 w-5 text-primary" />
              Bộ điều khiển & Thiết bị phần cứng của Drone ({droneCode})
            </CardTitle>
            <CardDescription className="text-xs">
              Theo dõi máy tính nhúng Raspberry Pi, mạch điều khiển bay Pixhawk và luồng camera trực tiếp của riêng drone này.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                refetch();
                setCameraReloadKey(Date.now());
              }}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            {device ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                onClick={handleUnassign}
                disabled={unassigning}
              >
                {unassigning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Unplug className="mr-1.5 h-3.5 w-3.5" />}
                Gỡ bộ điều khiển
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAssignModalOpen(true)}
              >
                <RadioTower className="mr-1.5 h-3.5 w-3.5" />
                Gán bộ điều khiển Pi
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {device ? (
          <>
            {/* Hàng 1: Chi tiết 3 cụm thiết bị */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Raspberry Pi Companion */}
              <div className="rounded-xl border bg-card p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <Cpu className="h-4 w-4 text-purple-600" />
                    Raspberry Pi (Companion)
                  </div>
                  {device.online ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/50 text-[10px] py-0 px-2">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Trực tuyến
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/50 text-[10px] py-0 px-2">
                      <Unplug className="mr-1 h-3 w-3" />
                      Mất kết nối
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Địa chỉ MAC:</span>
                    <span className="font-mono font-medium">{device.macAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Địa chỉ IP:</span>
                    <span className="font-mono">{device.ipAddress || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Firmware:</span>
                    <span>{device.firmwareVersion || "v1.0.0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thấy lần cuối:</span>
                    <span>{device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "—"}</span>
                  </div>
                </div>
              </div>

              {/* 2. Pixhawk Autopilot */}
              <div className="rounded-xl border bg-card p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <Compass className="h-4 w-4 text-sky-600" />
                    Pixhawk (Autopilot)
                  </div>
                  {device.mavlinkStatus === "connected" ? (
                    <Badge variant="outline" className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-400/50 text-[10px] py-0 px-2">
                      MAVLink OK
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/50 text-[10px] py-0 px-2">
                      {device.mavlinkStatus || "Mất tín hiệu"}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chế độ bay:</span>
                    <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 font-bold">
                      {device.flightMode || "UNKNOWN"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Động cơ:</span>
                    <span className={`font-semibold ${device.armed ? "text-rose-600" : "text-emerald-600"}`}>
                      {device.armed ? "ARMED (Đang quay)" : "DISARMED (An toàn)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <span>{device.landedState === "IN_AIR" ? "Đang bay trên không" : "Đậu trên mặt đất"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Định vị GPS:</span>
                    <span>
                      {device.gpsFixType && device.gpsFixType >= 3 ? "3D Fix" : "Chưa khóa GPS"}{" "}
                      · {device.gpsSatellites || 0} vệ tinh
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Nguồn & Pin */}
              <div className="rounded-xl border bg-card p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <BatteryCharging className="h-4 w-4 text-emerald-600" />
                    Nguồn & Năng lượng
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-400/50 text-[10px] py-0 px-2">
                    {device.batteryPercent ?? 100}%
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Điện áp tổng:</span>
                    <span className="font-semibold">{device.voltageV ? `${device.voltageV} V` : "16.4 V"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dòng xả hiện tại:</span>
                    <span>{device.currentA ? `${device.currentA} A` : "0.8 A"}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${(device.batteryPercent ?? 100) < 20 ? "bg-rose-500" : (device.batteryPercent ?? 100) < 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.max(3, Math.min(100, device.batteryPercent ?? 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Hàng 2: Camera Stream riêng biệt của Drone */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between border-b bg-muted/40 px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <Camera className="h-4 w-4 text-primary" />
                  <span>Camera Trực tiếp từ Drone ({droneCode})</span>
                  {device.online && streamUrl && (
                    <Badge variant="destructive" className="animate-pulse text-[10px] py-0 px-1.5">
                      ● LIVE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {streamUrl && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Tải lại stream"
                        onClick={() => setCameraReloadKey(Date.now())}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Mở tab mới"
                        onClick={() => window.open(streamUrl, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Phóng to"
                        onClick={() => setCameraFullscreen(!cameraFullscreen)}
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className={`relative bg-black flex items-center justify-center overflow-hidden transition-all ${cameraFullscreen ? "h-[500px]" : "h-72"}`}>
                {device.online && streamUrl ? (
                  <img
                    key={cameraReloadKey}
                    src={streamUrl}
                    alt={`Live stream from ${droneCode}`}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                    <Camera className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-slate-300">
                      Camera của drone {droneCode} chưa phát luồng trực tiếp
                    </p>
                    <p className="text-xs text-slate-400 max-w-md">
                      {device.online
                        ? "Raspberry Pi đang trực tuyến nhưng dịch vụ camera (cổng 8080) chưa được bật."
                        : "Bộ điều khiển Raspberry Pi hiện đang mất kết nối. Luồng video sẽ tự động phát khi Pi trực tuyến."}
                    </p>
                    {streamUrl && (
                      <p className="text-[11px] font-mono text-slate-500">
                        URL dự kiến: {streamUrl}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Trạng thái chưa gán bộ điều khiển */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <Cpu className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Chưa gán bộ điều khiển Raspberry Pi cho drone {droneCode}</p>
              <p className="text-xs text-muted-foreground max-w-md">
                Gán một máy tính nhúng Pi đang chạy để truyền dữ liệu Pixhawk MAVLink, trạng thái pin và phát luồng camera của drone này.
              </p>
            </div>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => setAssignModalOpen(true)}
            >
              <RadioTower className="mr-1.5 h-4 w-4" />
              Chọn & Gán bộ điều khiển
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modal gán bộ điều khiển */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gán bộ điều khiển Pi vào {droneCode}</DialogTitle>
            <DialogDescription className="text-xs">
              Chọn máy tính nhúng Raspberry Pi đã gửi bản tin phát hiện lên hệ thống để liên kết với drone này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-foreground">Bộ điều khiển khả dụng:</label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Chọn Raspberry Pi..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedDevices.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Không có bộ điều khiển nào đang chờ gán
                    </SelectItem>
                  ) : (
                    unassignedDevices.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.macAddress} {d.online ? "· Trực tuyến" : "· Ngoại tuyến"} {d.ipAddress ? `(${d.ipAddress})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {unassignedDevices.length === 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200">
                Chưa phát hiện con Pi mới nào. Hãy khởi chạy code <code>main.py</code> trên Pi của bạn để thiết bị tự động xuất hiện ở đây.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={assigning || !selectedDeviceId || selectedDeviceId === "none"}
            >
              {assigning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Xác nhận gán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

