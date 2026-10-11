import { useMemo, useState } from "react";
import { AlertTriangle, Cpu, Loader2, RadioTower, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import i18n from "~/utils/i18n";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ConfirmActionDialog } from "~/pages/Admin/knowledge/ConfirmActionDialog";
import { formatDateTime } from "~/lib/datetime";
import {
  type GatewayDeviceResponse,
  useAssignGatewayMutation,
  useGetGatewaysQuery,
  useRediscoverGatewayMutation,
  useUnassignGatewayMutation,
} from "~/stores/apis/admin/lockerOps";

// Trạng thái lệnh setup gửi tới Pi — iot-service GatewayDevice.setupStatus (ADR-0008).
const SETUP_STATUS: Record<string, { labelKey: string; cls: string }> = {
  NONE: { labelKey: "admin.lockers.gateway.setupStatus.none", cls: "bg-secondary border-border text-muted-foreground" },
  PENDING: { labelKey: "admin.lockers.gateway.setupStatus.pending", cls: "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400" },
  RUNNING: { labelKey: "admin.lockers.gateway.setupStatus.running", cls: "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400" },
  COMPLETED: { labelKey: "admin.lockers.gateway.setupStatus.completed", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  PARTIAL: { labelKey: "admin.lockers.gateway.setupStatus.partial", cls: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" },
  FAILED: { labelKey: "admin.lockers.gateway.setupStatus.failed", cls: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400" },
  CLEARED: { labelKey: "admin.lockers.gateway.setupStatus.cleared", cls: "bg-secondary border-border text-muted-foreground" },
};

const HARDWARE_LABEL: Record<string, string> = {
  gpio: "GPIO",
  rs485: "Arduino RS485",
  get simulation() {
    return i18n.t("admin.lockers.hardware.simulation");
  },
};

function apiError(err: unknown, fallback: string): string {
  const e = err as { data?: { message?: string }; message?: string } | undefined;
  return e?.data?.message || e?.message || fallback;
}

function gatewayLabel(g: GatewayDeviceResponse, t: TFunction): string {
  const parts = [g.macAddress, g.online ? "online" : t("admin.lockers.gateway.option.offline")];
  if (g.hardware) parts.push(HARDWARE_LABEL[g.hardware] ?? g.hardware);
  if (g.availableSlots != null) parts.push(t("admin.lockers.table.boxCount", { count: g.availableSlots }));
  if (g.reportedLockerId != null) parts.push(t("admin.lockers.gateway.option.reportingLocker", { id: g.reportedLockerId }));
  return parts.join(" · ");
}

interface GatewayPanelProps {
  lockerId: number;
  /** Số ô lớn nhất trên admin — slotIndex = boxNumber − 1 phải nằm trong số ô phần cứng. */
  highestBoxNumber: number;
  cellCount: number;
}

/**
 * Bộ điều khiển tủ (Raspberry Pi): gán Pi vào tủ để app/kiosk mở được ô thật.
 * Pi tự báo qua MQTT; gán ⇒ iot-service gửi sơ đồ ô, Pi (tuỳ chọn) mở thử từng ô.
 */
export function GatewayPanel({ lockerId, highestBoxNumber, cellCount }: GatewayPanelProps) {
  const { t } = useTranslation();
  // Poll 5 s: thấy Pi online/mất kết nối và tiến độ thử từng ô gần như ngay (danh sách rất nhỏ).
  const { data, isLoading, refetch, isFetching } = useGetGatewaysQuery(undefined, { pollingInterval: 5000 });
  const gateways = useMemo(() => data?.data ?? [], [data]);
  const current = gateways.find((g) => g.lockerId === lockerId) ?? null;
  const free = gateways.filter((g) => g.lockerId == null);

  const busy = current != null && (current.setupStatus === "PENDING" || current.setupStatus === "RUNNING");

  const [choice, setChoice] = useState<string>("");
  const [assignTarget, setAssignTarget] = useState<GatewayDeviceResponse | null>(null);
  const [testDoors, setTestDoors] = useState(true);
  const [confirmUnassign, setConfirmUnassign] = useState(false);

  const [assignGateway, { isLoading: assigning }] = useAssignGatewayMutation();
  const [unassignGateway, { isLoading: unassigning }] = useUnassignGatewayMutation();
  const [rediscoverGateway, { isLoading: rediscovering }] = useRediscoverGatewayMutation();

  const openAssign = (g: GatewayDeviceResponse | undefined) => {
    if (!g) return;
    setTestDoors(true);
    setAssignTarget(g);
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    try {
      await assignGateway({ gatewayId: assignTarget.id, lockerId, testDoors }).unwrap();
      toast.success(t("admin.lockers.gateway.toast.assigned"), {
        description: testDoors ? t("admin.lockers.gateway.toast.assignedTesting") : t("admin.lockers.gateway.toast.assignedNoTest"),
      });
      setAssignTarget(null);
      setChoice("");
    } catch (err) {
      toast.error(t("admin.lockers.gateway.toast.assignFailed"), { description: apiError(err, t("common.pleaseRetry")) });
    }
  };

  const handleUnassign = async () => {
    if (!current) return;
    try {
      await unassignGateway(current.id).unwrap();
      toast.success(t("admin.lockers.gateway.toast.unassigned"));
      setConfirmUnassign(false);
    } catch (err) {
      toast.error(t("admin.lockers.gateway.toast.unassignFailed"), { description: apiError(err, t("common.pleaseRetry")) });
    }
  };

  const handleRediscover = async (g: GatewayDeviceResponse) => {
    try {
      await rediscoverGateway(g.id).unwrap();
      toast.success(t("admin.lockers.gateway.toast.rediscovered"));
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      toast.error(t("admin.lockers.gateway.toast.rediscoverFailed"), { description: apiError(err, t("common.pleaseRetry")) });
    }
  };

  const status = current ? (SETUP_STATUS[current.setupStatus] ?? SETUP_STATUS.NONE) : null;
  const failedSlots = current?.setupResult?.lockers?.filter((l) => l.testResult !== "OK") ?? [];
  const tooManyBoxes = (g: GatewayDeviceResponse | null) =>
    g?.availableSlots != null && highestBoxNumber > g.availableSlots;

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("admin.lockers.gateway.title")}</p>
              {isLoading ? (
                <p className="text-xs text-muted-foreground mt-0.5">{t("common.loadingEllipsis")}</p>
              ) : current ? (
                <div className="mt-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-foreground">{current.macAddress}</span>
                    <Badge
                      variant="outline"
                      className={
                        current.online
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
                      }
                    >
                      <RadioTower className="w-3 h-3 mr-1" />
                      {current.online ? "Online" : t("common.disconnected")}
                    </Badge>
                    {status && (
                      <Badge variant="outline" className={status.cls}>
                        {busy && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {t(status.labelKey)}
                        {current.setupProgress ? ` · ${current.setupProgress}` : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[
                      current.hardware ? HARDWARE_LABEL[current.hardware] ?? current.hardware : null,
                      current.availableSlots != null ? t("admin.lockers.gateway.hardwareSlots", { count: current.availableSlots }) : null,
                      current.firmwareVersion ? `firmware ${current.firmwareVersion}` : null,
                      current.lastSeenAt ? t("admin.lockers.gateway.lastSeen", { time: formatDateTime(current.lastSeenAt) }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("admin.lockers.gateway.notAttached")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {current ? (
              <>
                <Button size="sm" variant="outline" className="h-9" onClick={() => openAssign(current)} disabled={busy}>
                  <RefreshCw className="w-4 h-4 mr-1.5" /> {t("admin.lockers.gateway.resend")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => handleRediscover(current)}
                  disabled={rediscovering}
                >
                  {t("admin.lockers.gateway.rediscover")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-rose-600 hover:text-rose-700"
                  onClick={() => setConfirmUnassign(true)}
                >
                  <Unplug className="w-4 h-4 mr-1.5" /> {t("admin.lockers.gateway.unassign")}
                </Button>
              </>
            ) : (
              <>
                <Select value={choice} onValueChange={setChoice} disabled={free.length === 0}>
                  <SelectTrigger className="w-full md:w-96 h-9 text-xs">
                    <SelectValue placeholder={free.length ? t("admin.lockers.gateway.selectPlaceholder") : t("admin.lockers.gateway.noneReported")} />
                  </SelectTrigger>
                  <SelectContent>
                    {free.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {gatewayLabel(g, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9"
                  disabled={!choice}
                  onClick={() => openAssign(free.find((g) => String(g.id) === choice))}
                >
                  {t("admin.lockers.gateway.assign")}
                </Button>
                <Button size="sm" variant="ghost" className="h-9" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                </Button>
              </>
            )}
          </div>
        </div>

        {!isLoading && !current && free.length === 0 && (
          <p className="text-xs text-muted-foreground">
            <Trans i18nKey="admin.lockers.gateway.noPiHint" components={{ code: <code /> }} />
          </p>
        )}

        {current && current.reportedLockerId != null && current.reportedLockerId !== lockerId && !busy && (
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {t("admin.lockers.gateway.wrongLocker", { reported: current.reportedLockerId, id: lockerId })}
            </span>
          </div>
        )}

        {tooManyBoxes(current) && (
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {t("admin.lockers.gateway.tooManyBoxes", { highest: highestBoxNumber, slots: current?.availableSlots })}
            </span>
          </div>
        )}

        {current?.setupResult?.errorMessage && (
          <p className="text-xs text-red-700 dark:text-red-400">{current.setupResult.errorMessage}</p>
        )}

        {failedSlots.length > 0 && (
          <div className="text-xs border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-muted/40 font-medium">{t("admin.lockers.gateway.failedSlots")}</div>
            <ul className="divide-y divide-border">
              {failedSlots.map((l) => (
                <li key={l.slotIndex} className="px-3 py-1.5 flex flex-wrap gap-x-3">
                  <span className="font-semibold">{t("admin.lockers.gateway.slot", { number: l.slotIndex + 1 })}</span>
                  <span className="text-muted-foreground">{l.errorCode ?? l.testResult}</span>
                  {l.errorMessage && <span className="text-muted-foreground">{l.errorMessage}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <Dialog open={assignTarget != null} onOpenChange={(open) => !assigning && !open && setAssignTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.lockers.gateway.assignTitle", { id: lockerId })}</DialogTitle>
            <DialogDescription>
              {t("admin.lockers.gateway.assignDesc", { mac: assignTarget?.macAddress ?? "", count: cellCount })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox id="gateway-test-doors" checked={testDoors} onCheckedChange={(v) => setTestDoors(v === true)} />
              <div className="space-y-1">
                <Label htmlFor="gateway-test-doors" className="text-sm">
                  {t("admin.lockers.gateway.testDoors")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("admin.lockers.gateway.testDoorsHint")}
                </p>
              </div>
            </div>
            {tooManyBoxes(assignTarget) && (
              <p className="text-xs text-red-700 dark:text-red-400">
                {t("admin.lockers.gateway.tooManyBoxesDevice", { highest: highestBoxNumber, slots: assignTarget?.availableSlots })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)} disabled={assigning}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {t("admin.lockers.gateway.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmUnassign}
        onOpenChange={setConfirmUnassign}
        title={t("admin.lockers.gateway.unassignTitle")}
        description={
          <p>{t("admin.lockers.gateway.unassignDesc", { mac: current?.macAddress ?? "", id: lockerId })}</p>
        }
        actionLabel={t("admin.lockers.gateway.unassign")}
        destructive
        loading={unassigning}
        onConfirm={handleUnassign}
      />
    </Card>
  );
}
