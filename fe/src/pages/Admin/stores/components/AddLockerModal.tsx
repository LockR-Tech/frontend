import { useState } from "react";
import { toast } from "sonner";
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
      toast.error("Không thể tạo tủ mới", {
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
            Thêm Kiosk mới
          </DialogTitle>
          <DialogDescription>
            Kiosk sẽ được gán vào địa điểm này sau khi tạo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Mã thiết bị <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="VD: LOCKER-001"
              className="font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Tên Kiosk <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Kiosk sảnh chính A"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Vị trí (tùy chọn)
            </label>
            <Input
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder="VD: Tầng 1, khu A"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Vĩ độ (Latitude)
              </label>
              <Input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) =>
                  setForm((f) => ({ ...f, latitude: e.target.value }))
                }
                placeholder="VD: 10.8412"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Kinh độ (Longitude)
              </label>
              <Input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) =>
                  setForm((f) => ({ ...f, longitude: e.target.value }))
                }
                placeholder="VD: 106.8098"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.code || !form.name}
          >
            {saving ? "Đang tạo..." : "Tạo Kiosk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
