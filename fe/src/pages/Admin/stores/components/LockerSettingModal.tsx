import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { apiPut } from "~/utils/api";
import type { AdminLockerResponse } from "~/types/admin/locker";
import { LockerStatus } from "~/types/admin/enums";

interface Props {
  locker: AdminLockerResponse;
  onClose: () => void;
  onRefresh: () => void;
}

export function LockerSettingModal({ locker, onClose, onRefresh }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    code: locker.code,
    name: locker.name,
    address: locker.address ?? "",
    latitude: locker.latitude != null ? String(locker.latitude) : "",
    longitude: locker.longitude != null ? String(locker.longitude) : "",
  });
  const [maintenance, setMaintenance] = useState(
    locker.status === LockerStatus.MAINTENANCE,
  );
  const [saving, setSaving] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const isDirty =
    form.code !== locker.code ||
    form.name !== locker.name ||
    form.address !== (locker.address ?? "") ||
    form.latitude !== (locker.latitude != null ? String(locker.latitude) : "") ||
    form.longitude !== (locker.longitude != null ? String(locker.longitude) : "");

  const handleSave = async () => {
    if (!isDirty) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const lat = form.latitude ? parseFloat(form.latitude) : undefined;
      const lng = form.longitude ? parseFloat(form.longitude) : undefined;
      await apiPut(`/api/admin/lockers/${locker.id}`, {
        code: form.code,
        name: form.name,
        address: form.address || undefined,
        latitude: !isNaN(lat!) ? lat : undefined,
        longitude: !isNaN(lng!) ? lng : undefined,
        storeId: locker.storeId,
      });
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(t("admin.stores.lockerSetting.updateFailed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async (val: boolean) => {
    setSavingMaintenance(true);
    try {
      await apiPut(`/api/admin/lockers/${locker.id}/maintenance`, {
        maintenance: val,
      });
      setMaintenance(val);
      onRefresh();
    } catch (err) {
      toast.error(t("admin.stores.lockerSetting.maintenanceFailed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingMaintenance(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            {t("admin.stores.lockerSetting.title")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.stores.lockerSetting.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t("admin.stores.lockerForm.name")} <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t("admin.stores.lockerForm.namePlaceholder")}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t("admin.stores.lockerForm.deviceCode")} <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                placeholder={t("admin.stores.lockerForm.codePlaceholder")}
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t("admin.stores.lockerForm.location")}
              </label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder={t("admin.stores.lockerForm.locationPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {t("admin.stores.form.latitude")}
                </label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, latitude: e.target.value }))
                  }
                  placeholder={t("admin.stores.form.latPlaceholder")}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {t("admin.stores.form.longitude")}
                </label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, longitude: e.target.value }))
                  }
                  placeholder={t("admin.stores.form.lngPlaceholder")}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              {t("admin.stores.lockerSetting.maintenanceMode")}
            </p>
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground/80">{t("dropdown.maintenance")}</p>
                <p className="text-xs text-muted-foreground/70">
                  {t("admin.stores.lockerSetting.maintenanceHint")}
                </p>
              </div>
              <button
                disabled={savingMaintenance}
                onClick={() => handleToggleMaintenance(!maintenance)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  maintenance ? "bg-yellow-400" : "bg-muted"
                } ${savingMaintenance ? "opacity-50" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    maintenance ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("button.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.code || !form.name}
          >
            {saving ? t("common.saving") : t("button.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
