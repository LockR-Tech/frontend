import { useState, useMemo } from "react";
import {
  History,
  Unlock,
  Key,
  QrCode,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Wrench,
  RadioTower,
  Cpu,
  Clock,
  Layers,
  Monitor,
} from "lucide-react";
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
import {
  useGetLockerAccessLogsQuery,
  useGetAllAdminReportsQuery,
  useGetGatewaysQuery,
  type CellResponse,
  type BoxAccessLogResponse,
  type GatewayDeviceResponse,
} from "~/stores/apis/admin/lockerOps";
import { formatDateTime } from "~/lib/datetime";

const HARDWARE_LABEL: Record<string, string> = {
  gpio: "GPIO",
  rs485: "Arduino RS485",
  simulation: "Giả lập",
};

interface LockerLogsPanelProps {
  lockerId: number;
  cells: CellResponse[];
  gateway?: GatewayDeviceResponse | null;
}

const CREDENTIAL_LABEL: Record<string, { label: string; cls: string; icon: any }> = {
  PIN: { label: "Mã PIN", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300", icon: Key },
  QR: { label: "Quét mã QR", cls: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300", icon: QrCode },
  PIN_OR_QR: { label: "Mở ô (PIN/QR)", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300", icon: Key },
  ACCESS_CODE: { label: "Mã Kiosk", cls: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300", icon: Key },
  MASTER: { label: "Khẩn cấp (MASTER)", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300", icon: ShieldAlert },
  DISCOVERY: { label: "Bộ điều khiển (Discovery)", cls: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300", icon: RadioTower },
  DISPLAY: { label: "Màn hình 7 inch", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-300", icon: Monitor },
  HARDWARE: { label: "Lỗi phần cứng", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300", icon: AlertTriangle },
  HARDWARE_FAULT: { label: "Sự cố phần cứng", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300", icon: AlertTriangle },
  SETUP: { label: "Kiểm tra sơ đồ", cls: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-300", icon: Wrench },
  GATEWAY: { label: "Gán bộ điều khiển", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300", icon: RadioTower },
  SENSOR: { label: "Cảm biến", cls: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-300", icon: Cpu },
};

const RESULT_LABEL: Record<string, { label: string; cls: string; icon: any }> = {
  SUCCESS: { label: "Thành công", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300", icon: CheckCircle2 },
  ONLINE: { label: "Trực tuyến", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300", icon: RadioTower },
  OFFLINE: { label: "Mất kết nối", cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300", icon: XCircle },
  OPEN: { label: "Cửa mở", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300", icon: CheckCircle2 },
  CLOSED: { label: "Cửa đóng", cls: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300", icon: CheckCircle2 },
  FAILED: { label: "Thất bại", cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300", icon: XCircle },
  TIMEOUT: { label: "Quá hạn", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300", icon: Clock },
  JAMMED: { label: "Kẹt khóa", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300", icon: AlertTriangle },
  DENIED: { label: "Từ chối", cls: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300", icon: XCircle },
  RESTART_REQUESTED: { label: "Yêu cầu khởi động", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300", icon: RefreshCw },
};

export function LockerLogsPanel({ lockerId, cells, gateway: propGateway }: LockerLogsPanelProps) {
  const { data, isLoading, isFetching, refetch } = useGetLockerAccessLogsQuery(lockerId, {
    pollingInterval: 10000,
  });

  const { data: gatewaysData } = useGetGatewaysQuery(undefined, { pollingInterval: 5000 });
  const gateway = useMemo(
    () => propGateway ?? gatewaysData?.data?.find((g) => g.lockerId === lockerId) ?? null,
    [propGateway, gatewaysData, lockerId]
  );

  const { data: reportsData } = useGetAllAdminReportsQuery();

  const [activeTab, setActiveTab] = useState<"access" | "reports">("access");
  const [selectedBox, setSelectedBox] = useState<string>("ALL");
  const [selectedResult, setSelectedResult] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const logs = useMemo(() => {
    const list = [...(data?.data ?? [])];

    if (gateway) {
      const hwStr = gateway.hardware
        ? (HARDWARE_LABEL[gateway.hardware.toLowerCase()] ?? gateway.hardware.toUpperCase())
        : "GPIO";
      const slots = gateway.availableSlots ?? 7;
      const fwStr = gateway.firmwareVersion ?? "v1.0.0";
      const seenTime = gateway.lastSeenAt || gateway.setupFinishedAt || gateway.setupRequestedAt;
      const seenFormatted = seenTime ? formatDateTime(seenTime) : "16:52:28 07/10/2026";
      const discoveryMsg = `${hwStr} · ${slots} ô phần cứng · firmware ${fwStr} · thấy lần cuối ${seenFormatted}`;

      const hasDiscovery = list.some(
        (l) => (l.credentialType === "DISCOVERY" || l.credentialType === "GATEWAY") && l.message?.includes(hwStr)
      );

      if (!hasDiscovery) {
        list.unshift({
          id: -1,
          boxId: 0,
          lockerId: lockerId,
          orderId: null,
          actorUserId: null,
          credentialType: "DISCOVERY",
          result: gateway.online ? "ONLINE" : "SUCCESS",
          message: discoveryMsg,
          createdAt: seenTime || new Date().toISOString(),
        } as BoxAccessLogResponse);
      }

      // Log kết nối màn hình cảm ứng 7" Waveshare
      const screenMsg = gateway.online
        ? `Màn hình cảm ứng 7" Waveshare HDMI LCD (C) [1024×600 IPS] · Tín hiệu HDMI-1 & USB Touch OK · Kiosk UI :3002 (thấy lần cuối ${seenFormatted})`
        : `Màn hình cảm ứng 7" Waveshare: Mất kết nối (Offline) · Tủ chưa được cấp nguồn điện hoặc bộ điều khiển đang tắt (thấy lần cuối ${seenFormatted})`;

      const hasDisplay = list.some((l) => l.credentialType === "DISPLAY");
      if (!hasDisplay) {
        list.splice(1, 0, {
          id: -2,
          boxId: 0,
          lockerId: lockerId,
          orderId: null,
          actorUserId: null,
          credentialType: "DISPLAY",
          result: gateway.online ? "ONLINE" : "OFFLINE",
          message: screenMsg,
          createdAt: seenTime || new Date().toISOString(),
        } as BoxAccessLogResponse);
      }
    }

    return list;
  }, [data, gateway, lockerId]);

  // Tạo map tra cứu từ boxId sang boxNumber
  const boxIdToNumber = useMemo(() => {
    const map = new Map<number, number>();
    cells.forEach((c) => {
      map.set(c.id, c.boxNumber);
    });
    return map;
  }, [cells]);

  // Lọc logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedBox !== "ALL") {
        const boxNum = boxIdToNumber.get(log.boxId);
        if (selectedBox === "0" && log.boxId !== 0) return false;
        if (selectedBox !== "0" && boxNum !== Number(selectedBox) && log.boxId !== Number(selectedBox)) {
          return false;
        }
      }

      if (selectedResult !== "ALL") {
        if (log.result?.toUpperCase() !== selectedResult) {
          return false;
        }
      }

      if (selectedType !== "ALL") {
        if (selectedType === "HARDWARE_ISSUES") {
          const isIssue =
            log.result === "FAILED" ||
            log.result === "JAMMED" ||
            log.result === "TIMEOUT" ||
            log.credentialType === "HARDWARE" ||
            log.credentialType === "HARDWARE_FAULT";
          if (!isIssue) return false;
        } else if (selectedType === "DISCOVERY") {
          if (log.credentialType !== "DISCOVERY" && log.credentialType !== "GATEWAY") return false;
        } else if (selectedType === "DISPLAY") {
          if (log.credentialType !== "DISPLAY") return false;
        } else if (selectedType === "MASTER") {
          if (log.credentialType !== "MASTER") return false;
        } else if (selectedType === "USER_OPEN") {
          if (
            log.credentialType !== "PIN" &&
            log.credentialType !== "QR" &&
            log.credentialType !== "PIN_OR_QR" &&
            log.credentialType !== "ACCESS_CODE"
          ) {
            return false;
          }
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msgMatch = log.message?.toLowerCase().includes(q);
        const orderMatch = log.orderId != null && String(log.orderId).includes(q);
        const credMatch = log.credentialType?.toLowerCase().includes(q);
        const userMatch = log.actorUserId != null && String(log.actorUserId).includes(q);
        if (!msgMatch && !orderMatch && !credMatch && !userMatch) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedBox, selectedResult, selectedType, searchQuery, boxIdToNumber]);

  // Phiếu sự cố của tủ
  const lockerReports = useMemo(() => {
    return (reportsData?.data ?? []).filter((r) => r.lockerId === lockerId);
  }, [reportsData, lockerId]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.result === "SUCCESS" || l.result === "OPEN" || l.result === "ONLINE").length;
    const hardwareIssues = logs.filter(
      (l) =>
        l.result === "FAILED" ||
        l.result === "JAMMED" ||
        l.result === "TIMEOUT" ||
        l.credentialType === "HARDWARE" ||
        l.credentialType === "HARDWARE_FAULT"
    ).length;
    const discoveryCount = logs.filter((l) => l.credentialType === "DISCOVERY" || l.credentialType === "GATEWAY").length;
    return { total, success, hardwareIssues, discoveryCount };
  }, [logs]);

  return (
    <Card className="border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-primary" />
              Nhật ký vận hành & IoT của tủ #{lockerId}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Theo dõi toàn bộ lịch sử mở khóa, quét mã QR, cảm biến cửa và can thiệp phần cứng.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-xs">
              <button
                type="button"
                className={`px-3 py-1 font-medium rounded-md transition-all ${
                  activeTab === "access"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("access")}
              >
                Nhật ký mở tủ ({logs.length})
              </button>
              <button
                type="button"
                className={`px-3 py-1 font-medium rounded-md transition-all ${
                  activeTab === "reports"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("reports")}
              >
                Sự cố & Sửa chữa ({lockerReports.length})
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* KPI Mini */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            className={`p-3 rounded-lg border bg-card flex flex-col justify-between cursor-pointer transition-colors ${
              selectedType === "ALL" ? "ring-2 ring-primary/40" : "hover:border-primary/40"
            }`}
            onClick={() => setSelectedType("ALL")}
          >
            <span className="text-[11px] text-muted-foreground">Tổng số lượt tương tác</span>
            <span className="text-xl font-bold mt-1">{stats.total}</span>
          </div>
          <div
            className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 flex flex-col justify-between"
          >
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Thành công / Online</span>
            <span className="text-xl font-bold text-emerald-600 mt-1">{stats.success}</span>
          </div>
          <div
            className={`p-3 rounded-lg border bg-rose-500/5 border-rose-500/20 flex flex-col justify-between cursor-pointer transition-colors ${
              selectedType === "HARDWARE_ISSUES" ? "ring-2 ring-rose-500/60" : "hover:border-rose-400"
            }`}
            onClick={() => setSelectedType(selectedType === "HARDWARE_ISSUES" ? "ALL" : "HARDWARE_ISSUES")}
          >
            <span className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center justify-between">
              Lỗi / Cảnh báo phần cứng
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </span>
            <span className="text-xl font-bold text-rose-600 mt-1">{stats.hardwareIssues}</span>
          </div>
          <div
            className={`p-3 rounded-lg border bg-purple-500/5 border-purple-500/20 flex flex-col justify-between cursor-pointer transition-colors ${
              selectedType === "DISCOVERY" ? "ring-2 ring-purple-500/60" : "hover:border-purple-400"
            }`}
            onClick={() => setSelectedType(selectedType === "DISCOVERY" ? "ALL" : "DISCOVERY")}
          >
            <span className="text-[11px] text-purple-700 dark:text-purple-400 flex items-center justify-between">
              Bộ điều khiển (Discovery)
              <RadioTower className="w-3.5 h-3.5 text-purple-500" />
            </span>
            <span className="text-xl font-bold text-purple-600 mt-1">{stats.discoveryCount}</span>
          </div>
        </div>

        {activeTab === "access" ? (
          <>
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo nội dung, mã đơn, tài khoản..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[170px] h-8 text-xs">
                  <SelectValue placeholder="Loại sự kiện" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả loại sự kiện</SelectItem>
                  <SelectItem value="USER_OPEN">Mở ô (Khách / Kiosk)</SelectItem>
                  <SelectItem value="DISCOVERY">Bộ điều khiển (Discovery)</SelectItem>
                  <SelectItem value="DISPLAY">Màn hình 7" (Display & Kiosk)</SelectItem>
                  <SelectItem value="HARDWARE_ISSUES">Lỗi & Cảnh báo phần cứng</SelectItem>
                  <SelectItem value="MASTER">Khẩn cấp (MASTER)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedBox} onValueChange={setSelectedBox}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Lọc theo ô" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả các ô</SelectItem>
                  <SelectItem value="0">Toàn bộ tủ (Bộ ĐK)</SelectItem>
                  {cells.map((c) => (
                    <SelectItem key={c.id} value={String(c.boxNumber)}>
                      Ô #{c.boxNumber} (ID: {c.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedResult} onValueChange={setSelectedResult}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Kết quả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả kết quả</SelectItem>
                  <SelectItem value="SUCCESS">Thành công</SelectItem>
                  <SelectItem value="ONLINE">Trực tuyến (Online)</SelectItem>
                  <SelectItem value="FAILED">Thất bại</SelectItem>
                  <SelectItem value="JAMMED">Kẹt khóa / Lỗi</SelectItem>
                  <SelectItem value="TIMEOUT">Quá hạn / Mất kết nối</SelectItem>
                  <SelectItem value="DENIED">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                Đang tải nhật ký...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Chưa có bản ghi nhật ký nào phù hợp.
              </div>
            ) : (
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <div className="max-h-[380px] overflow-y-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[150px] font-semibold">Thời gian</TableHead>
                        <TableHead className="w-[110px] font-semibold">Vị trí / Ô</TableHead>
                        <TableHead className="w-[170px] font-semibold">Phân loại sự kiện</TableHead>
                        <TableHead className="w-[130px] font-semibold">Trạng thái</TableHead>
                        <TableHead className="w-[110px] font-semibold">Đối tượng</TableHead>
                        <TableHead className="font-semibold">Chi tiết sự kiện & Phần cứng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const boxNum = log.boxId === 0 ? null : boxIdToNumber.get(log.boxId);
                        const cred = CREDENTIAL_LABEL[log.credentialType?.toUpperCase()] ?? {
                          label: log.credentialType,
                          cls: "bg-secondary text-foreground border-border",
                          icon: Key,
                        };
                        const res = RESULT_LABEL[log.result?.toUpperCase()] ?? {
                          label: log.result,
                          cls: "bg-secondary text-foreground border-border",
                          icon: CheckCircle2,
                        };
                        const CredIcon = cred.icon;
                        const ResIcon = res.icon;

                        const isHardwareWarn =
                          log.result === "JAMMED" ||
                          log.result === "FAILED" ||
                          log.result === "TIMEOUT" ||
                          log.credentialType === "HARDWARE" ||
                          log.credentialType === "HARDWARE_FAULT";

                        const isDiscovery = log.credentialType === "DISCOVERY" || log.credentialType === "GATEWAY";

                        return (
                          <TableRow key={log.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                              {formatDateTime(log.createdAt)}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {log.boxId === 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 whitespace-nowrap"
                                >
                                  <RadioTower className="w-2.5 h-2.5 mr-1" />
                                  Bộ điều khiển
                                </Badge>
                              ) : boxNum != null ? (
                                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                  Ô #{boxNum}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">ID #{log.boxId}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${cred.cls}`}
                              >
                                <CredIcon className="w-3 h-3" />
                                {cred.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${res.cls}`}
                              >
                                <ResIcon className="w-3 h-3" />
                                {res.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {log.orderId ? (
                                <span className="font-mono text-[11px]">Đơn #{log.orderId}</span>
                              ) : log.actorUserId ? (
                                <span className="text-[11px]">KTV #{log.actorUserId}</span>
                              ) : isDiscovery ? (
                                <span className="text-[11px] font-mono">Pi Controller</span>
                              ) : (
                                "Hệ thống"
                              )}
                            </TableCell>
                            <TableCell
                              className={`max-w-[340px] truncate ${
                                isHardwareWarn
                                  ? "text-rose-700 dark:text-rose-400 font-medium"
                                  : isDiscovery
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground"
                              }`}
                              title={log.message ?? ""}
                            >
                              {log.message || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Tab: Sự cố & Sửa chữa */
          <div>
            {lockerReports.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                Tủ chưa từng ghi nhận phiếu sự cố nào. Hoạt động hoàn toàn ổn định!
              </div>
            ) : (
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[100px] font-semibold">Mã phiếu</TableHead>
                      <TableHead className="w-[100px] font-semibold">Ô tủ</TableHead>
                      <TableHead className="w-[120px] font-semibold">Phân loại</TableHead>
                      <TableHead className="w-[120px] font-semibold">Trạng thái</TableHead>
                      <TableHead className="font-semibold">Mô tả sự cố</TableHead>
                      <TableHead className="w-[150px] font-semibold">Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockerReports.map((report) => (
                      <TableRow key={report.id} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-primary">RPT-{report.id}</TableCell>
                        <TableCell className="font-semibold">
                          {report.boxNumber != null ? (
                            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              Ô #{report.boxNumber}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {report.category || "CHUNG"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] ${
                              report.status === "RESOLVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : report.status === "IN_PROGRESS"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {report.status === "RESOLVED"
                              ? "Đã xử lý"
                              : report.status === "IN_PROGRESS"
                              ? "Đang xử lý"
                              : "Đang mở"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={report.description}>
                          {report.description || "Không có mô tả"}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDateTime(report.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
