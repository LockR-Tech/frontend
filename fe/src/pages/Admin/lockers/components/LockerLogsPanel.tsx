import { useState, useMemo } from "react";
import {
  History,
  Key,
  QrCode,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Wrench,
  RadioTower,
  Cpu,
  Clock,
  Monitor,
  Unplug,
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
  type GatewayDeviceResponse,
} from "~/stores/apis/admin/lockerOps";
import { formatDateTime } from "~/lib/datetime";
import { useTranslation } from "react-i18next";
import i18n from "~/utils/i18n";

const HARDWARE_LABEL: Record<string, string> = {
  gpio: "GPIO",
  rs485: "Arduino RS485",
  get simulation() {
    return i18n.t("admin.lockers.hardware.simulation");
  },
};

interface LockerLogsPanelProps {
  lockerId: number;
  lockerCode?: string;
  cells: CellResponse[];
  gateway?: GatewayDeviceResponse | null;
}

const CREDENTIAL_LABEL: Record<string, { labelKey: string; cls: string; icon: any }> = {
  PIN: { labelKey: "admin.lockers.logs.credential.pin", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300", icon: Key },
  QR: { labelKey: "admin.lockers.logs.credential.qr", cls: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300", icon: QrCode },
  PIN_OR_QR: { labelKey: "admin.lockers.logs.credential.pinOrQr", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300", icon: Key },
  ACCESS_CODE: { labelKey: "admin.lockers.logs.credential.accessCode", cls: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300", icon: Key },
  MASTER: { labelKey: "admin.lockers.logs.credential.master", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300", icon: ShieldAlert },
  DISCOVERY: { labelKey: "admin.lockers.logs.credential.discovery", cls: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300", icon: RadioTower },
  DISPLAY: { labelKey: "admin.lockers.logs.credential.display", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-300", icon: Monitor },
  HARDWARE: { labelKey: "admin.lockers.logs.credential.hardware", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300", icon: AlertTriangle },
  HARDWARE_FAULT: { labelKey: "admin.lockers.logs.credential.hardwareFault", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300", icon: AlertTriangle },
  SETUP: { labelKey: "admin.lockers.logs.credential.setup", cls: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-300", icon: Wrench },
  GATEWAY: { labelKey: "admin.lockers.logs.credential.gateway", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300", icon: RadioTower },
  SENSOR: { labelKey: "admin.lockers.logs.credential.sensor", cls: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-300", icon: Cpu },
};

const RESULT_LABEL: Record<string, { labelKey: string; cls: string; icon: any }> = {
  ONLINE: { labelKey: "admin.lockers.logs.result.online", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/50", icon: RadioTower },
  OFFLINE: { labelKey: "admin.lockers.logs.result.offline", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/50", icon: Unplug },
  SUCCESS: { labelKey: "common.success", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300", icon: CheckCircle2 },
  OPEN: { labelKey: "admin.lockers.cell.doorOpen", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300", icon: CheckCircle2 },
  CLOSED: { labelKey: "admin.lockers.logs.result.closed", cls: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300", icon: CheckCircle2 },
  FAILED: { labelKey: "common.failed", cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300", icon: XCircle },
  TIMEOUT: { labelKey: "admin.lockers.logs.result.timeout", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300", icon: Clock },
  JAMMED: { labelKey: "admin.lockers.logs.result.jammed", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300", icon: AlertTriangle },
  DENIED: { labelKey: "admin.lockers.logs.result.denied", cls: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300", icon: XCircle },
  RESTART_REQUESTED: { labelKey: "admin.lockers.logs.result.restartRequested", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300", icon: RefreshCw },
};

export function LockerLogsPanel({ lockerId, lockerCode, cells, gateway: propGateway }: LockerLogsPanelProps) {
  const { t } = useTranslation();
  const lockerLabel = lockerCode || `#${lockerId}`;
  const { data, isLoading, isFetching, refetch } = useGetLockerAccessLogsQuery(lockerId, {
    pollingInterval: 10000,
  });

  const { data: gatewaysData, refetch: refetchGateways } = useGetGatewaysQuery(undefined, { pollingInterval: 5000 });
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

  // Chỉ hiển thị nhật ký server ghi (iot-service đã tự ghi các lần bộ điều khiển online/offline)
  const logs = useMemo(() => {
    const serverLogs = [...(data?.data ?? [])];
    // Sắp xếp giảm dần theo thời gian (mới nhất lên đầu)
    return serverLogs.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  }, [data]);

  // Thông tin bộ điều khiển: thiếu thì để "—", không tự điền giá trị mặc định
  const gatewayHardware = gateway?.hardware
    ? (HARDWARE_LABEL[gateway.hardware.toLowerCase()] ?? gateway.hardware.toUpperCase())
    : "—";
  const gatewaySlots = gateway?.availableSlots != null ? t("admin.lockers.table.boxCount", { count: gateway.availableSlots }) : t("admin.lockers.logs.slotsUnknown");
  const gatewayFirmware = gateway?.firmwareVersion || "—";

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
        if (selectedBox !== "0" && boxNum !== Number(selectedBox)) return false;
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
    const onlineCount = logs.filter((l) => l.result === "ONLINE").length;
    const offlineCount = logs.filter((l) => l.result === "OFFLINE").length;
    const hardwareIssues = logs.filter(
      (l) =>
        l.result === "FAILED" ||
        l.result === "JAMMED" ||
        l.result === "TIMEOUT" ||
        l.credentialType === "HARDWARE" ||
        l.credentialType === "HARDWARE_FAULT"
    ).length;
    const discoveryCount = logs.filter((l) => l.credentialType === "DISCOVERY" || l.credentialType === "GATEWAY").length;
    return { total, onlineCount, offlineCount, hardwareIssues, discoveryCount };
  }, [logs]);

  const handleRefresh = () => {
    refetch();
    refetchGateways();
  };

  return (
    <Card className="border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-primary" />
              {t("admin.lockers.logs.title", { locker: lockerLabel })}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {t("admin.lockers.logs.description")}
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
                {t("admin.lockers.logs.tabAccess", { count: logs.length })}
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
                {t("admin.lockers.logs.tabReports", { count: lockerReports.length })}
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              {t("button.refresh")}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* KPI Mini */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            className={`p-3 rounded-lg border bg-card flex flex-col justify-between cursor-pointer transition-colors ${
              selectedType === "ALL" && selectedResult === "ALL" ? "ring-2 ring-primary/40 shadow-xs" : "hover:border-primary/40"
            }`}
            onClick={() => {
              setSelectedType("ALL");
              setSelectedResult("ALL");
            }}
          >
            <span className="text-[11px] text-muted-foreground">{t("admin.lockers.logs.totalEntries")}</span>
            <span className="text-xl font-bold mt-1">{stats.total}</span>
          </div>

          <div
            className={`p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 flex flex-col justify-between cursor-pointer transition-colors ${
              selectedResult === "ONLINE" ? "ring-2 ring-emerald-500/60 shadow-xs" : "hover:border-emerald-400"
            }`}
            onClick={() => setSelectedResult(selectedResult === "ONLINE" ? "ALL" : "ONLINE")}
          >
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              {t("admin.lockers.logs.result.online")}
              <RadioTower className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <span className="text-xl font-bold text-emerald-600 mt-1">{stats.onlineCount}</span>
          </div>

          <div
            className={`p-3 rounded-lg border bg-rose-500/5 border-rose-500/20 flex flex-col justify-between cursor-pointer transition-colors ${
              selectedResult === "OFFLINE" ? "ring-2 ring-rose-500/60 shadow-xs" : "hover:border-rose-400"
            }`}
            onClick={() => setSelectedResult(selectedResult === "OFFLINE" ? "ALL" : "OFFLINE")}
          >
            <span className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center justify-between">
              {t("admin.lockers.logs.result.offline")}
              <Unplug className="w-3.5 h-3.5 text-rose-500" />
            </span>
            <span className="text-xl font-bold text-rose-600 mt-1">{stats.offlineCount}</span>
          </div>

          <div
            className={`p-3 rounded-lg border bg-amber-500/5 border-amber-500/20 flex flex-col justify-between cursor-pointer transition-colors ${
              selectedType === "HARDWARE_ISSUES" ? "ring-2 ring-amber-500/60 shadow-xs" : "hover:border-amber-400"
            }`}
            onClick={() => setSelectedType(selectedType === "HARDWARE_ISSUES" ? "ALL" : "HARDWARE_ISSUES")}
          >
            <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center justify-between">
              {t("admin.lockers.logs.hardwareIssues")}
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <span className="text-xl font-bold text-amber-600 mt-1">{stats.hardwareIssues}</span>
          </div>
        </div>

        {/* Banner trạng thái kết nối nguồn điện & IoT trực tiếp */}
        {gateway && (
          <div
            className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors ${
              gateway.online
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {gateway.online ? (
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
              <div>
                <span className="font-bold mr-1.5">
                  {gateway.online
                    ? t("admin.lockers.logs.banner.online", { locker: lockerLabel })
                    : t("admin.lockers.logs.banner.offline", { locker: lockerLabel })}
                </span>
                <span className="text-muted-foreground dark:text-muted-foreground/80">
                  {gateway.online
                    ? t("admin.lockers.logs.banner.onlineDetail", {
                        hardware: gatewayHardware,
                        slots: gatewaySlots,
                        firmware: gatewayFirmware,
                        time: formatDateTime(gateway.lastSeenAt),
                      })
                    : t("admin.lockers.logs.banner.offlineDetail", { time: formatDateTime(gateway.lastSeenAt) })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  gateway.online
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                    : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400"
                }`}
              >
                {gateway.online ? t("admin.lockers.logs.result.online") : t("admin.lockers.logs.result.offline")}
              </Badge>
            </div>
          </div>
        )}

        {activeTab === "access" ? (
          <>
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("admin.lockers.logs.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder={t("admin.lockers.logs.filter.eventType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("admin.lockers.logs.filter.allEventTypes")}</SelectItem>
                  <SelectItem value="DISCOVERY">{t("admin.lockers.logs.filter.discovery")}</SelectItem>
                  <SelectItem value="DISPLAY">{t("admin.lockers.logs.filter.display")}</SelectItem>
                  <SelectItem value="USER_OPEN">{t("admin.lockers.logs.filter.userOpen")}</SelectItem>
                  <SelectItem value="HARDWARE_ISSUES">{t("admin.lockers.logs.hardwareIssues")}</SelectItem>
                  <SelectItem value="MASTER">{t("admin.lockers.logs.credential.master")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedBox} onValueChange={setSelectedBox}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder={t("admin.lockers.logs.filter.box")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("admin.lockers.logs.filter.allBoxes")}</SelectItem>
                  <SelectItem value="0">{t("admin.lockers.logs.filter.wholeLocker")}</SelectItem>
                  {cells.map((c) => (
                    <SelectItem key={c.id} value={String(c.boxNumber)}>
                      {t("admin.lockers.logs.filter.boxOption", { number: c.boxNumber, id: c.id })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedResult} onValueChange={setSelectedResult}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder={t("admin.lockers.logs.filter.result")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("admin.lockers.logs.filter.allResults")}</SelectItem>
                  <SelectItem value="ONLINE">{t("admin.lockers.logs.result.online")}</SelectItem>
                  <SelectItem value="OFFLINE">{t("admin.lockers.logs.result.offline")}</SelectItem>
                  <SelectItem value="SUCCESS">{t("common.success")}</SelectItem>
                  <SelectItem value="FAILED">{t("common.failed")}</SelectItem>
                  <SelectItem value="JAMMED">{t("admin.lockers.logs.filter.jammed")}</SelectItem>
                  <SelectItem value="TIMEOUT">{t("admin.lockers.logs.result.timeout")}</SelectItem>
                  <SelectItem value="DENIED">{t("admin.lockers.logs.result.denied")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                {t("admin.lockers.logs.loading")}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t("admin.lockers.logs.empty")}
              </div>
            ) : (
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <div className="max-h-[380px] overflow-y-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[150px] font-semibold">{t("common.time")}</TableHead>
                        <TableHead className="w-[110px] font-semibold">{t("admin.lockers.logs.col.location")}</TableHead>
                        <TableHead className="w-[170px] font-semibold">{t("admin.lockers.logs.col.eventType")}</TableHead>
                        <TableHead className="w-[150px] font-semibold">{t("common.status")}</TableHead>
                        <TableHead className="w-[110px] font-semibold">{t("admin.lockers.logs.col.actor")}</TableHead>
                        <TableHead className="font-semibold">{t("admin.lockers.logs.col.details")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log, index) => {
                        const boxNum = log.boxId === 0 ? null : boxIdToNumber.get(log.boxId);
                        const credMeta = CREDENTIAL_LABEL[log.credentialType?.toUpperCase()];
                        const cred = credMeta
                          ? { ...credMeta, label: t(credMeta.labelKey) }
                          : {
                              label: log.credentialType,
                              cls: "bg-secondary text-foreground border-border",
                              icon: Key,
                            };
                        const resMeta = RESULT_LABEL[log.result?.toUpperCase()];
                        const res = resMeta
                          ? { ...resMeta, label: t(resMeta.labelKey) }
                          : {
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

                        const isOffline = log.result?.toUpperCase() === "OFFLINE";
                        const isOnline = log.result?.toUpperCase() === "ONLINE";
                        const isDiscovery = log.credentialType === "DISCOVERY" || log.credentialType === "GATEWAY";
                        const isDisplay = log.credentialType === "DISPLAY";

                        return (
                          <TableRow key={`${log.id}-${index}`} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                              {formatDateTime(log.createdAt)}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {log.boxId === 0 ? (
                                isDisplay ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 whitespace-nowrap"
                                  >
                                    <Monitor className="w-2.5 h-2.5 mr-1" />
                                    {t("admin.lockers.logs.kioskScreen")}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 whitespace-nowrap"
                                  >
                                    <RadioTower className="w-2.5 h-2.5 mr-1" />
                                    {t("admin.lockers.logs.controller")}
                                  </Badge>
                                )
                              ) : boxNum != null ? (
                                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                  {t("admin.lockers.boxLabel", { number: boxNum })}
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
                                <span className="font-mono text-[11px]">{t("admin.lockers.logs.orderRef", { id: log.orderId })}</span>
                              ) : log.actorUserId ? (
                                <span className="text-[11px]">{t("admin.lockers.table.technicianId", { id: log.actorUserId })}</span>
                              ) : isDisplay ? (
                                <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400">Waveshare 7"</span>
                              ) : isDiscovery ? (
                                <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400">Pi Controller</span>
                              ) : (
                                t("common.system")
                              )}
                            </TableCell>
                            <TableCell
                              className={`max-w-[380px] truncate ${
                                isOffline
                                  ? "text-rose-700 dark:text-rose-400 font-semibold"
                                  : isOnline
                                  ? "text-emerald-800 dark:text-emerald-300 font-medium"
                                  : isHardwareWarn
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
                {t("admin.lockers.logs.noReports")}
              </div>
            ) : (
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[100px] font-semibold">{t("admin.lockers.logs.reports.id")}</TableHead>
                      <TableHead className="w-[100px] font-semibold">{t("admin.lockers.logs.reports.box")}</TableHead>
                      <TableHead className="w-[120px] font-semibold">{t("admin.lockers.logs.reports.category")}</TableHead>
                      <TableHead className="w-[120px] font-semibold">{t("common.status")}</TableHead>
                      <TableHead className="font-semibold">{t("admin.lockers.logs.reports.description")}</TableHead>
                      <TableHead className="w-[150px] font-semibold">{t("common.time")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockerReports.map((report) => (
                      <TableRow key={report.id} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-primary">RPT-{report.id}</TableCell>
                        <TableCell className="font-semibold">
                          {report.boxNumber != null ? (
                            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              {t("admin.lockers.boxLabel", { number: report.boxNumber })}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {report.category || t("admin.lockers.logs.reports.categoryGeneral")}
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
                              ? t("admin.lockers.logs.reports.resolved")
                              : report.status === "IN_PROGRESS"
                              ? t("admin.lockers.logs.reports.inProgress")
                              : t("admin.lockers.logs.reports.open")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={report.description}>
                          {report.description || t("admin.lockers.logs.reports.noDescription")}
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
