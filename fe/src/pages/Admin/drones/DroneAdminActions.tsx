import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { BatteryCharging, Loader2, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteReasonDialog } from "~/components/shared/data-table";
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

// Mã lỗi locker-service → khoá i18n của thông báo
const ERROR_MESSAGES: Record<string, string> = {
  DRONE_CODE_DUPLICATE: "admin.drones.actions.errors.codeDuplicate",
  DRONE_ACTIVE_MISSION: "admin.drones.actions.errors.activeMission",
  VALIDATION_ERROR: "admin.drones.actions.errors.validation",
};

function errorMessage(error: unknown, fallback: string, t: TFunction) {
  const data = (error as { data?: { code?: string; message?: string } })?.data;
  return (data?.code && ERROR_MESSAGES[data.code] && t(ERROR_MESSAGES[data.code])) || data?.message || fallback;
}

type PendingAction =
  | { kind: "rename"; code: string }
  | { kind: "battery"; percent: number };

interface DroneAdminActionsProps {
  drone: DroneResponse;
  /** Drone đang RESERVED/IN_FLIGHT: backend chặn đổi mã và xoá */
  activeMission: boolean;
}

/** Thao tác quản trị trên một Drone: đổi mã, ghi nhận pin, xoá — đều qua hộp xác nhận. */
export function DroneAdminActions({ drone, activeMission }: DroneAdminActionsProps) {
  const { t } = useTranslation();
  const [updateDrone, updateState] = useUpdateDroneMutation();
  const [updateBattery, batteryState] = useUpdateDroneBatteryMutation();
  const [decommission, decommissionState] = useDecommissionDroneMutation();

  const [codeDraft, setCodeDraft] = useState<string | null>(null);
  const [batteryDraft, setBatteryDraft] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();

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
        toast.success(t("admin.drones.actions.renamed", { code: pending.code }));
      } else {
        await updateBattery({ id: drone.id, batteryPercent: pending.percent }).unwrap();
        setBatteryDraft("");
        toast.success(t("admin.drones.actions.batteryRecorded", { percent: pending.percent, code: drone.code }));
      }
      setPending(null);
    } catch (error) {
      const title =
        pending.kind === "rename"
          ? t("admin.drones.actions.renameFailed")
          : t("admin.drones.actions.batteryFailed");
      toast.error(title, { description: errorMessage(error, t("common.pleaseRetry"), t) });
    }
  };

  const confirmDelete = async (reason: string) => {
    try {
      await decommission({ id: drone.id, reason }).unwrap();
      toast.success(t("admin.drones.actions.decommissioned", { code: drone.code }));
      // Drone đã xoá không còn trang chi tiết.
      navigate("/admin/drones");
    } catch (error) {
      toast.error(t("admin.drones.actions.decommissionFailed"), {
        description: errorMessage(error, t("common.pleaseRetry"), t),
      });
    }
  };

  const strong = <span className="font-semibold text-foreground" />;
  const mono = <span className="font-mono font-semibold text-foreground" />;
  const dialog: { title: string; description: ReactNode; action: string } | null =
    pending == null
      ? null
      : pending.kind === "rename"
        ? {
            title: t("admin.drones.actions.renameTitle"),
            description: (
              <p>
                <Trans
                  t={t}
                  i18nKey="admin.drones.actions.renameDescription"
                  values={{ from: drone.code, to: pending.code }}
                  components={{ code: mono }}
                />
              </p>
            ),
            action: t("admin.drones.actions.rename"),
          }
        : {
            title: t("admin.drones.actions.batteryTitle"),
            description: (
              <>
                <p>
                  <Trans
                    t={t}
                    i18nKey="admin.drones.actions.batteryDescription"
                    values={{ code: drone.code, percent: pending.percent }}
                    components={{ b: strong }}
                  />
                </p>
                {pending.percent === 100 && (
                  <p>{t("admin.drones.actions.batteryFullNote")}</p>
                )}
              </>
            ),
            action: t("admin.drones.actions.updateBattery"),
          };

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("admin.drones.actions.title")}</CardTitle>
        <CardDescription className="text-xs">
          {activeMission
            ? t("admin.drones.actions.activeMissionHint")
            : t("admin.drones.actions.hint")}
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
            {t("admin.drones.detail.info.code")}
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
              {t("admin.drones.actions.rename")}
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
            {t("admin.drones.actions.batteryLabel")}
          </label>
          <div className="flex gap-2">
            <Input
              id="drone-battery"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              placeholder={drone.batteryPercent != null ? String(drone.batteryPercent) : t("admin.drones.actions.batteryPlaceholder")}
              value={batteryDraft}
              onChange={(e) => setBatteryDraft(e.target.value)}
              disabled={busy}
              className="h-9 text-xs"
            />
            <Button type="submit" size="sm" className="h-9" disabled={!batteryValid || busy}>
              {t("admin.drones.actions.updateBattery")}
            </Button>
          </div>
          {batteryDraft.trim() !== "" && !batteryValid && (
            <p className="text-[11px] text-rose-600">{t("admin.drones.actions.batteryInvalid")}</p>
          )}
        </form>

        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5" />
            {t("admin.drones.actions.decommission")}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            disabled={activeMission || busy}
            onClick={() => setDeleteOpen(true)}
          >
            {t("admin.drones.actions.decommissionButton")}
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
            <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
            {/* Không dùng AlertDialogAction: nó tự đóng trước khi request xong */}
            <Button
              onClick={() => void confirm()}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {dialog?.action}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteReasonDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("admin.drones.actions.decommissionTitle", { code: drone.code })}
        description={<p>{t("admin.drones.actions.decommissionDescription")}</p>}
        actionLabel={t("admin.drones.actions.decommission")}
        loading={decommissionState.isLoading}
        onConfirm={(reason) => void confirmDelete(reason)}
      />
    </Card>
  );
}
