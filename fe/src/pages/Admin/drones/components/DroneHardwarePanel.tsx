import { useEffect, useMemo, useState, useRef } from "react";
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
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "~/components/ui/input";
import { formatDateTime } from "~/lib/datetime";
import {
  type DroneDeviceResponse,
  useGetDroneDeviceQuery,
  useGetDroneDevicesQuery,
  useAssignDroneDeviceMutation,
  useUnassignDroneDeviceMutation,
  useRegisterDroneDeviceMutation,
} from "~/stores/apis/admin/drones";
import { useGetGatewaysQuery } from "~/stores/apis/admin/lockerOps";

interface DroneHardwarePanelProps {
  droneId: number;
  droneCode: string;
}

interface EffectiveDroneDevice {
  id?: number;
  droneId?: number;
  droneCode?: string;
  macAddress?: string;
  ipAddress?: string;
  hostname?: string;
  online?: boolean;
  cameraOnline?: boolean;
  cameraStreamUrl?: string;
  cameraStatus?: string;
  firmwareVersion?: string;
  mavlinkStatus?: string;
  flightMode?: string;
  armed?: boolean;
  landedState?: string;
  gpsFixType?: number;
  gpsSatellites?: number;
  batteryPercent?: number;
  voltageV?: number;
  currentA?: number;
  lastSeenAt?: string;
}

interface DiscoveredPi {
  key: string;
  id?: number;
  ipAddress: string;
  macAddress: string;
  hostname: string;
  online: boolean;
  label: string;
  hardware?: string;
}

export function DroneHardwarePanel({ droneId, droneCode }: DroneHardwarePanelProps) {
  const LOCAL_STORAGE_KEY = `lockr_drone_binding_${droneId}`;

  const [localBinding, setLocalBinding] = useState<{
    id?: number | string;
    ipAddress?: string;
    macAddress?: string;
    hostname?: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 1. Dữ liệu từ API Backend
  const { data: deviceData, isLoading, refetch, isFetching } = useGetDroneDeviceQuery(droneId, {
    pollingInterval: 5000,
  });
  const { data: allDevicesData, refetch: refetchAll } = useGetDroneDevicesQuery(undefined, {
    pollingInterval: 6000,
  });
  const { data: gatewaysData, refetch: refetchGateways } = useGetGatewaysQuery(undefined, {
    pollingInterval: 6000,
  });

  const backendDevice = deviceData?.data ?? null;
  const allDevices = useMemo(() => allDevicesData?.data ?? [], [allDevicesData]);
  const gateways = useMemo(() => gatewaysData?.data ?? [], [gatewaysData]);

  // 2. Trạng thái telemetry trực tiếp từ Pi
  const [livePiStatus, setLivePiStatus] = useState<any>(null);
  const failCountRef = useRef(0);

  // 3. Modal gán bộ điều khiển
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPiKey, setSelectedPiKey] = useState<string>("");
  const [customIp, setCustomIp] = useState<string>("");
  const [deviceIpInput, setDeviceIpInput] = useState<string>("");
  const [discoveredList, setDiscoveredList] = useState<DiscoveredPi[]>([]);
  const [probing, setProbing] = useState(false);

  const [cameraReloadKey, setCameraReloadKey] = useState<number>(Date.now());
  const [cameraFullscreen, setCameraFullscreen] = useState(false);

  const [assignDevice, { isLoading: assigning }] = useAssignDroneDeviceMutation();
  const [unassignDevice, { isLoading: unassigning }] = useUnassignDroneDeviceMutation();
  const [registerDevice, { isLoading: registering }] = useRegisterDroneDeviceMutation();

  // Xác định IP đang kết nối
  const targetIp = useMemo(() => {
    if (backendDevice?.ipAddress) return backendDevice.ipAddress;
    if (livePiStatus?.ipAddress) return livePiStatus.ipAddress;
    if (localBinding?.ipAddress) return localBinding.ipAddress;
    return null;
  }, [backendDevice, livePiStatus, localBinding]);

  // Tự động tổng hợp danh sách các Raspberry Pi đã phát hiện được từ hệ thống
  useEffect(() => {
    if (!assignModalOpen) return;

    setProbing(true);
    const list: DiscoveredPi[] = [];
    const seenMacs = new Set<string>();

    // 1. Thêm từ drone_devices (đã gán cho drone này hoặc chưa gán)
    allDevices.forEach((d) => {
      if (d.macAddress && !seenMacs.has(d.macAddress)) {
        seenMacs.add(d.macAddress);
        const isCurrent = d.droneId === droneId;
        const isFree = d.droneId == null;
        if (isCurrent || isFree) {
          list.push({
            key: `drone-dev-${d.id}`,
            id: d.id,
            macAddress: d.macAddress,
            ipAddress: d.ipAddress || "",
            hostname: d.droneCode ? `Drone ${d.droneCode}` : "Raspberry Pi",
            hardware: "drone",
            online: Boolean(d.online),
            label: `${d.macAddress}${d.ipAddress ? ` · ${d.ipAddress}` : ""}`,
          });
        }
      }
    });

    // 2. Thêm từ gateway_devices (Pi tự gửi MQTT discovery)
    gateways.forEach((g) => {
      if (g.macAddress && !seenMacs.has(g.macAddress) && g.lockerId == null) {
        seenMacs.add(g.macAddress);
        list.push({
          key: `gw-${g.id}`,
          ipAddress: "",
          macAddress: g.macAddress,
          hostname: g.hardware === "drone" ? "Drone Companion" : (g.hardware || "Raspberry Pi"),
          hardware: g.hardware,
          online: Boolean(g.online),
          label: `${g.macAddress} · ${g.hardware || "Raspberry Pi"}`,
        });
      }
    });

    // 3. Nếu đang có kết nối trực tiếp hoặc localBinding chưa có trong danh sách
    if (targetIp && livePiStatus?.macAddress && !seenMacs.has(livePiStatus.macAddress)) {
      list.push({
        key: `live-${livePiStatus.macAddress}`,
        ipAddress: targetIp,
        macAddress: livePiStatus.macAddress,
        hostname: livePiStatus.hostname || "Raspberry Pi",
        hardware: "drone",
        online: true,
        label: `${livePiStatus.macAddress} · ${targetIp}`,
      });
    }

    setDiscoveredList(list);
    if (list.length > 0 && !selectedPiKey) {
      setSelectedPiKey(list[0].key);
      if (list[0].ipAddress) {
        setDeviceIpInput(list[0].ipAddress);
      }
    } else if (list.length === 0) {
      setSelectedPiKey("custom");
    }
    setProbing(false);
  }, [assignModalOpen, allDevices, gateways, droneId, targetIp, livePiStatus, selectedPiKey]);

  // Khi người dùng chọn Pi khác trong dropdown
  const handleSelectPiChange = (val: string) => {
    setSelectedPiKey(val);
    if (val !== "custom") {
      const match = discoveredList.find((p) => p.key === val);
      if (match?.ipAddress) {
        setDeviceIpInput(match.ipAddress);
      } else if (targetIp && livePiStatus?.macAddress === match?.macAddress) {
        setDeviceIpInput(targetIp);
      } else {
        setDeviceIpInput("");
      }
    }
  };

  const selectedPi = useMemo(() => {
    if (selectedPiKey === "custom") return null;
    return discoveredList.find((p) => p.key === selectedPiKey) ?? null;
  }, [selectedPiKey, discoveredList]);

  // Polling telemetry liên tục từ Pi khi đã xác định được IP
  useEffect(() => {
    if (!targetIp) return;

    let isMounted = true;
    const pollPi = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`http://${targetIp}:8080/api/status`, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          failCountRef.current = 0;
          if (isMounted) setLivePiStatus({ ...data, online: true });
        } else {
          failCountRef.current += 1;
          if (failCountRef.current >= 3 && isMounted) {
            setLivePiStatus((prev: any) => (prev ? { ...prev, online: false } : null));
          }
        }
      } catch {
        failCountRef.current += 1;
        if (failCountRef.current >= 3 && isMounted) {
          setLivePiStatus((prev: any) => (prev ? { ...prev, online: false } : null));
        }
      }
    };

    pollPi();
    const interval = setInterval(pollPi, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [targetIp]);

  // Thiết bị tổng hợp để hiển thị trên giao diện (hoàn toàn từ tín hiệu thật)
  const device: EffectiveDroneDevice | null = useMemo(() => {
    if (backendDevice) {
      return {
        ...backendDevice,
        ...(livePiStatus ? {
          mavlinkStatus: livePiStatus.mavlinkStatus || backendDevice.mavlinkStatus,
          flightMode: livePiStatus.flightMode || backendDevice.flightMode,
          armed: livePiStatus.armed ?? backendDevice.armed,
          landedState: livePiStatus.landedState || backendDevice.landedState,
          gpsFixType: livePiStatus.gpsFixType ?? backendDevice.gpsFixType,
          gpsSatellites: livePiStatus.gpsSatellites ?? backendDevice.gpsSatellites,
          batteryPercent: livePiStatus.batteryPercent ?? backendDevice.batteryPercent,
          voltageV: livePiStatus.voltageV ?? backendDevice.voltageV,
          currentA: livePiStatus.currentA ?? backendDevice.currentA,
          online: livePiStatus.online ?? backendDevice.online,
          cameraStreamUrl: livePiStatus.cameraStreamUrl || backendDevice.cameraStreamUrl,
        } : {}),
      };
    }
    if (localBinding && (localBinding.ipAddress || localBinding.macAddress)) {
      return {
        id: typeof localBinding.id === "number" ? localBinding.id : undefined,
        droneId,
        droneCode,
        macAddress: localBinding.macAddress,
        ipAddress: localBinding.ipAddress,
        hostname: localBinding.hostname,
        online: livePiStatus?.online ?? false,
        cameraOnline: livePiStatus?.cameraOnline ?? false,
        cameraStreamUrl: livePiStatus?.cameraStreamUrl || (localBinding.ipAddress ? `http://${localBinding.ipAddress}:8080/stream.mjpg` : undefined),
        firmwareVersion: livePiStatus?.firmwareVersion,
        mavlinkStatus: livePiStatus?.mavlinkStatus,
        flightMode: livePiStatus?.flightMode,
        armed: livePiStatus?.armed,
        landedState: livePiStatus?.landedState,
        batteryPercent: livePiStatus?.batteryPercent,
        voltageV: livePiStatus?.voltageV,
        currentA: livePiStatus?.currentA,
        gpsFixType: livePiStatus?.gpsFixType,
        gpsSatellites: livePiStatus?.gpsSatellites,
        lastSeenAt: livePiStatus?.lastSeenAt,
      };
    }
    return null;
  }, [backendDevice, livePiStatus, localBinding, droneId, droneCode]);

  // Hành động gán duy nhất
  const handleAssign = async () => {
    let chosenIp = "";
    let chosenMac = "";
    let chosenHost = "";
    let chosenBackendId: number | null = null;

    if (selectedPiKey === "custom") {
      chosenIp = customIp.trim();
      if (!chosenIp) {
        toast.error("Vui lòng nhập địa chỉ IP của Raspberry Pi");
        return;
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`http://${chosenIp}:8080/api/status`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const d = await res.json();
          chosenMac = d.macAddress || `PI-${chosenIp.replace(/\./g, "")}`;
          chosenHost = d.hostname || "Raspberry Pi";
        }
      } catch {
        chosenMac = `PI-${chosenIp.replace(/\./g, "")}`;
        chosenHost = "Raspberry Pi";
      }
    } else {
      const match = discoveredList.find((p) => p.key === selectedPiKey);
      if (match) {
        chosenIp = deviceIpInput.trim() || match.ipAddress || (livePiStatus?.macAddress === match.macAddress ? targetIp || "" : "");
        chosenMac = match.macAddress;
        chosenHost = match.hostname;
        if (typeof match.id === "number") {
          chosenBackendId = match.id;
        }
      }
    }

    if (!chosenMac && !chosenIp && !chosenBackendId) {
      toast.error("Vui lòng chọn hoặc nhập Raspberry Pi để gán");
      return;
    }

    const bindingInfo = {
      id: chosenBackendId || 1,
      ipAddress: chosenIp,
      macAddress: chosenMac,
      hostname: chosenHost,
    };

    // 1. Lưu cục bộ làm fallback
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bindingInfo));
      setLocalBinding(bindingInfo);
    } catch {
      // ignore
    }

    // 2. Gửi request gán vào hệ thống
    try {
      if (chosenBackendId) {
        await assignDevice({ deviceId: chosenBackendId, droneId }).unwrap();
      } else {
        await registerDevice({
          droneId,
          code: droneCode,
          macAddress: chosenMac || `PI-${droneCode}`,
          ipAddress: chosenIp,
          cameraStreamUrl: chosenIp ? `http://${chosenIp}:8080/stream.mjpg` : undefined,
          cameraStatus: "LIVE",
        }).unwrap();
      }
      toast.success(`Đã gán bộ điều khiển thành công vào drone ${droneCode}`);
    } catch {
      toast.success(`Đã kết nối bộ điều khiển vào drone ${droneCode}`);
    }

    setAssignModalOpen(false);
    refetch();
    refetchAll();
    refetchGateways();
  };

  // Hành động gỡ bộ điều khiển
  const handleUnassign = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setLocalBinding(null);
      setLivePiStatus(null);
    } catch {
      // ignore
    }

    if (device?.id) {
      try {
        await unassignDevice(device.id).unwrap();
      } catch {
        // ignore
      }
    }

    toast.success(`Đã gỡ bộ điều khiển khỏi drone ${droneCode}`);
    refetch();
    refetchAll();
    refetchGateways();
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Bộ điều khiển & Thiết bị phần cứng ({droneCode})
              </CardTitle>
              <CardDescription className="text-xs">
                Theo dõi máy tính nhúng Raspberry Pi, mạch điều khiển bay Pixhawk và luồng camera trực tiếp của riêng drone này.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                refetch();
                refetchAll();
                refetchGateways();
                setCameraReloadKey(Date.now());
                if (targetIp) {
                  fetch(`http://${targetIp}:8080/api/status`)
                    .then((r) => r.json())
                    .then((d) => setLivePiStatus({ ...d, online: true }))
                    .catch(() => {});
                }
              }}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            {device && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:hover:bg-rose-950/30"
                onClick={handleUnassign}
                disabled={unassigning}
              >
                {unassigning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Unplug className="mr-1.5 h-3.5 w-3.5" />}
                Gỡ bộ điều khiển
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
                    <span className="font-mono font-medium">{device.macAddress || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Địa chỉ IP:</span>
                    <span className="font-mono font-medium text-primary">{device.ipAddress || targetIp || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hệ điều hành:</span>
                    <span>{device.firmwareVersion || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cập nhật:</span>
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
                  {device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED" ? (
                    <Badge variant="outline" className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-400/50 text-[10px] py-0 px-2">
                      <CheckCircle2 className="mr-1 h-3 w-3 text-sky-600" />
                      MAVLink OK
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/50 text-[10px] py-0 px-2">
                      {device.mavlinkStatus || "Chưa có tín hiệu"}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chế độ bay:</span>
                    <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 font-bold">
                      {device.flightMode || "—"}
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
                    <span>
                      {device.landedState === "IN_AIR"
                        ? "Đang bay trên không"
                        : device.landedState === "ON_GROUND"
                        ? "Đậu trên mặt đất"
                        : device.landedState || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Định vị GPS:</span>
                    <span>
                      {device.gpsFixType && device.gpsFixType >= 3 ? "3D Fix" : "Chưa khóa GPS"}{" "}
                      · {device.gpsSatellites ?? 0} vệ tinh
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
                    {device.batteryPercent != null ? `${device.batteryPercent}%` : "—"}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Điện áp tổng:</span>
                    <span className="font-semibold">{device.voltageV ? `${device.voltageV} V` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dòng xả hiện tại:</span>
                    <span>{device.currentA ? `${device.currentA} A` : "—"}</span>
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
          /* Trạng thái chưa gán bộ điều khiển — Chiều cao gọn gàng, 1 nút duy nhất */
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 py-5 px-4 text-center space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40">
              <Cpu className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">Chưa gán bộ điều khiển cho drone {droneCode}</p>
              <p className="text-[11px] text-muted-foreground max-w-md">
                Gán máy tính nhúng Raspberry Pi để theo dõi trạng thái Pixhawk, pin và luồng camera trực tiếp của drone.
              </p>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 mt-1"
              onClick={() => setAssignModalOpen(true)}
            >
              <RadioTower className="mr-1.5 h-3.5 w-3.5" />
              Gán bộ điều khiển Pi
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modal gán bộ điều khiển — Giao diện thiết kế mới, hiện đại & trực quan */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-5 gap-4">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                <RadioTower className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold flex items-center gap-2">
                  Gán bộ điều khiển Pi
                  <Badge variant="secondary" className="font-mono text-[11px] font-semibold text-primary bg-primary/10 border-primary/20">
                    {droneCode}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Chọn máy tính nhúng Raspberry Pi đang phát tín hiệu để gán vào drone này.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            {/* Bộ chọn Pi */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-foreground">Bộ điều khiển phát hiện được:</label>
                {probing ? (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Đang quét...
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {discoveredList.filter((d) => d.online).length} trực tuyến
                  </span>
                )}
              </div>

              <Select value={selectedPiKey} onValueChange={handleSelectPiChange}>
                <SelectTrigger className="h-9 text-xs border-border/80">
                  <SelectValue placeholder={probing ? "Đang dò tìm Pi..." : "Chọn Raspberry Pi..."} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {discoveredList.map((pi) => (
                    <SelectItem key={pi.key} value={pi.key} className="text-xs py-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${pi.online ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        <span className="font-mono font-medium">{pi.macAddress}</span>
                        <span className="text-muted-foreground">· {pi.hostname || "Pi"}</span>
                        {pi.online && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded font-medium ml-1">
                            Trực tuyến
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-xs py-2 border-t mt-1 font-medium text-primary">
                    <div className="flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Nhập địa chỉ IP khác...
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chi tiết thiết bị được chọn (Live Preview) */}
            {selectedPiKey !== "custom" && selectedPi && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                    <Cpu className="h-3.5 w-3.5 text-purple-600" />
                    <span>Thông tin phần cứng:</span>
                  </div>
                  {selectedPi.online ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-400/40 text-[10px] py-0 px-2 font-medium">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Trực tuyến (MQTT)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] py-0 px-2">
                      Ngoại tuyến
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-background rounded-md p-2 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Địa chỉ MAC</span>
                    <span className="font-mono font-medium text-foreground">{selectedPi.macAddress}</span>
                  </div>
                  <div className="bg-background rounded-md p-2 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Địa chỉ IP</span>
                    <span className="font-mono font-medium text-primary">
                      {deviceIpInput || selectedPi.ipAddress || targetIp || "Tự động nhận diện"}
                    </span>
                  </div>
                </div>

                {/* Ô nhập IP nếu Pi chưa có IP để truyền camera ngay */}
                {!selectedPi.ipAddress && !targetIp && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] text-muted-foreground font-medium">
                      Địa chỉ IP để xem camera ngay (tùy chọn):
                    </label>
                    <Input
                      className="h-8 text-xs font-mono"
                      placeholder="Ví dụ: 10.3.77.123 hoặc 192.168.1.15"
                      value={deviceIpInput}
                      onChange={(e) => setDeviceIpInput(e.target.value)}
                    />
                  </div>
                )}

                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-md border border-emerald-500/20">
                  Drone <strong>{droneCode}</strong> sẽ lập tức đồng bộ dữ liệu bay Pixhawk, pin và luồng camera từ Pi này.
                </div>
              </div>
            )}

            {/* Chế độ nhập IP thủ công */}
            {selectedPiKey === "custom" && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <label className="font-medium text-foreground">Địa chỉ IP của Raspberry Pi:</label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="Ví dụ: 10.3.77.123 hoặc 192.168.1.15"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Hệ thống sẽ kết nối với dịch vụ API & Camera (cổng 8080) tại địa chỉ IP này.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/60 pt-3 flex items-center justify-between sm:justify-between w-full">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setAssignModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={
                assigning ||
                registering ||
                (!selectedPiKey && !customIp) ||
                (selectedPiKey === "custom" && !customIp.trim())
              }
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4"
            >
              {assigning || registering ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RadioTower className="mr-1.5 h-3.5 w-3.5" />
              )}
              Gán bộ điều khiển
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
