import { useState } from "react";
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
  const [form, setForm] = useState({
    code: locker.code,
    name: locker.name,
    address: locker.address ?? "",
  });
  const [maintenance, setMaintenance] = useState(
    locker.status === LockerStatus.MAINTENANCE,
  );
  const [saving, setSaving] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const isDirty =
    form.code !== locker.code ||
    form.name !== locker.name ||
    form.address !== (locker.address ?? "");

  const handleSave = async () => {
    if (!isDirty) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await apiPut(`/api/admin/lockers/${locker.id}`, {
        code: form.code,
        name: form.name,
        address: form.address || undefined,
        storeId: locker.storeId,
      });
      onRefresh();
      onClose();
    } catch {
      alert("Không thể cập nhật thông tin tủ");
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
    } catch {
      alert("Không thể thay đổi chế độ bảo trì");
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
            Cài đặt tủ đồ
          </DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin và trạng thái cho tủ này.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Tên tủ <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="VD: Tủ đầu dãy A"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Mã thiết bị <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                placeholder="VD: LOCKER-001"
                className="font-mono"
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

          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Chế độ bảo trì
            </p>
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground/80">Bảo trì</p>
                <p className="text-xs text-muted-foreground/70">
                  Tủ sẽ khóa toàn bộ ngăn khi bật
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
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.code || !form.name}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
