import { useState } from "react";
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
  const [form, setForm] = useState({ code: "", name: "", address: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.code || !form.name) return;
    setSaving(true);
    try {
      await apiPost("/api/admin/lockers", { ...form, storeId });
      onCreated();
      onClose();
    } catch {
      alert("Không thể tạo tủ mới");
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
            Thêm tủ đồ mới
          </DialogTitle>
          <DialogDescription>
            Tủ sẽ được gán vào cửa hàng này sau khi tạo.
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
              Tên tủ <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Tủ đầu dãy A"
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.code || !form.name}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "Đang tạo..." : "Tạo tủ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
