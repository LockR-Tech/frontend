import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
  /** Số ngăn gợi ý = số lớn nhất hiện có + 1. */
  defaultBoxNumber: number;
  onClose: () => void;
  onCreated: () => void;
}

// Cỡ ô locker-service nhận (SIZE_ORDER); bỏ trống thì backend lưu MEDIUM.
const SIZE_OPTIONS = [
  { value: "SMALL", label: "Nhỏ (S)" },
  { value: "MEDIUM", label: "Vừa (M)" },
  { value: "LARGE", label: "Lớn (L)" },
  { value: "XL", label: "Rất lớn (XL)" },
];

export function AddBoxModal({
  lockerId,
  defaultBoxNumber,
  onClose,
  onCreated,
}: Props) {
  const [boxNumber, setBoxNumber] = useState(defaultBoxNumber);
  const [touched, setTouched] = useState(false);
  const [size, setSize] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);

  // Danh sách ô có thể tải xong sau khi mở hộp thoại → cập nhật gợi ý nếu chưa sửa tay.
  useEffect(() => {
    if (!touched) setBoxNumber(defaultBoxNumber);
  }, [defaultBoxNumber, touched]);

  const handleSubmit = async () => {
    if (!boxNumber || boxNumber < 1) return;
    setSaving(true);
    try {
      // BoxRequest bắt buộc lockerId + boxNumber (thiếu lockerId → 400).
      await apiPost(`/api/admin/lockers/${lockerId}/boxes`, {
        lockerId,
        boxNumber,
        size,
      });
      toast.success(`Đã thêm ngăn #${boxNumber}`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error("Không thể thêm ngăn tủ", {
        description: err instanceof Error ? err.message : undefined,
      });
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
              value={boxNumber}
              onChange={(e) => {
                setTouched(true);
                setBoxNumber(Number(e.target.value));
              }}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Kích cỡ
            </label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !boxNumber || boxNumber < 1}
          >
            {saving ? "Đang thêm..." : "Thêm ngăn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
