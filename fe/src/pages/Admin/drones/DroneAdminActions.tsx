import { useState, type ReactNode } from "react";
import { BatteryCharging, Loader2, PencilLine, PowerOff, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  type DroneResponse,
  useDecommissionDroneMutation,
  useUpdateDroneBatteryMutation,
  useUpdateDroneMutation,
} from "~/stores/apis/admin/drones";

// Mã lỗi locker-service → thông báo tiếng Việt
const ERROR_MESSAGES: Record<string, string> = {
  DRONE_CODE_DUPLICATE: "Mã Drone này đã tồn tại.",
  DRONE_ACTIVE_MISSION: "Drone đang giữ/bay cho một nhiệm vụ — chờ nhiệm vụ kết thúc rồi thử lại.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ.",
};

function errorMessage(error: unknown, fallback: string) {
  const data = (error as { data?: { code?: string; message?: string } })?.data;
  return (data?.code && ERROR_MESSAGES[data.code]) || data?.message || fallback;
}

type PendingAction =
  | { kind: "rename"; code: string }
  | { kind: "battery"; percent: number }
  | { kind: "decommission" };

interface DroneAdminActionsProps {
  drone: DroneResponse;
  /** Drone đang RESERVED/IN_FLIGHT: backend chặn đổi mã và ngừng hoạt động */
  activeMission: boolean;
}

/** Thao tác quản trị trên một Drone: đổi mã, ghi nhận pin, ngừng hoạt động — đều qua hộp xác nhận. */
export function DroneAdminActions({ drone, activeMission }: DroneAdminActionsProps) {
  const [updateDrone, updateState] = useUpdateDroneMutation();
  const [updateBattery, batteryState] = useUpdateDroneBatteryMutation();
  const [decommission, decommissionState] = useDecommissionDroneMutation();

  const [codeDraft, setCodeDraft] = useState<string | null>(null);
  const [batteryDraft, setBatteryDraft] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);

  const retired = drone.active === false;
  const code = codeDraft ?? drone.code;
  const trimmedCode = code.trim();
  const codeChanged = trimmedCode !== "" && trimmedCode !== drone.code;
  const batteryValue = Number(batteryDraft);
  const batteryValid =
    batteryDraft.trim() !== "" &&
    Number.isInteger(batteryValue) &&
    batteryValue >= 0 &&
    batteryValue <= 100;
  const busy = updateState.isLoading || batteryState.isLoading || decommissionState.isLoading;

  const confirm = async () => {
    if (!pending) return;
    try {
      if (pending.kind === "rename") {
        await updateDrone({ id: drone.id, code: pending.code }).unwrap();
        setCodeDraft(null);
        toast.success(`Đã đổi mã Drone thành ${pending.code}`);
      } else if (pending.kind === "battery") {
        await updateBattery({ id: drone.id, batteryPercent: pending.percent }).unwrap();
        setBatteryDraft("");
        toast.success(`Đã ghi nhận mức pin ${pending.percent}% cho ${drone.code}`);
      } else {
        await decommission(drone.id).unwrap();
        toast.success(`Đã ngừng hoạt động Drone ${drone.code}`);
      }
      setPending(null);
    } catch (error) {
      const title =
        pending.kind === "rename"
          ? "Không đổi được mã Drone"
          : pending.kind === "battery"
            ? "Không cập nhật được mức pin"
            : "Không ngừng hoạt động được Drone";
      toast.error(title, { description: errorMessage(error, "Vui lòng thử lại.") });
    }
  };

  const dialog: { title: string; description: ReactNode; action: string; destructive?: boolean } | null =
    pending == null
      ? null
      : pending.kind === "rename"
        ? {
            title: "Đổi mã Drone?",
            description: (
              <p>
                Mã <span className="font-mono font-semibold text-foreground">{drone.code}</span> sẽ đổi thành{" "}
                <span className="font-mono font-semibold text-foreground">{pending.code}</span>. Ứng dụng KTV và
                thiết bị bay phải dùng mã mới sau khi đổi.
              </p>
            ),
            action: "Đổi mã",
          }
        : pending.kind === "battery"
          ? {
              title: "Ghi nhận mức pin?",
              description: (
                <>
                  <p>
                    Đặt mức pin của <span className="font-semibold text-foreground">{drone.code}</span> thành{" "}
                    <span className="font-semibold text-foreground">{pending.percent}%</span>. Thao tác được ghi
                    vào nhật ký vận hành.
                  </p>
                  {pending.percent === 100 && (
                    <p>Mức 100% đồng thời ghi nhận lần sạc gần nhất là thời điểm này.</p>
                  )}
                </>
              ),
              action: "Cập nhật pin",
            }
          : {
              title: `Ngừng hoạt động ${drone.code}?`,
              description: (
                <>
                  <p>
                    Drone bị ẩn khỏi danh sách vận hành, gỡ KTV phụ trách và chuyển sang trạng thái bảo trì.
                    Nhật ký và lịch sử chuyến bay vẫn được giữ.
                  </p>
                  <p className="font-medium text-rose-700">
                    Web quản trị chưa có thao tác kích hoạt lại — chỉ ngừng khi Drone thực sự không còn dùng.
                  </p>
                </>
              ),
              action: "Ngừng hoạt động",
              destructive: true,
            };

  if (retired) {
    return (
      <Card className="border border-rose-200 bg-rose-50/60 shadow-xs">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-rose-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Drone đã ngừng hoạt động</p>
            <p className="text-xs">
              Drone không còn xuất hiện trong danh sách vận hành; trang này chỉ còn để tra cứu lịch sử.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Thao tác quản trị</CardTitle>
        <CardDescription className="text-xs">
          {activeMission
            ? "Drone đang làm nhiệm vụ — chỉ ghi nhận pin được; đổi mã và ngừng hoạt động bị khoá."
            : "Mọi thao tác đều cần xác nhận và được ghi vào nhật ký vận hành."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (codeChanged && !activeMission) setPending({ kind: "rename", code: trimmedCode });
          }}
        >
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground" htmlFor="drone-code">
            <PencilLine className="h-3.5 w-3.5" />
            Mã Drone
          </label>
          <div className="flex gap-2">
            <Input
              id="drone-code"
              value={code}
              onChange={(e) => setCodeDraft(e.target.value)}
              disabled={activeMission || busy}
              className="h-9 font-mono text-xs"
              maxLength={50}
            />
            <Button type="submit" size="sm" className="h-9" disabled={!codeChanged || activeMission || busy}>
              Đổi mã
            </Button>
          </div>
        </form>

        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (batteryValid) setPending({ kind: "battery", percent: batteryValue });
          }}
        >
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground" htmlFor="drone-battery">
            <BatteryCharging className="h-3.5 w-3.5" />
            Ghi nhận mức pin (0–100%)
          </label>
          <div className="flex gap-2">
            <Input
              id="drone-battery"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              placeholder={drone.batteryPercent != null ? String(drone.batteryPercent) : "VD: 80"}
              value={batteryDraft}
              onChange={(e) => setBatteryDraft(e.target.value)}
              disabled={busy}
              className="h-9 text-xs"
            />
            <Button type="submit" size="sm" className="h-9" disabled={!batteryValid || busy}>
              Cập nhật pin
            </Button>
          </div>
          {batteryDraft.trim() !== "" && !batteryValid && (
            <p className="text-[11px] text-rose-600">Nhập số nguyên từ 0 đến 100.</p>
          )}
        </form>

        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PowerOff className="h-3.5 w-3.5" />
            Ngừng hoạt động
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            disabled={activeMission || busy}
            onClick={() => setPending({ kind: "decommission" })}
          >
            Ngừng hoạt động Drone
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={dialog != null} onOpenChange={(open) => !open && !busy && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">{dialog?.description}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Huỷ</AlertDialogCancel>
            {/* Không dùng AlertDialogAction: nó tự đóng trước khi request xong */}
            <Button
              onClick={() => void confirm()}
              disabled={busy}
              className={dialog?.destructive ? "bg-rose-600 text-white hover:bg-rose-700" : undefined}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {dialog?.action}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
