import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
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
import { apiPost } from "~/utils/api";

interface Props {
  storeId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddLockerModal({ storeId, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    code: "",
    name: "",
    address: "",
    latitude: "",
    longitude: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.code || !form.name) return;
    setSaving(true);
    try {
      const lat = form.latitude ? parseFloat(form.latitude) : undefined;
      const lng = form.longitude ? parseFloat(form.longitude) : undefined;
      await apiPost("/api/admin/lockers", {
        code: form.code,
        name: form.name,
        address: form.address || undefined,
        latitude: !isNaN(lat!) ? lat : undefined,
        longitude: !isNaN(lng!) ? lng : undefined,
        storeId,
      });
      onCreated();
      onClose();
    } catch (err) {
      toast.error(t("admin.stores.addLocker.createFailed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("admin.stores.addLocker.title")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.stores.addLocker.desc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {t("admin.stores.lockerForm.deviceCode")} <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder={t("admin.stores.lockerForm.codePlaceholder")}
              className="font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {t("admin.stores.lockerForm.name")} <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t("admin.stores.lockerForm.namePlaceholder")}
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("button.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.code || !form.name}
          >
            {saving ? t("admin.stores.addLocker.creating") : t("admin.stores.addLocker.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
