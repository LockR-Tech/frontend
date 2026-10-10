import { parseBackendDateTime } from "~/lib/datetime";
import { useState, useEffect } from "react";
import { Tag } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DiscountType } from "~/types/admin/enums";
import type {
  AdminPromotion,
  AdminPromotionRequest,
} from "~/stores/apis/admin/promotions";
import { PromotionImageField } from "./PromotionImageField";
import { promotionError } from "../promotion-status";

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion?: AdminPromotion | null;
  mode: "create" | "edit";
  onSave: (data: AdminPromotionRequest) => Promise<void>;
  isSaving: boolean;
}

// Backend chỉ hiểu PERCENTAGE, loại khác đều tính như số tiền cố định.
type FormDiscountType = typeof DiscountType.PERCENTAGE | typeof DiscountType.FIXED_AMOUNT;

/// Backend trả chuỗi trần = UTC. Ô `datetime-local` lại hiểu giá trị là giờ
/// máy, nên cắt thẳng chuỗi UTC vào đó sẽ hiện sớm 7 tiếng — và khi lưu lại,
/// `new Date(...).toISOString()` đổi VN→UTC thêm lần nữa, làm mã lùi 7 tiếng
/// sau **mỗi** lần sửa cho tới khi hết hiệu lực.
const toDatetimeLocal = (iso?: string | null) => {
  const date = parseBackendDateTime(iso ?? null);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

interface FormState {
  code: string;
  title: string;
  description: string;
  discountType: FormDiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  startDate: string;
  endDate: string;
  totalUsageLimit: string;
  perUserLimit: string;
  isActive: boolean;
  stackable: boolean;
}

const DEFAULT_FORM: FormState = {
  code: "",
  title: "",
  description: "",
  discountType: DiscountType.PERCENTAGE,
  discountValue: "",
  maxDiscountAmount: "",
  minOrderAmount: "",
  startDate: "",
  endDate: "",
  totalUsageLimit: "",
  perUserLimit: "1",
  isActive: true,
  stackable: false,
};

const numText = (v: number | null | undefined) => (v != null ? String(v) : "");

export function PromotionModal({
  isOpen,
  onClose,
  promotion,
  mode,
  onSave,
  isSaving,
}: PromotionModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (promotion && mode === "edit") {
      // Trường null (không giới hạn) để trống, không tự điền giá trị mặc định.
      setForm({
        code: promotion.code ?? "",
        title: promotion.name ?? "",
        description: promotion.description ?? "",
        discountType:
          promotion.discountType === DiscountType.PERCENTAGE
            ? DiscountType.PERCENTAGE
            : DiscountType.FIXED_AMOUNT,
        discountValue: numText(promotion.discountValue),
        maxDiscountAmount: numText(promotion.maxDiscountAmount),
        minOrderAmount: numText(promotion.minOrderAmount),
        startDate: toDatetimeLocal(promotion.startAt),
        endDate: toDatetimeLocal(promotion.endAt),
        totalUsageLimit: numText(promotion.totalUsageLimit),
        perUserLimit: numText(promotion.perUserLimit),
        isActive: (promotion.status ?? "").toUpperCase() !== "INACTIVE",
        stackable: Boolean(promotion.stackable),
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [promotion, mode, isOpen]);

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim() || !form.title.trim()) {
      toast.error(t("admin.promotions.modal.requiredCode"));
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error(t("admin.promotions.modal.requiredDates"));
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error(t("admin.promotions.modal.invalidDates"));
      return;
    }

    const discountVal = parseFloat(form.discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      toast.error("Giá trị giảm giá không hợp lệ (phải lớn hơn 0)");
      return;
    }
    if (form.discountType === DiscountType.PERCENTAGE && discountVal > 100) {
      toast.error("Phần trăm giảm giá không được vượt quá 100%");
      return;
    }

    // PromotionRequest của order-service: name/startAt/endAt/status; startAt/endAt là
    // LocalDateTime UTC không offset. PUT ghi đè mọi trường nên giữ lại lockerId khi sửa.
    const payload: AdminPromotionRequest = {
      code: form.code.toUpperCase().trim(),
      name: form.title.trim(),
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue: discountVal,
      maxDiscountAmount:
        form.discountType === DiscountType.PERCENTAGE && form.maxDiscountAmount
          ? parseFloat(form.maxDiscountAmount)
          : undefined,
      minOrderAmount: form.minOrderAmount
        ? parseFloat(form.minOrderAmount)
        : undefined,
      startAt: new Date(form.startDate).toISOString().slice(0, 19),
      endAt: new Date(form.endDate).toISOString().slice(0, 19),
      totalUsageLimit: form.totalUsageLimit
        ? parseInt(form.totalUsageLimit, 10)
        : undefined,
      perUserLimit: form.perUserLimit ? parseInt(form.perUserLimit, 10) : undefined,
      status: form.isActive ? "ACTIVE" : "INACTIVE",
      stackable: form.stackable,
      lockerId: mode === "edit" ? (promotion?.lockerId ?? undefined) : undefined,
    };

    try {
      await onSave(payload);
      toast.success(
        mode === "create"
          ? t("admin.promotions.modal.createSuccess")
          : t("admin.promotions.modal.editSuccess"),
      );
    } catch (err) {
      toast.error(
        mode === "create"
          ? t("admin.promotions.modal.createFailed")
          : t("admin.promotions.modal.editFailed"),
        { description: promotionError(err).message || undefined },
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag size={18} className="text-orange-500" />
            {mode === "create"
              ? t("admin.promotions.modal.createTitle")
              : t("admin.promotions.modal.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image (chỉ khi sửa — cần id khuyến mãi) */}
          {mode === "edit" && promotion && (
            <PromotionImageField promotion={promotion} />
          )}

          {/* Code + Title */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                {t("admin.promotions.modal.code")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder={t("admin.promotions.modal.codePlaceholder")}
                className="font-mono uppercase"
                required
              />
              <p className="text-xs text-muted-foreground/70">
                {t("admin.promotions.modal.codeHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("admin.promotions.modal.titleField")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={t("admin.promotions.modal.titlePlaceholder")}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t("admin.promotions.modal.description")}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("admin.promotions.modal.descriptionPlaceholder")}
              rows={2}
            />
          </div>

          {/* Discount */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>
                {t("admin.promotions.modal.discountType")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.discountType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, discountType: v as FormDiscountType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DiscountType.PERCENTAGE}>
                    {t("admin.promotions.modal.discountTypePercent")}
                  </SelectItem>
                  <SelectItem value={DiscountType.FIXED_AMOUNT}>
                    {t("admin.promotions.modal.discountTypeFixed")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                {t("admin.promotions.modal.discountValue")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0.01"
                max={form.discountType === DiscountType.PERCENTAGE ? "100" : undefined}
                step="0.01"
                value={form.discountValue}
                onChange={(e) => set("discountValue", e.target.value)}
                placeholder={
                  form.discountType === DiscountType.PERCENTAGE ? "20" : "30000"
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                {t("admin.promotions.modal.maxDiscount")}{" "}
                <span className="text-muted-foreground/70 font-normal text-xs">
                  ({t("admin.promotions.modal.discountTypePercent")})
                </span>
              </Label>
              <Input
                type="number"
                min="0"
                value={form.maxDiscountAmount}
                onChange={(e) => set("maxDiscountAmount", e.target.value)}
                placeholder="50000"
                disabled={form.discountType !== DiscountType.PERCENTAGE}
              />
            </div>
          </div>

          {/* Min order + Limits */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.promotions.modal.minOrder")}</Label>
              <Input
                type="number"
                min="0"
                value={form.minOrderAmount}
                onChange={(e) => set("minOrderAmount", e.target.value)}
                placeholder={t("admin.promotions.modal.minOrderPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.promotions.modal.totalLimit")}</Label>
              <Input
                type="number"
                min="1"
                value={form.totalUsageLimit}
                onChange={(e) => set("totalUsageLimit", e.target.value)}
                placeholder={t("admin.promotions.modal.totalLimitPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.promotions.modal.perUserLimit")}</Label>
              <Input
                type="number"
                min="1"
                value={form.perUserLimit}
                onChange={(e) => set("perUserLimit", e.target.value)}
                placeholder={t("admin.promotions.modal.totalLimitPlaceholder")}
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                {t("admin.promotions.modal.startDate")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("admin.promotions.modal.endDate")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-blue-600"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
              />
              <span className="text-sm text-foreground/80">
                {t("admin.promotions.modal.isActive")}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-primary"
                checked={form.stackable}
                onChange={(e) => set("stackable", e.target.checked)}
              />
              <span className="text-sm text-foreground/80">
                {t("admin.promotions.modal.stackable")}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              {t("button.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-1.5">
              <Tag size={14} />
              {isSaving
                ? t("common.loading")
                : mode === "create"
                  ? t("admin.promotions.createBtn")
                  : t("button.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
