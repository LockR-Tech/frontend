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
  AlertCircle,
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
  onOperationLogged?: () => void;
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
  hardware?: string;
  droneId?: number | null;
  assignedDroneCode?: string | null;
  isAssignedOther?: boolean;
}

export function DroneHardwarePanel({ droneId, droneCode, onOperationLogged }: DroneHardwarePanelProps) {
  // Xóa sạch bộ nhớ đệm (cache localStorage cũ) theo yêu cầu người dùng
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("lockr_drone_binding_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, []);

  // 1. Dữ liệu thiết bị được lưu từ Backend
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

  // 2. Trạng thái telemetry trực tiếp từ Pi qua mạng nội bộ
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

  // Xác định IP đang kết nối - hoàn toàn từ backend thực tế
  const targetIp = useMemo(() => {
    if (backendDevice?.ipAddress) return backendDevice.ipAddress;
    return null;
  }, [backendDevice]);

  // Tự động tổng hợp danh sách các Raspberry Pi hoạt động từ hệ thống
  useEffect(() => {
    if (!assignModalOpen) return;

    const list: DiscoveredPi[] = [];
    const seenMacs = new Set<string>();

    // 1. Thêm từ drone_devices
    allDevices.forEach((d) => {
      if (d.macAddress && !seenMacs.has(d.macAddress)) {
        seenMacs.add(d.macAddress);
        const isAssignedOther = Boolean(d.droneId && d.droneId !== droneId);
        list.push({
          key: `drone-dev-${d.id}`,
          id: d.id,
          macAddress: d.macAddress,
          ipAddress: d.ipAddress || "",
          hostname: d.droneCode ? `Pi Drone (${d.droneCode})` : "Raspberry Pi",
          hardware: "drone",
          online: Boolean(d.online),
          droneId: d.droneId,
          assignedDroneCode: d.droneCode,
          isAssignedOther,
        });
      }
    });

    // 2. Thêm từ gateway_devices (Pi gửi MQTT discovery)
    gateways.forEach((g) => {
      if (g.macAddress) {
        if (seenMacs.has(g.macAddress)) {
          // Bổ sung IP vào mục đã có nếu mục đó chưa có IP
          if (g.ipAddress) {
            const existing = list.find((item) => item.macAddress === g.macAddress);
            if (existing && !existing.ipAddress) {
              existing.ipAddress = g.ipAddress;
            }
          }
          return;
        }

        // Bỏ qua gateway thuộc locker tủ
        if (g.lockerId != null) return;

        seenMacs.add(g.macAddress);
        const assignedDrone = allDevices.find(
          (ad) =>
            (ad.macAddress === g.macAddress || (g.ipAddress && ad.ipAddress === g.ipAddress)) &&
            ad.droneId != null
        );
        const isAssignedOther = Boolean(assignedDrone && assignedDrone.droneId !== droneId);

        list.push({
          key: `gw-${g.id}`,
          macAddress: g.macAddress,
          ipAddress: g.ipAddress || "",
          hostname:
            g.hardware === "drone"
              ? "Drone Companion Pi"
              : g.hardware
              ? `Raspberry Pi (${g.hardware})`
              : "Raspberry Pi",
          hardware: g.hardware,
          online: Boolean(g.online),
          droneId: assignedDrone?.droneId ?? null,
          assignedDroneCode: assignedDrone?.droneCode ?? null,
          isAssignedOther,
        });
      }
    });

    // Sắp xếp danh sách:
    // 1. Chưa bị gán cho drone khác lên đầu
    // 2. Trực tuyến (online) lên đầu
    // 3. Có IP lên đầu
    list.sort((a, b) => {
      if (a.isAssignedOther !== b.isAssignedOther) {
        return a.isAssignedOther ? 1 : -1;
      }
      if (a.online !== b.online) {
        return a.online ? -1 : 1;
      }
      if (Boolean(a.ipAddress) !== Boolean(b.ipAddress)) {
        return a.ipAddress ? -1 : 1;
      }
      return a.hostname.localeCompare(b.hostname);
    });

    setDiscoveredList(list);

    // Tự động chọn Pi phù hợp nếu chưa chọn
    if (!selectedPiKey) {
      const firstAvailable = list.find((p) => !p.isAssignedOther);
      if (firstAvailable) {
        setSelectedPiKey(firstAvailable.key);
        setDeviceIpInput(firstAvailable.ipAddress || "");
      } else if (list.length > 0) {
        setSelectedPiKey(list[0].key);
        setDeviceIpInput(list[0].ipAddress || "");
      } else {
        setSelectedPiKey("custom");
      }
    }
  }, [assignModalOpen, allDevices, gateways, droneId, selectedPiKey]);

  // Khi người dùng chọn Pi khác trong dropdown
  const handleSelectPiChange = (val: string) => {
    setSelectedPiKey(val);
    if (val !== "custom") {
      const match = discoveredList.find((p) => p.key === val);
      if (match?.ipAddress) {
        setDeviceIpInput(match.ipAddress);
      } else {
        setDeviceIpInput("");
      }
    }
  };

  const selectedPi = useMemo(() => {
    if (selectedPiKey === "custom") return null;
    return discoveredList.find((p) => p.key === selectedPiKey) ?? null;
  }, [selectedPiKey, discoveredList]);

  // Polling telemetry liên tục từ Pi khi đã xác định được IP từ Backend
  useEffect(() => {
    if (!targetIp) return;

    let isMounted = true;
    const pollPi = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
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
          if (isMounted) {
            setLivePiStatus((prev: any) => (prev ? { ...prev, online: false } : { online: false }));
          }
        }
      } catch {
        failCountRef.current += 1;
        if (isMounted) {
          setLivePiStatus((prev: any) => (prev ? { ...prev, online: false } : { online: false }));
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
    if (!backendDevice) return null;

    const rawOnline = livePiStatus !== null ? Boolean(livePiStatus.online) : Boolean(backendDevice.online);
    const mergedMavlink = rawOnline
      ? livePiStatus?.mavlinkStatus || backendDevice.mavlinkStatus || "DISCONNECTED"
      : "DISCONNECTED";
    const isPixhawkOk = rawOnline && (mergedMavlink === "connected" || mergedMavlink === "CONNECTED");

    return {
      ...backendDevice,
      online: rawOnline,
      mavlinkStatus: mergedMavlink,
      flightMode: isPixhawkOk ? livePiStatus?.flightMode || backendDevice.flightMode : undefined,
      armed: isPixhawkOk ? livePiStatus?.armed ?? backendDevice.armed : undefined,
      landedState: isPixhawkOk ? livePiStatus?.landedState || backendDevice.landedState : undefined,
      gpsFixType: isPixhawkOk ? livePiStatus?.gpsFixType ?? backendDevice.gpsFixType : undefined,
      gpsSatellites: isPixhawkOk ? livePiStatus?.gpsSatellites ?? backendDevice.gpsSatellites : undefined,
      batteryPercent: isPixhawkOk ? livePiStatus?.batteryPercent ?? backendDevice.batteryPercent ?? undefined : undefined,
      voltageV: isPixhawkOk ? livePiStatus?.voltageV ?? backendDevice.voltageV ?? undefined : undefined,
      currentA: isPixhawkOk ? livePiStatus?.currentA ?? backendDevice.currentA ?? undefined : undefined,
      cameraStreamUrl:
        livePiStatus?.cameraStreamUrl ||
        backendDevice.cameraStreamUrl ||
        (backendDevice.ipAddress ? `http://${backendDevice.ipAddress}:8080/stream.mjpg` : undefined),
    };
  }, [backendDevice, livePiStatus]);

  // Hành động gán bộ điều khiển (có kiểm tra kết nối IP thực tế & chống gán trùng)
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

      // Kiểm tra định dạng IP cơ bản
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(chosenIp) && !chosenIp.includes("localhost") && !chosenIp.includes(".local")) {
        toast.error("Địa chỉ IP không đúng định dạng. Ví dụ: 192.168.1.15");
        return;
      }

      // Kiểm tra xem IP này có đang được gán cho drone khác trong allDevices không
      const conflictIp = allDevices.find(
        (d) => d.ipAddress === chosenIp && d.droneId != null && d.droneId !== droneId
      );
      if (conflictIp) {
        toast.error(
          `Địa chỉ IP ${chosenIp} đã được gán cho drone ${
            conflictIp.droneCode || `#${conflictIp.droneId}`
          }. Không được gán trùng!`
        );
        return;
      }

      // Kiểm tra sự tồn tại thực tế của Pi tại IP này
      setProbing(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`http://${chosenIp}:8080/api/status`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(timeout);
        if (!res.ok) {
          toast.error(
            `Không tìm thấy Raspberry Pi tại IP ${chosenIp} (Mã lỗi HTTP: ${res.status}). Vui lòng kiểm tra lại.`
          );
          setProbing(false);
          return;
        }
        const data = await res.json();
        chosenMac = data.macAddress || `PI-${chosenIp.replace(/\./g, "")}`;
        chosenHost = data.hostname || `Raspberry Pi (${chosenIp})`;
      } catch {
        toast.error(
          `Không thể kết nối đến Raspberry Pi tại địa chỉ IP: ${chosenIp}. Thiết bị không tồn tại hoặc chưa khởi động dịch vụ trên cổng 8080.`
        );
        setProbing(false);
        return;
      }

      // Kiểm tra tiếp MAC nếu có
      const conflictMac = allDevices.find(
        (d) => d.macAddress === chosenMac && d.droneId != null && d.droneId !== droneId
      );
      if (conflictMac) {
        toast.error(
          `Thiết bị Raspberry Pi (MAC: ${chosenMac}) đã được gán cho drone ${
            conflictMac.droneCode || `#${conflictMac.droneId}`
          }. Không được gán trùng!`
        );
        setProbing(false);
        return;
      }
    } else {
      const match = discoveredList.find((p) => p.key === selectedPiKey);
      if (!match) {
        toast.error("Vui lòng chọn Raspberry Pi để gán");
        return;
      }

      if (match.isAssignedOther) {
        toast.error(
          `Raspberry Pi này đã được gán cho drone ${
            match.assignedDroneCode || `#${match.droneId}`
          }. Không thể gán trùng!`
        );
        return;
      }

      chosenIp = deviceIpInput.trim() || match.ipAddress;
      if (!chosenIp) {
        toast.error("Vui lòng nhập địa chỉ IP của Raspberry Pi");
        return;
      }

      // Kiểm tra xem IP này có đang gán cho drone khác không
      const conflictIp = allDevices.find(
        (d) => d.ipAddress === chosenIp && d.droneId != null && d.droneId !== droneId
      );
      if (conflictIp) {
        toast.error(
          `Địa chỉ IP ${chosenIp} đã được gán cho drone ${
            conflictIp.droneCode || `#${conflictIp.droneId}`
          }. Không được gán trùng!`
        );
        return;
      }

      chosenMac = match.macAddress;
      chosenHost = match.hostname;
      if (typeof match.id === "number") {
        chosenBackendId = match.id;
      }

      // Kiểm tra thực tế kết nối tới IP
      setProbing(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`http://${chosenIp}:8080/api/status`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(timeout);
        if (!res.ok) {
          toast.error(`Không tìm thấy Raspberry Pi tại IP ${chosenIp} (Mã lỗi: ${res.status}).`);
          setProbing(false);
          return;
        }
        const data = await res.json();
        if (data.macAddress) chosenMac = data.macAddress;
      } catch {
        toast.error(
          `Không thể kết nối đến Raspberry Pi tại IP ${chosenIp}. Vui lòng kiểm tra lại địa chỉ IP.`
        );
        setProbing(false);
        return;
      }
    }

    // Gửi request gán vào Backend (lưu vào database)
    try {
      if (chosenBackendId) {
        await assignDevice({ deviceId: chosenBackendId, droneId, ipAddress: chosenIp }).unwrap();
      } else {
        await registerDevice({
          droneId,
          code: droneCode,
          macAddress: chosenMac || `PI-${droneCode}`,
          ipAddress: chosenIp,
          cameraStreamUrl: chosenIp ? `http://${chosenIp}:8080/stream.mjpg` : undefined,
          cameraStatus: chosenIp ? "CONFIGURED" : "OFFLINE",
        }).unwrap();
      }
      toast.success(`Đã gán bộ điều khiển (IP: ${chosenIp}) thành công vào drone ${droneCode}`);
      setAssignModalOpen(false);
      refetch();
      refetchAll();
      refetchGateways();
      onOperationLogged?.();
    } catch (err: any) {
      const errorMsg =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        "Không thể gán bộ điều khiển do lỗi hệ thống.";
      toast.error(errorMsg);
    } finally {
      setProbing(false);
    }
  };

  // Hành động gỡ bộ điều khiển
  const handleUnassign = async () => {
    if (device?.id) {
      try {
        await unassignDevice({ deviceId: device.id, droneId }).unwrap();
        toast.success(`Đã gỡ bộ điều khiển khỏi drone ${droneCode}`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể gỡ bộ điều khiển");
      }
    }

    setLivePiStatus(null);
    refetch();
    refetchAll();
    refetchGateways();
    onOperationLogged?.();
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
                  const controller = new AbortController();
                  const timer = setTimeout(() => controller.abort(), 2000);
                  fetch(`http://${targetIp}:8080/api/status`, { signal: controller.signal })
                    .then((r) => {
                      clearTimeout(timer);
                      if (!r.ok) throw new Error("HTTP error");
                      return r.json();
                    })
                    .then((d) => setLivePiStatus({ ...d, online: true }))
                    .catch(() => {
                      clearTimeout(timer);
                      setLivePiStatus((prev: any) => (prev ? { ...prev, online: false } : { online: false }));
                    });
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
                    <span className="font-mono font-bold text-primary">{device.ipAddress || targetIp || "—"}</span>
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
                  {!device.online ? (
                    <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/50 text-[10px] py-0 px-2">
                      <Unplug className="mr-1 h-3 w-3" />
                      Mất tín hiệu (Pi tắt nguồn)
                    </Badge>
                  ) : device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED" ? (
                    <Badge variant="outline" className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-400/50 text-[10px] py-0 px-2">
                      <CheckCircle2 className="mr-1 h-3 w-3 text-sky-600" />
                      MAVLink OK
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/50 text-[10px] py-0 px-2">
                      {device.mavlinkStatus || "Chưa kết nối Pixhawk"}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chế độ bay:</span>
                    {device.online && (device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED") && device.flightMode ? (
                      <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 font-bold">
                        {device.flightMode}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Động cơ:</span>
                    {!device.online || (device.mavlinkStatus !== "connected" && device.mavlinkStatus !== "CONNECTED") || device.armed == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : device.armed ? (
                      <span className="font-semibold text-rose-600">ARMED (Đang quay)</span>
                    ) : (
                      <span className="font-semibold text-emerald-600">DISARMED (An toàn)</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    {!device.online || (device.mavlinkStatus !== "connected" && device.mavlinkStatus !== "CONNECTED") ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span>
                        {device.landedState === "IN_AIR"
                          ? "Đang bay trên không"
                          : device.landedState === "ON_GROUND"
                          ? "Đậu trên mặt đất"
                          : device.landedState === "TAKEOFF"
                          ? "Đang cất cánh"
                          : device.landedState === "LANDING"
                          ? "Đang hạ cánh"
                          : device.landedState || "—"}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Định vị GPS:</span>
                    {!device.online || (device.mavlinkStatus !== "connected" && device.mavlinkStatus !== "CONNECTED") ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span>
                        {device.gpsFixType && device.gpsFixType >= 3 ? "3D Fix" : "Chưa khóa GPS"}{" "}
                        · {device.gpsSatellites ?? 0} vệ tinh
                      </span>
                    )}
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
                  {device.online && (device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED") && device.batteryPercent != null ? (
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 px-2 ${
                        (device.batteryPercent ?? 0) < 20
                          ? "bg-rose-500/15 text-rose-700 border-rose-400/50"
                          : (device.batteryPercent ?? 0) < 50
                          ? "bg-amber-500/15 text-amber-700 border-amber-400/50"
                          : "bg-emerald-500/15 text-emerald-700 border-emerald-400/50"
                      }`}
                    >
                      {device.batteryPercent}%
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] py-0 px-2">
                      —
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Điện áp tổng:</span>
                    <span className="font-semibold">
                      {device.online && (device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED") && device.voltageV != null
                        ? `${device.voltageV} V`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dòng xả hiện tại:</span>
                    <span>
                      {device.online && (device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED") && device.currentA != null
                        ? `${device.currentA} A`
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    {device.online && (device.mavlinkStatus === "connected" || device.mavlinkStatus === "CONNECTED") && device.batteryPercent != null ? (
                      <div
                        className={`h-full transition-all duration-300 ${
                          (device.batteryPercent ?? 0) < 20
                            ? "bg-rose-500"
                            : (device.batteryPercent ?? 0) < 50
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.max(3, Math.min(100, device.batteryPercent ?? 0))}%` }}
                      />
                    ) : (
                      <div className="h-full bg-muted-foreground/20" style={{ width: "0%" }} />
                    )}
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

              <div className={`relative bg-slate-950 flex items-center justify-center overflow-hidden transition-all ${cameraFullscreen ? "h-[640px]" : "h-80 md:h-[380px]"}`}>
                {device.online && streamUrl ? (
                  <img
                    key={cameraReloadKey}
                    src={streamUrl}
                    alt={`Live stream from ${droneCode}`}
                    className="h-full w-auto max-w-full object-contain"
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

      {/* Modal gán bộ điều khiển */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-[520px] p-5 gap-4">
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
                  Chọn Raspberry Pi đang hoạt động từ danh sách hoặc nhập địa chỉ IP để gán vào drone này.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            {/* Bộ chọn Pi */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-foreground">
                  Danh sách Raspberry Pi phát hiện được:
                </label>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {discoveredList.filter((d) => d.online).length} trực tuyến
                </span>
              </div>

              <Select value={selectedPiKey} onValueChange={handleSelectPiChange}>
                <SelectTrigger className="h-10 text-xs border-border/80">
                  <SelectValue placeholder="Chọn Raspberry Pi (Tên & IP)..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {discoveredList.map((pi) => (
                    <SelectItem key={pi.key} value={pi.key} className="text-xs py-2.5 cursor-pointer">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
                              pi.online ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-foreground">
                              {pi.hostname}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                              <span className={pi.ipAddress ? "text-primary font-bold" : "text-amber-600 dark:text-amber-400"}>
                                IP: {pi.ipAddress || "Chưa có IP"}
                              </span>
                              <span>·</span>
                              <span>MAC: {pi.macAddress}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center">
                          {pi.isAssignedOther ? (
                            <Badge variant="destructive" className="text-[10px] py-0.5 px-2">
                              Đang gán: {pi.assignedDroneCode || `Drone #${pi.droneId}`}
                            </Badge>
                          ) : pi.droneId === droneId ? (
                            <Badge variant="outline" className="text-[10px] py-0.5 px-2 text-primary border-primary">
                              Đang gán drone này
                            </Badge>
                          ) : pi.online ? (
                            <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-emerald-50 text-emerald-700 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-400">
                              Hoạt động
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0.5 px-2 text-muted-foreground">
                              Ngoại tuyến
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-xs py-2.5 border-t mt-1 font-medium text-primary">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Tự nhập địa chỉ IP khác...</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chi tiết thiết bị được chọn (Live Preview) */}
            {selectedPiKey !== "custom" && selectedPi && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                    <Cpu className="h-3.5 w-3.5 text-purple-600" />
                    <span>Thông tin Raspberry Pi được chọn:</span>
                  </div>
                  {selectedPi.isAssignedOther ? (
                    <Badge variant="destructive" className="text-[10px] py-0 px-2 font-medium">
                      Đang được gán cho {selectedPi.assignedDroneCode || `Drone #${selectedPi.droneId}`}
                    </Badge>
                  ) : selectedPi.online ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-400/40 text-[10px] py-0 px-2 font-medium">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Đang hoạt động (Trực tuyến)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] py-0 px-2">
                      Ngoại tuyến
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-background rounded-md p-2 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Tên Raspberry Pi</span>
                    <span className="font-semibold text-foreground truncate block">{selectedPi.hostname}</span>
                  </div>
                  <div className="bg-background rounded-md p-2 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Địa chỉ IP</span>
                    <span className="font-mono font-bold text-primary truncate block">
                      {deviceIpInput || selectedPi.ipAddress || "Chưa có IP"}
                    </span>
                  </div>
                  <div className="bg-background rounded-md p-2 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Địa chỉ MAC</span>
                    <span className="font-mono font-medium text-foreground truncate block">{selectedPi.macAddress}</span>
                  </div>
                  <div className="bg-background rounded-md p-2 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Phần cứng / Vai trò</span>
                    <span className="font-medium text-foreground truncate block capitalize">{selectedPi.hardware || "Raspberry Pi"}</span>
                  </div>
                </div>

                {/* Nếu Pi chưa có IP, bắt buộc nhập IP */}
                {!selectedPi.ipAddress && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] text-foreground font-semibold flex items-center gap-1">
                      Nhập địa chỉ IP cho Pi này: <span className="text-destructive">*</span>
                    </label>
                    <Input
                      className="h-8 text-xs font-mono"
                      placeholder="Ví dụ: 192.168.1.15 hoặc 10.3.77.123"
                      value={deviceIpInput}
                      onChange={(e) => setDeviceIpInput(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Hệ thống sẽ kết nối với Pi tại IP này và lưu vĩnh viễn vào cơ sở dữ liệu.
                    </p>
                  </div>
                )}

                {/* Cảnh báo nếu Pi này đang được gán cho drone khác */}
                {selectedPi.isAssignedOther ? (
                  <div className="text-[11px] text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/30 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    <span>
                      Bộ điều khiển này hiện đang được gán cho <strong>{selectedPi.assignedDroneCode || `Drone #${selectedPi.droneId}`}</strong>. Không thể gán trùng vào drone khác!
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-md border border-emerald-500/20">
                    Drone <strong>{droneCode}</strong> sẽ đồng bộ dữ liệu bay Pixhawk, pin và luồng camera trực tiếp từ Pi này.
                  </div>
                )}
              </div>
            )}

            {/* Chế độ nhập IP thủ công */}
            {selectedPiKey === "custom" && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <label className="font-medium text-foreground text-xs flex items-center justify-between">
                  <span>Địa chỉ IP của Raspberry Pi:</span>
                  <span className="text-destructive">* Bắt buộc</span>
                </label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="Ví dụ: 192.168.1.15 hoặc 10.3.77.123"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Hệ thống sẽ kiểm tra và kết nối với dịch vụ API & Camera (cổng 8080) tại địa chỉ IP này. Nếu IP không tồn tại hoặc không phản hồi, hệ thống sẽ từ chối gán.
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
                probing ||
                (!selectedPiKey && !customIp) ||
                (selectedPiKey === "custom" && !customIp.trim()) ||
                Boolean(selectedPi?.isAssignedOther) ||
                (selectedPiKey !== "custom" && !selectedPi?.ipAddress && !deviceIpInput.trim())
              }
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4"
            >
              {assigning || registering || probing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RadioTower className="mr-1.5 h-3.5 w-3.5" />
              )}
              {probing ? "Đang kiểm tra kết nối Pi..." : "Gán bộ điều khiển"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
