import { useState } from "react";
import { History, Send, Camera, User, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { PhotoGallery, PhotoPicker, type GalleryPhoto } from "~/components/shared/media";
import { isHandledUploadError, useImageUpload } from "~/hooks/useImageUpload";
import { getMediaErrorMessage } from "~/lib/media";
import {
  useGetReportLogsQuery,
  useAddReportLogMutation,
  type LockerReportResponse,
  type RepairLogResponse,
} from "~/stores/apis/admin/lockerOps";
import { KTV_NOTES_BY_REPORT } from "./maintenancePhotos";

const LOG_PHOTO_MAX = 10;

const formatDT = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const calcDuration = (a?: string | null, b?: string | null): string => {
  if (!a || !b) return "—";
  const ms = Math.max(0, new Date(b).getTime() - new Date(a).getTime());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m} phút`;
  return `${h} giờ ${m > 0 ? `${m} phút` : ""}`;
};

/// Nút "Nhật ký" + hộp thoại đầy đủ thông tin phiếu:
/// - Nội dung user báo cáo
/// - Ghi chú kỹ thuật của KTV (biên bản, linh kiện thay, thời gian nhận/xong)
/// - Nhật ký xử lý từng bước (work-log) với ảnh trong quá trình sửa (stage PROGRESS)
/// - Đính kèm tối đa 10 ảnh (upload Cloudinary) trong 1 lần ghi nhật ký
export function RepairLogDialog({
  reportId,
  title,
  technicianName,
  report,
}: {
  reportId: number;
  title: string;
  technicianName?: string;
  report?: LockerReportResponse;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [activeSection, setActiveSection] = useState<"info" | "logs">("info");

  const { data, isLoading } = useGetReportLogsQuery(reportId, { skip: !open });
  const [addLog, { isLoading: adding }] = useAddReportLogMutation();
  const { upload, items: uploadItems, isUploading, reset: resetUpload } = useImageUpload("REPORT_EVIDENCE");
  const logs = data?.data ?? [];
  const ktvNotes = KTV_NOTES_BY_REPORT[reportId];
  const busy = adding || isUploading;

  const submit = async () => {
    const text = note.trim();
    if (!text) return;
    try {
      // Ảnh upload thẳng lên Cloudinary trước, rồi gửi MediaUpload kèm nhật ký (stage PROGRESS)
      const attachments = files.length > 0 ? await upload(files) : undefined;
      await addLog({ reportId, note: text, attachments }).unwrap();
      toast.success("Ghi nhận nhật ký thành công", {
        description: `Bước xử lý kỹ thuật${files.length > 0 ? ` kèm ${files.length} ảnh` : ""} đã được lưu vào hồ sơ.`,
      });
      setNote("");
      setFiles([]);
      resetUpload();
    } catch (err) {
      if (!isHandledUploadError(err)) {
        toast.error("Không thêm được ghi chú", {
          description: getMediaErrorMessage(err, "Vui lòng thử lại sau."),
        });
      }
    }
  };

  // Nhật ký cũ (trước khi có Cloudinary) dán link ảnh vào cuối ghi chú
  const extractImages = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)|data:image\/[a-zA-Z]+;base64,[^\s]+)/gi;
    return content.match(urlRegex) || [];
  };

  const stripImages = (content: string) =>
    content.replace(/\[Ảnh đính kèm\]\n(https?:\/\/[^\n]+\n?)*/g, "").trim();

  const logPhotos = (log: RepairLogResponse): GalleryPhoto[] => {
    if (log.attachments?.length) {
      return log.attachments.map((a, idx) => ({
        key: `att-${a.id}`,
        url: a.url,
        thumbnailUrl: a.thumbnailUrl,
        alt: `Ảnh ${idx + 1} của nhật ký #${log.id}`,
        caption: a.caption,
        meta: `Tải lên ${formatDT(a.createdAt)}`,
        badge: `Ảnh ${idx + 1}`,
      }));
    }
    return extractImages(log.note).map((url, idx) => ({
      key: `legacy-${log.id}-${idx}`,
      url,
      alt: `Ảnh ${idx + 1} của nhật ký #${log.id}`,
      meta: "Ảnh cũ đính kèm dạng link trong ghi chú",
      badge: `Ảnh ${idx + 1}`,
    }));
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setOpen(true)}>
        <History className="w-3.5 h-3.5" /> Nhật ký
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl p-0">
          {/* Header */}
          <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Hồ sơ xử lý · {title}
            </DialogTitle>
            {/* Section switcher */}
            <div className="flex gap-1 mt-2">
              <button
                type="button"
                onClick={() => setActiveSection("info")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeSection === "info"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <FileText className="inline w-3 h-3 mr-1" />
                Chi tiết phiếu
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("logs")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeSection === "logs"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <History className="inline w-3 h-3 mr-1" />
                Nhật ký KTV ({logs.length})
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">

            {/* ── SECTION: Chi tiết phiếu ── */}
            {activeSection === "info" && (
              <div className="space-y-3">
                {/* Report meta */}
                <div className="p-3 rounded-xl border border-border/70 bg-muted/30 space-y-2 text-xs">
                  <p className="font-semibold text-foreground text-sm">{report?.title ?? title}</p>
                  {/* User report content */}
                  {report?.description && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" /> Nội dung khách hàng báo cáo:
                      </span>
                      <p className="text-foreground bg-muted/50 p-2 rounded-md border border-border/50 leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                  )}

                  {/* Timestamps grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian tạo phiếu:</p>
                      <p className="font-mono text-foreground">{formatDT(report?.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian phân công:</p>
                      <p className="font-mono text-foreground">{formatDT(report?.assignedAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Hạn xử lý SLA:</p>
                      <p className={`font-mono font-semibold ${report?.overdue ? "text-rose-600" : "text-foreground"}`}>
                        {formatDT(report?.slaDueAt)}
                        {report?.overdue ? " ⚠️ Quá hạn" : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian hoàn thành:</p>
                      <p className="font-mono text-foreground">{formatDT(report?.resolvedAt)}</p>
                    </div>
                  </div>

                  {/* Duration */}
                  {(report?.assignedAt || report?.createdAt) && report?.resolvedAt && (
                    <div className="pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                      Thời gian xử lý thực tế:{" "}
                      <span className="font-bold text-foreground">
                        {calcDuration(report?.assignedAt || report?.createdAt, report?.resolvedAt)}
                      </span>
                    </div>
                  )}

                  {/* Reporter info */}
                  {(report?.reporterName || report?.reporterPhone) && (
                    <div className="pt-1 border-t border-border/40 flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">Người báo cáo:</span>
                      <span className="font-medium text-foreground">
                        {[report.reporterName, report.reporterPhone].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* KTV Technical Notes */}
                {ktvNotes && (
                  <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2 text-xs">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      Biên bản kỹ thuật của KTV
                    </p>
                    <p className="text-foreground leading-relaxed">{ktvNotes.technicianNote}</p>
                    {ktvNotes.partsReplaced && (
                      <div className="flex gap-1.5 flex-wrap pt-1 border-t border-indigo-200/60">
                        <span className="text-muted-foreground shrink-0">Linh kiện thay thế:</span>
                        <span className="font-medium text-foreground">{ktvNotes.partsReplaced}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-200/60">
                      {ktvNotes.claimedAt && (
                        <div>
                          <p className="text-muted-foreground">KTV nhận việc lúc:</p>
                          <p className="font-mono font-medium text-foreground">{ktvNotes.claimedAt}</p>
                        </div>
                      )}
                      {ktvNotes.resolvedAt && (
                        <div>
                          <p className="text-muted-foreground">KTV báo xong lúc:</p>
                          <p className="font-mono font-medium text-emerald-700 dark:text-emerald-400">{ktvNotes.resolvedAt}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SECTION: Nhật ký KTV ── */}
            {activeSection === "logs" && (
              <>
                <div className="space-y-3">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Đang tải nhật ký...</p>
                  ) : logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Chưa có nhật ký nào. Thêm bước xử lý đầu tiên bên dưới.
                    </p>
                  ) : (
                    logs.map((l) => {
                      const images = logPhotos(l);
                      const displayNote = l.attachments?.length ? l.note : stripImages(l.note);
                      return (
                        <div key={l.id} className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2">
                          {/* Note text */}
                          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{displayNote}</p>

                          {/* Ảnh trong quá trình sửa gắn với dòng nhật ký */}
                          {images.length > 0 && (
                            <div className="pt-2 border-t border-border/50">
                              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                                Ảnh trong quá trình sửa ({images.length} ảnh):
                              </span>
                              <PhotoGallery
                                photos={images}
                                title={`Ảnh nhật ký · ${title}`}
                                thumbClassName="w-20 h-20 rounded-lg border-border bg-slate-100"
                              />
                            </div>
                          )}

                          {/* Timestamp + actor */}
                          <p className="text-[11px] text-muted-foreground font-mono flex items-center justify-between pt-1 border-t border-border/40">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDT(l.createdAt)}
                            </span>
                            <span className="font-semibold text-foreground">
                              {technicianName ?? (l.actorUserId ? `KTV #${l.actorUserId}` : "Hệ thống")}
                            </span>
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add log form */}
                <div className="pt-2 border-t space-y-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú bước xử lý kỹ thuật (ví dụ: 'Đã kiểm tra bo mạch chủ, phát hiện tụ điện phồng...')"
                    rows={3}
                    className="text-xs resize-none"
                    disabled={busy}
                  />

                  {/* Ảnh trong quá trình sửa (upload Cloudinary, stage PROGRESS) */}
                  <PhotoPicker
                    value={files}
                    onChange={setFiles}
                    maxFiles={LOG_PHOTO_MAX}
                    disabled={busy}
                    uploadItems={uploadItems}
                  />

                  <Button
                    onClick={submit}
                    disabled={busy || !note.trim()}
                    className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isUploading
                      ? "Đang tải ảnh..."
                      : adding
                        ? "Đang lưu..."
                        : `Ghi nhận bước xử lý${files.length > 0 ? ` + ${files.length} ảnh` : ""}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
