import { useMemo, useState } from "react";
import { AlertTriangle, Cpu, Loader2, RadioTower, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
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
const SETUP_STATUS: Record<string, { label: string; cls: string }> = {
  NONE: { label: "Chưa setup", cls: "bg-secondary border-border text-muted-foreground" },
  PENDING: { label: "Đã gửi lệnh, chờ Pi", cls: "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400" },
  RUNNING: { label: "Pi đang thử từng ô", cls: "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400" },
  COMPLETED: { label: "Sẵn sàng", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  PARTIAL: { label: "Một số ô lỗi", cls: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" },
  FAILED: { label: "Setup lỗi", cls: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400" },
  CLEARED: { label: "Đã gỡ", cls: "bg-secondary border-border text-muted-foreground" },
};

const HARDWARE_LABEL: Record<string, string> = {
  gpio: "GPIO",
  rs485: "Arduino RS485",
  simulation: "Giả lập",
};

function apiError(err: unknown, fallback: string): string {
  const e = err as { data?: { message?: string }; message?: string } | undefined;
  return e?.data?.message || e?.message || fallback;
}

function gatewayLabel(g: GatewayDeviceResponse): string {
  const parts = [g.macAddress, g.online ? "online" : "mất kết nối"];
  if (g.hardware) parts.push(HARDWARE_LABEL[g.hardware] ?? g.hardware);
  if (g.availableSlots != null) parts.push(`${g.availableSlots} ô`);
  if (g.reportedLockerId != null) parts.push(`đang báo tủ #${g.reportedLockerId}`);
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
      toast.success("Đã gửi sơ đồ ô tới bộ điều khiển", {
        description: testDoors ? "Pi đang mở thử lần lượt từng ô." : "Pi chỉ lưu sơ đồ, không mở ô nào.",
      });
      setAssignTarget(null);
      setChoice("");
    } catch (err) {
      toast.error("Không gán được bộ điều khiển", { description: apiError(err, "Vui lòng thử lại.") });
    }
  };

  const handleUnassign = async () => {
    if (!current) return;
    try {
      await unassignGateway(current.id).unwrap();
      toast.success("Đã gỡ bộ điều khiển khỏi tủ");
      setConfirmUnassign(false);
    } catch (err) {
      toast.error("Không gỡ được", { description: apiError(err, "Vui lòng thử lại.") });
    }
  };

  const handleRediscover = async (g: GatewayDeviceResponse) => {
    try {
      await rediscoverGateway(g.id).unwrap();
      toast.success("Đã yêu cầu Pi báo lại");
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      toast.error("Không gửi được yêu cầu", { description: apiError(err, "Vui lòng thử lại.") });
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
              <p className="text-sm font-semibold">Bộ điều khiển tủ</p>
              {isLoading ? (
                <p className="text-xs text-muted-foreground mt-0.5">Đang tải…</p>
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
                      {current.online ? "Online" : "Mất kết nối"}
                    </Badge>
                    {status && (
                      <Badge variant="outline" className={status.cls}>
                        {busy && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {status.label}
                        {current.setupProgress ? ` · ${current.setupProgress}` : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[
                      current.hardware ? HARDWARE_LABEL[current.hardware] ?? current.hardware : null,
                      current.availableSlots != null ? `${current.availableSlots} ô phần cứng` : null,
                      current.firmwareVersion ? `firmware ${current.firmwareVersion}` : null,
                      current.lastSeenAt ? `thấy lần cuối ${formatDateTime(current.lastSeenAt)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chưa gắn bộ điều khiển — app và kiosk chưa mở được ô thật của tủ này.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {current ? (
              <>
                <Button size="sm" variant="outline" className="h-9" onClick={() => openAssign(current)} disabled={busy}>
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Gửi lại sơ đồ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => handleRediscover(current)}
                  disabled={rediscovering}
                >
                  Yêu cầu báo lại
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-rose-600 hover:text-rose-700"
                  onClick={() => setConfirmUnassign(true)}
                >
                  <Unplug className="w-4 h-4 mr-1.5" /> Gỡ
                </Button>
              </>
            ) : (
              <>
                <Select value={choice} onValueChange={setChoice} disabled={free.length === 0}>
                  <SelectTrigger className="w-full md:w-96 h-9 text-xs">
                    <SelectValue placeholder={free.length ? "Chọn bộ điều khiển đã báo về" : "Chưa có Pi nào báo về"} />
                  </SelectTrigger>
                  <SelectContent>
                    {free.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {gatewayLabel(g)}
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
                  Gán vào tủ
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
            Pi tự báo về khi <code>main.py</code> chạy và kết nối được broker MQTT. Không thấy Pi thì kiểm tra dịch vụ{" "}
            <code>lockr-controller</code> trên Pi và tài khoản MQTT của nó.
          </p>
        )}

        {current && current.reportedLockerId != null && current.reportedLockerId !== lockerId && !busy && (
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Pi đang báo phục vụ tủ #{current.reportedLockerId}, không phải tủ này. Bấm “Gửi lại sơ đồ”; nếu vẫn vậy,
              kiểm tra tài khoản MQTT của Pi có quyền trên tủ #{lockerId}.
            </span>
          </div>
        )}

        {tooManyBoxes(current) && (
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Tủ có ô số {highestBoxNumber} nhưng bộ điều khiển chỉ có {current?.availableSlots} ô — ô vượt quá sẽ không mở
              được.
            </span>
          </div>
        )}

        {current?.setupResult?.errorMessage && (
          <p className="text-xs text-red-700 dark:text-red-400">{current.setupResult.errorMessage}</p>
        )}

        {failedSlots.length > 0 && (
          <div className="text-xs border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-muted/40 font-medium">Ô thử không đạt</div>
            <ul className="divide-y divide-border">
              {failedSlots.map((l) => (
                <li key={l.slotIndex} className="px-3 py-1.5 flex flex-wrap gap-x-3">
                  <span className="font-semibold">Ô {l.slotIndex + 1}</span>
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
            <DialogTitle>Gán bộ điều khiển vào tủ #{lockerId}</DialogTitle>
            <DialogDescription>
              {assignTarget?.macAddress} sẽ nhận sơ đồ {cellCount} ô: ô số N trên admin điều khiển khoá thứ N (relay IN
              N) của Pi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox id="gateway-test-doors" checked={testDoors} onCheckedChange={(v) => setTestDoors(v === true)} />
              <div className="space-y-1">
                <Label htmlFor="gateway-test-doors" className="text-sm">
                  Mở thử lần lượt từng ô
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mọi cửa sẽ bật ra lần lượt để kiểm khoá và cảm biến — chỉ làm khi tủ trống và có người đứng cạnh. Bỏ chọn
                  nếu tủ đang có hàng: Pi chỉ lưu sơ đồ.
                </p>
              </div>
            </div>
            {tooManyBoxes(assignTarget) && (
              <p className="text-xs text-red-700 dark:text-red-400">
                Tủ có ô số {highestBoxNumber} nhưng thiết bị chỉ có {assignTarget?.availableSlots} ô — iot-service sẽ từ
                chối.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)} disabled={assigning}>
              Huỷ
            </Button>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Gửi sơ đồ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmUnassign}
        onOpenChange={setConfirmUnassign}
        title="Gỡ bộ điều khiển khỏi tủ?"
        description={
          <p>
            Pi {current?.macAddress} sẽ xoá sơ đồ ô và thôi nhận lệnh của tủ #{lockerId}. App và kiosk sẽ không mở được ô
            thật cho tới khi gán lại.
          </p>
        }
        actionLabel="Gỡ"
        destructive
        loading={unassigning}
        onConfirm={handleUnassign}
      />
    </Card>
  );
}
