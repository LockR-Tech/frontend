import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

const MAX_REASON_LENGTH = 500;

interface ReasonConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /// Nhãn ô nhập, vd. "Lý do bảo trì".
  reasonLabel: string;
  placeholder?: string;
  /// Bắt buộc nhập mới bấm được nút xác nhận.
  required?: boolean;
  actionLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
}

/** Hộp xác nhận một thao tác đổi trạng thái kèm lý do / ghi chú (lý do được lưu vào nhật ký ở backend). */
export function ReasonConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel,
  placeholder,
  required,
  actionLabel,
  destructive,
  loading,
  onConfirm,
}: ReasonConfirmDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription asChild>
              <div className="space-y-2 pt-2 text-sm text-muted-foreground">{description}</div>
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="action-reason" className="text-xs font-semibold">
            {reasonLabel} {required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="action-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
            maxLength={MAX_REASON_LENGTH}
            rows={3}
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("button.cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm(trimmed)}
            disabled={loading || (required && trimmed === "")}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
