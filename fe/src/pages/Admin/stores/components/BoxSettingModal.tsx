import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Unlock, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { apiPut, apiPost } from "~/utils/api";
import type { BoxInfo } from "~/types/admin/locker";
import { BoxStatus } from "~/types/admin/enums";
import { BOX_CFG } from "./lockerConstants";

// ─── Force-Open confirmation modal ──────────────────────────────────────────
interface ForceOpenProps {
  box: BoxInfo;
  lockerName: string;
  onClose: () => void;
  onConfirm: () => void;
}

function ForceOpenModal({
  box,
  lockerName,
  onClose,
  onConfirm,
}: ForceOpenProps) {
  const { t } = useTranslation();
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-muted-foreground" />
            {t("admin.stores.boxSetting.forceOpenTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.stores.boxSetting.forceOpenDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="p-4 bg-secondary/50 rounded-lg border border-border flex items-center gap-3">
            <div className="w-12 h-12 bg-card rounded-lg border border-border flex items-center justify-center font-bold text-foreground text-lg">
              {box.boxNumber}
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {t("admin.stores.boxSetting.boxTitle", { number: box.boxNumber, locker: lockerName })}
              </p>
              {box.description && (
                <p className="text-sm text-muted-foreground">{box.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 bg-secondary/30 rounded-lg border border-border/60">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("admin.stores.boxSetting.forceOpenWarning")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("button.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            <Unlock className="mr-2 h-4 w-4" />
            {t("admin.stores.boxSetting.confirmOpen")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Box Setting modal ───────────────────────────────────────────────────────
interface Props {
  box: BoxInfo;
  lockerName: string;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS = [
  { value: BoxStatus.AVAILABLE },
  { value: BoxStatus.OCCUPIED },
  { value: BoxStatus.RESERVED },
  { value: BoxStatus.MAINTENANCE },
];

export function BoxSettingModal({
  box,
  lockerName,
  onClose,
  onRefresh,
}: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>(box.status);
  const [saving, setSaving] = useState(false);
  const [confirmForceOpen, setConfirmForceOpen] = useState(false);

  const cfg = BOX_CFG[status] ?? BOX_CFG[BoxStatus.MAINTENANCE];

  const handleSaveStatus = async () => {
    if (status === box.status) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await apiPut(`/api/admin/lockers/boxes/${box.id}/status`, { status });
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(t("admin.stores.boxSetting.statusUpdateFailed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleForceOpen = async () => {
    try {
      await apiPost(`/api/locker-technician/boxes/${box.id}/force-open`, {});
      setConfirmForceOpen(false);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(t("admin.stores.boxSetting.forceOpenFailed"), {
        description: err instanceof Error ? err.message : undefined,
      });
      setConfirmForceOpen(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded border flex items-center justify-center text-sm font-bold ${cfg.bg} ${cfg.border} ${cfg.text}`}
              >
                {box.boxNumber}
              </div>
              {t("admin.stores.boxSetting.boxTitle", { number: box.boxNumber, locker: lockerName })}
            </DialogTitle>
            {box.description && (
              <DialogDescription>{box.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div
              className={`rounded-lg border px-3 py-2.5 flex items-center gap-2 ${cfg.bg} ${cfg.border}`}
            >
              <span className={`text-xs font-semibold ${cfg.text}`}>
                {t("admin.stores.boxSetting.currentStatus")}
              </span>
              <span className={`text-sm font-bold ${cfg.text}`}>
                {BOX_CFG[box.status] ? t(BOX_CFG[box.status].labelKey) : box.status}
              </span>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                {t("admin.stores.boxSetting.changeStatus")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const optCfg = BOX_CFG[opt.value];
                  const isSelected = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        isSelected
                          ? `${optCfg.bg} ${optCfg.border} ${optCfg.text} ring-2 ring-offset-1 ring-current`
                          : "bg-background border-border/50 text-muted-foreground hover:border-border/70"
                      }`}
                    >
                      {t(optCfg.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {box.status === BoxStatus.OCCUPIED && (
              <div className="pt-2 border-t border-border/60">
                <p className="text-xs text-muted-foreground mb-2">{t("admin.stores.boxSetting.emergency")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-foreground hover:bg-secondary"
                  onClick={() => setConfirmForceOpen(true)}
                >
                  <Unlock className="mr-2 h-3.5 w-3.5" />
                  {t("admin.stores.boxSetting.forceOpenTitle")}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t("button.cancel")}
            </Button>
            <Button
              onClick={handleSaveStatus}
              disabled={saving}
            >
              {saving ? t("common.saving") : t("button.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmForceOpen && (
        <ForceOpenModal
          box={box}
          lockerName={lockerName}
          onClose={() => setConfirmForceOpen(false)}
          onConfirm={handleForceOpen}
        />
      )}
    </>
  );
}
