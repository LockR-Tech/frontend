import { useState } from "react";
import { UserPlus, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (staffId: number) => Promise<boolean>;
  isLoading?: boolean;
}

export function AddStaffModal({
  isOpen,
  onClose,
  onAdd,
  isLoading,
}: AddStaffModalProps) {
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = parseInt(staffId.trim(), 10);
    if (!staffId.trim() || isNaN(id) || id <= 0) {
      setError("Vui lòng nhập User ID hợp lệ (số nguyên dương)");
      return;
    }
    const success = await onAdd(id);
    if (success) {
      setStaffId("");
      setError(null);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setStaffId("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-105">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" />
            Thêm nhân viên vào đội
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>
              Nhập <strong>User ID</strong> của nhân viên trong hệ thống để thêm
              họ vào đội của bạn. User ID có thể lấy từ admin hệ thống.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="staffId">User ID *</Label>
            <Input
              id="staffId"
              type="number"
              min={1}
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="Ví dụ: 42"
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Nhân viên phải có tài khoản trong hệ thống trước khi được thêm.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !staffId.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Đang thêm..." : "Thêm nhân viên"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
