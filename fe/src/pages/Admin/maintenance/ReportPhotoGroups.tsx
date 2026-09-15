import { useMemo, useState } from "react";
import { Camera, CheckCircle2, ImagePlus, Loader2, ShieldCheck, Wrench } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PhotoGallery, PhotoPicker, type GalleryPhoto } from "~/components/shared/media";
import { isHandledUploadError, useImageUpload } from "~/hooks/useImageUpload";
import { getMediaErrorMessage } from "~/lib/media";
import {
  useAddAdminReportAttachmentsMutation,
  useDeleteAdminReportAttachmentMutation,
  type LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import type { AttachmentStage } from "~/stores/apis/media";
import {
  ATTACHMENT_STAGES,
  STAGE_LABELS,
  groupReportPhotos,
  type ReportPhoto,
} from "./maintenancePhotos";

const formatPhotoTime = (dateStr?: string | null) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// Màu giữ theo quy ước cũ của trang: người báo = rose, KTV = amber, đang sửa = blue, nghiệm thu = emerald
const STAGE_STYLE: Record<
  AttachmentStage,
  { chip: string; heading: string; thumb: string; icon: typeof Camera; badge: string }
> = {
  REPORT: {
    chip: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60",
    heading: "text-rose-700 dark:text-rose-300",
    thumb: "border-rose-300 dark:border-rose-800 hover:border-rose-500 ring-1 ring-rose-200/50",
    icon: Camera,
    badge: "Người báo",
  },
  INSPECTION: {
    chip: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/60",
    heading: "text-amber-700 dark:text-amber-300",
    thumb: "border-amber-300 dark:border-amber-800 hover:border-amber-500",
    icon: ShieldCheck,
    badge: "KTV xác nhận",
  },
  PROGRESS: {
    chip: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/60",
    heading: "text-blue-700 dark:text-blue-300",
    thumb: "border-blue-300 dark:border-blue-800 hover:border-blue-500",
    icon: Wrench,
    badge: "Đang sửa",
  },
  RESOLUTION: {
    chip: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/60",
    heading: "text-emerald-700 dark:text-emerald-300",
    thumb: "border-emerald-300 dark:border-emerald-700 hover:border-emerald-500 ring-1 ring-emerald-200/50",
    icon: CheckCircle2,
    badge: "Nghiệm thu",
  },
};

interface ReportPhotoGroupsProps {
  report: LockerReportResponse;
  /** `compact`: 1 dòng/stage, chỉ hiện stage có ảnh (danh sách phiếu). `stacked`: đủ 4 stage kèm trạng thái trống. */
  variant?: "compact" | "stacked";
  /** Map userId → tên hiển thị cho dòng "Người tải". */
  userNames?: Record<number, string | undefined>;
  /** Admin: thêm ảnh (chọn stage) và xoá ảnh qua /api/admin/lockers/reports/{id}/attachments. */
  canManage?: boolean;
}

/// 4 nhóm ảnh phiếu sự cố (người báo · KTV xác nhận · trong khi sửa · nghiệm thu) + lightbox + quản lý ảnh.
export function ReportPhotoGroups({
  report,
  variant = "compact",
  userNames,
  canManage = true,
}: ReportPhotoGroupsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteAttachment] = useDeleteAdminReportAttachmentMutation();
  const groups = useMemo(() => groupReportPhotos(report), [report]);
  const total = ATTACHMENT_STAGES.reduce((sum, stage) => sum + groups[stage].length, 0);

  const uploaderName = (photo: ReportPhoto) => {
    const id = photo.uploadedByUserId;
    if (id == null) return undefined;
    if (userNames?.[id]) return userNames[id];
    if (id === report.userId && report.reporterName) return report.reporterName;
    return `Người dùng #${id}`;
  };

  const toGalleryPhotos = (stage: AttachmentStage, photos: ReportPhoto[]): GalleryPhoto[] =>
    photos.map((photo, idx) => ({
      key: photo.key,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      alt: `${STAGE_LABELS[stage]} ${idx + 1} — phiếu #${report.id}`,
      caption: photo.caption,
      meta: [
        uploaderName(photo) && `Người tải: ${uploaderName(photo)}`,
        photo.capturedAt && `Chụp lúc ${formatPhotoTime(photo.capturedAt)}`,
        photo.createdAt && `Tải lên ${formatPhotoTime(photo.createdAt)}`,
        photo.attachmentId == null && "Ảnh cũ đính kèm trong mô tả",
      ]
        .filter(Boolean)
        .join(" · "),
      badge: variant === "compact" ? STAGE_STYLE[stage].badge : undefined,
      deletable: photo.attachmentId != null,
    }));

  const handleDelete = async (photo: GalleryPhoto) => {
    const attachmentId = ATTACHMENT_STAGES.flatMap((stage) => groups[stage]).find(
      (p) => p.key === photo.key,
    )?.attachmentId;
    if (attachmentId == null) return;
    try {
      await deleteAttachment({ reportId: report.id, attachmentId }).unwrap();
      toast.success("Đã xoá ảnh", { description: `Ảnh đã được gỡ khỏi phiếu #${report.id}.` });
    } catch (err) {
      toast.error("Không xoá được ảnh", { description: getMediaErrorMessage(err) });
      throw err;
    }
  };

  const addButton = canManage && (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-[11px] gap-1 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 dark:text-indigo-300"
      onClick={(e) => {
        e.stopPropagation();
        setAddOpen(true);
      }}
    >
      <ImagePlus className="w-3.5 h-3.5" /> Thêm ảnh
    </Button>
  );

  const addDialog = canManage && (
    <AddReportPhotosDialog report={report} open={addOpen} onOpenChange={setAddOpen} />
  );

  if (variant === "compact") {
    return (
      <>
        {ATTACHMENT_STAGES.filter((stage) => groups[stage].length > 0).map((stage) => {
          const style = STAGE_STYLE[stage];
          const Icon = style.icon;
          return (
            <div key={stage} className="mt-2 flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] font-semibold flex items-center gap-1 shrink-0 px-2 py-0.5 rounded border shadow-2xs ${style.chip}`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {STAGE_LABELS[stage]} ({groups[stage].length} ảnh):
              </span>
              <PhotoGallery
                photos={toGalleryPhotos(stage, groups[stage])}
                title={`${STAGE_LABELS[stage]} · Phiếu #${report.id} · ${report.title}`}
                onDelete={canManage ? handleDelete : undefined}
                thumbClassName={`w-12 h-12 ${style.thumb}`}
              />
            </div>
          );
        })}
        <div className="mt-1.5 flex items-center gap-2">
          {total === 0 && <span className="text-[11px] text-muted-foreground italic">Chưa có ảnh đính kèm</span>}
          {addButton}
        </div>
        {addDialog}
      </>
    );
  }

  return (
    <div className="pt-2 border-t border-border/60 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          Hình ảnh phiếu ({total} ảnh)
        </p>
        {addButton}
      </div>
      {ATTACHMENT_STAGES.map((stage) => {
        const style = STAGE_STYLE[stage];
        const Icon = style.icon;
        return (
          <div key={stage}>
            <p className={`text-xs font-semibold flex items-center gap-1.5 mb-1.5 ${style.heading}`}>
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {STAGE_LABELS[stage]} ({groups[stage].length} ảnh):
            </p>
            <PhotoGallery
              photos={toGalleryPhotos(stage, groups[stage])}
              title={`${STAGE_LABELS[stage]} · Phiếu sự cố #${report.id}`}
              onDelete={canManage ? handleDelete : undefined}
              emptyText="Chưa có ảnh"
              className="overflow-x-auto pb-1 flex-nowrap"
              thumbClassName={`w-20 h-20 rounded-lg shadow-xs ${style.thumb}`}
            />
          </div>
        );
      })}
      {addDialog}
    </div>
  );
}

const ADD_PHOTO_MAX = 10;

/// Admin gắn ảnh vào phiếu ở stage bất kỳ (POST /api/admin/lockers/reports/{id}/attachments).
function AddReportPhotosDialog({
  report,
  open,
  onOpenChange,
}: {
  report: LockerReportResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const defaultStage: AttachmentStage =
    report.status === "RESOLVED" ? "RESOLUTION" : report.status === "IN_PROGRESS" ? "INSPECTION" : "REPORT";
  const [stage, setStage] = useState<AttachmentStage>(defaultStage);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const { upload, items, isUploading, reset } = useImageUpload("REPORT_EVIDENCE");
  const [addAttachments, { isLoading: saving }] = useAddAdminReportAttachmentsMutation();
  const busy = isUploading || saving;

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) {
      setFiles([]);
      setNote("");
      setStage(defaultStage);
      reset();
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (files.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 ảnh");
      return;
    }
    try {
      const attachments = await upload(files);
      await addAttachments({ reportId: report.id, stage, note, attachments }).unwrap();
      toast.success(`Đã thêm ${attachments.length} ảnh vào phiếu #${report.id}`, {
        description: `${STAGE_LABELS[stage]}${note.trim() ? " · kèm 1 dòng nhật ký" : ""}`,
      });
      setFiles([]);
      setNote("");
      reset();
      onOpenChange(false);
    } catch (err) {
      if (!isHandledUploadError(err)) {
        toast.error("Không thêm được ảnh", { description: getMediaErrorMessage(err) });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImagePlus className="w-4 h-4 text-indigo-600" aria-hidden />
            Thêm ảnh · Phiếu #{report.id}
          </DialogTitle>
          <DialogDescription className="text-xs">{report.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Giai đoạn ảnh</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as AttachmentStage)} disabled={busy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTACHMENT_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium" htmlFor={`report-photo-note-${report.id}`}>
              Ghi chú (tuỳ chọn)
            </Label>
            <Textarea
              id={`report-photo-note-${report.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Có ghi chú ⇒ hệ thống tạo 1 dòng nhật ký và gắn các ảnh này vào đó"
              rows={2}
              className="text-xs resize-none"
              disabled={busy}
            />
          </div>

          <PhotoPicker
            value={files}
            onChange={setFiles}
            maxFiles={ADD_PHOTO_MAX}
            disabled={busy}
            uploadItems={items}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={busy || files.length === 0} className="gap-1.5">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUploading ? "Đang tải ảnh..." : saving ? "Đang lưu..." : `Lưu ${files.length || ""} ảnh`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
