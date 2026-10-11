import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
  { value: "SMALL", labelKey: "admin.stores.addBox.size.small" },
  { value: "MEDIUM", labelKey: "admin.stores.addBox.size.medium" },
  { value: "LARGE", labelKey: "admin.stores.addBox.size.large" },
  { value: "XL", labelKey: "admin.stores.addBox.size.xl" },
];

export function AddBoxModal({
  lockerId,
  defaultBoxNumber,
  onClose,
  onCreated,
}: Props) {
  const { t } = useTranslation();
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
      toast.success(t("admin.stores.addBox.added", { number: boxNumber }));
      onCreated();
      onClose();
    } catch (err) {
      toast.error(t("admin.stores.addBox.addFailed"), {
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
            {t("admin.stores.addBox.title")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.stores.addBox.desc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {t("admin.stores.addBox.boxNumber")} <span className="text-red-500">*</span>
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
              {t("admin.stores.addBox.sizeLabel")}
            </label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("button.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !boxNumber || boxNumber < 1}
          >
            {saving ? t("admin.stores.addBox.adding") : t("admin.stores.addBox.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
