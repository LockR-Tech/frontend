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
  lockerId: number;
  existingCount: number;
  onClose: () => void;
  onCreated: () => void;
}

export function AddBoxModal({
  lockerId,
  existingCount,
  onClose,
  onCreated,
}: Props) {
  const [form, setForm] = useState({
    boxNumber: existingCount + 1,
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.boxNumber) return;
    setSaving(true);
    try {
      await apiPost(`/api/admin/lockers/${lockerId}/boxes`, {
        boxNumber: form.boxNumber,
        description: form.description || undefined,
      });
      onCreated();
      onClose();
    } catch {
      alert("Không thể thêm ngăn tủ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Thêm ngăn tủ
          </DialogTitle>
          <DialogDescription>
            Ngăn mới sẽ được thêm vào tủ này ngay sau khi tạo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Số ngăn <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={1}
              value={form.boxNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, boxNumber: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Mô tả (tùy chọn)
            </label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="VD: Ngăn cỡ nhỏ"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.boxNumber}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "Đang thêm..." : "Thêm ngăn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
