import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
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

// Backend giới hạn cột deleted_reason ở 500 ký tự (DeleteReason.MAX_LENGTH).
const MAX_REASON_LENGTH = 500;

interface DeleteReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /// Ghi chú về mục backend sẽ từ chối xoá.
  note?: string;
  actionLabel: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
}

/** Hộp xác nhận xoá mềm: phải nhập lý do mới bấm xoá được, giữ nguyên khi đang xử lý. */
export function DeleteReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  note,
  actionLabel,
  loading,
  onConfirm,
}: DeleteReasonDialogProps) {
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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 pt-2 text-sm text-muted-foreground">
              {description}
              <p>{t("common.deleteReason.softNote")}</p>
              {note && <p className="rounded-lg border bg-muted/60 p-2.5 text-xs">{note}</p>}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-reason" className="text-xs font-semibold">
            {t("common.deleteReason.label")} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("common.deleteReason.placeholder")}
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
            variant="destructive"
            onClick={() => onConfirm(trimmed)}
            disabled={loading || trimmed === ""}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
