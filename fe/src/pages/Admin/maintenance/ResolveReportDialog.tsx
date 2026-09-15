import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { PhotoPicker } from "~/components/shared/media";
import { isHandledUploadError, useImageUpload } from "~/hooks/useImageUpload";
import { getMediaErrorMessage } from "~/lib/media";
import type { ReportAttachmentRequest } from "~/stores/apis/media";

export interface ResolveReportPayload {
  note?: string;
  attachments?: ReportAttachmentRequest[];
}

const RESOLUTION_PHOTO_MAX = 10;

/// Hộp xác nhận hoàn tất phiếu: tuỳ chọn ghi chú + ảnh nghiệm thu (stage RESOLUTION).
/// Ảnh được upload Cloudinary trước, rồi `onSubmit` gọi API resolve kèm `attachments`.
export function ResolveReportDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận hoàn tất",
  errorTitle = "Không xử lý được phiếu",
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  errorTitle?: string;
  /** Ném lỗi ⇒ dialog giữ nguyên và báo lỗi (ví dụ RESOLUTION_PHOTO_REQUIRED). */
  onSubmit: (payload: ResolveReportPayload) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { upload, items, isUploading, reset } = useImageUpload("REPORT_EVIDENCE");
  const busy = isUploading || submitting;

  const clear = () => {
    setNote("");
    setFiles([]);
    reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    if (!next) clear();
    onOpenChange(next);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const attachments = files.length > 0 ? await upload(files) : undefined;
      await onSubmit({ note: note.trim() || undefined, attachments });
      clear();
      onOpenChange(false);
    } catch (err) {
      if (!isHandledUploadError(err)) {
        toast.error(errorTitle, { description: getMediaErrorMessage(err, "Có lỗi khi đóng phiếu sự cố trên hệ thống.") });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden />
            {title}
          </DialogTitle>
          {description && <DialogDescription className="text-xs">{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" htmlFor="resolve-report-note">
              Ghi chú nghiệm thu (tuỳ chọn)
            </Label>
            <Textarea
              id="resolve-report-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đã thay chốt khoá, test đóng/mở 10 lần ổn định"
              rows={2}
              className="text-xs resize-none"
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Ảnh nghiệm thu (tuỳ chọn)</Label>
            <PhotoPicker
              value={files}
              onChange={setFiles}
              maxFiles={RESOLUTION_PHOTO_MAX}
              disabled={busy}
              uploadItems={items}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            Hủy bỏ
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUploading ? "Đang tải ảnh..." : submitting ? "Đang xử lý..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
