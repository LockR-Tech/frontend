import { useState, useRef } from "react";
import {
  History,
  Send,
  Image as ImageIcon,
  ExternalLink,
  Camera,
  X,
  Paperclip,
  User,
  Clock,
  FileText,
  MapPin,
  Boxes,
  Wrench,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import {
  useGetReportLogsQuery,
  useAddReportLogMutation,
  useGetMaintenanceReportsQuery,
  type LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { KTV_NOTES_BY_REPORT, getUserPhotos } from "./maintenancePhotos";

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
/// - Chi tiết phiếu: Kiosk, ô tủ, nội dung khách báo, KTV phụ trách, các mốc thời gian SLA
/// - Ghi chú kỹ thuật của KTV (biên bản, linh kiện thay, thời gian nhận/xong)
/// - Nhật ký xử lý từng bước (work-log) với ảnh nghiệm thu
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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"info" | "logs">("info");
  const urlInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useGetReportLogsQuery(reportId, { skip: !open });
  const { data: allReportsData } = useGetMaintenanceReportsQuery(undefined, { skip: !open });
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 }, { skip: !open });
  const [addLog, { isLoading: adding }] = useAddReportLogMutation();

  const logs = data?.data ?? [];
  const eff = report ?? allReportsData?.data?.find((r) => r.id === reportId);
  const ktvNotes = KTV_NOTES_BY_REPORT[reportId];
  const userPhotos = eff ? getUserPhotos(eff) : [];

  const rawUsers = usersData?.data as unknown;
  const userList: any[] = Array.isArray(rawUsers)
    ? rawUsers
    : (rawUsers as { content?: any[] })?.content ?? [];

  const reporterUser = eff?.userId ? userList.find((u) => u.id === eff.userId) : undefined;
  const assignedUser = eff?.assignedToUserId ? userList.find((u) => u.id === eff.assignedToUserId) : undefined;

  const isReporterTech = Boolean(
    reporterUser?.roles?.some((role: string) =>
      role.includes("TECHNICIAN") || role.includes("MAINTENANCE")
    ) ||
    eff?.reporterName?.toLowerCase().includes("kỹ thuật viên") ||
    eff?.reporterName?.toLowerCase().includes("ktv") ||
    eff?.reporterName?.toLowerCase().includes("technician") ||
    eff?.reporterName?.toLowerCase().includes("maintenance")
  );

  // If a technician reported the issue, they are also the technician in charge!
  const effectiveAssignedToUserId = eff?.assignedToUserId ?? (isReporterTech ? eff?.userId : undefined);
  const effectiveAssignedAt = eff?.assignedAt ?? (isReporterTech ? eff?.createdAt : undefined);
  const effectiveStatus = eff?.status === "OPEN" && isReporterTech ? "IN_PROGRESS" : eff?.status;

  const effectiveTechnicianName =
    technicianName ??
    (assignedUser?.fullName || assignedUser?.name) ??
    (isReporterTech
      ? (reporterUser?.fullName || reporterUser?.name || eff?.reporterName)
      : (eff?.assignedToUserId ? `KTV #${eff.assignedToUserId}` : undefined));

  const addImageUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (!imageUrls.includes(u)) {
      setImageUrls((prev) => [...prev, u]);
    }
    setUrlInput("");
    urlInputRef.current?.focus();
  };

  const removeImageUrl = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    const text = note.trim();
    if (!text) return;
    const fullNote = imageUrls.length > 0
      ? `${text}\n\n[Ảnh đính kèm]\n${imageUrls.join("\n")}`
      : text;
    try {
      await addLog({ reportId, note: fullNote }).unwrap();
      toast.success("Ghi nhận nhật ký thành công", {
        description: `Bước xử lý kỹ thuật${imageUrls.length > 0 ? ` kèm ${imageUrls.length} ảnh` : ""} đã được lưu vào hồ sơ.`,
      });
      setNote("");
      setImageUrls([]);
    } catch (err: any) {
      toast.error("Không thêm được ghi chú", {
        description: err?.data?.message || err?.message || "Vui lòng thử lại sau.",
      });
    }
  };

  const extractImages = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)|data:image\/[a-zA-Z]+;base64,[^\s]+)/gi;
    return content.match(urlRegex) || [];
  };

  const stripImages = (content: string) =>
    content.replace(/\[Ảnh đính kèm\]\n(https?:\/\/[^\n]+\n?)*/g, "").trim();

  return (
    <>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setOpen(true)}>
        <FileText className="w-3.5 h-3.5 text-indigo-600" />
        Nhật ký
        {logs.length > 0 && (
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-bold">
            {logs.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-5 pt-4 pb-2 border-b border-border/60">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Hồ sơ xử lý · #{reportId} · {eff?.title ?? title}
              </DialogTitle>
            </div>
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
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 space-y-3 text-xs">
                  {/* Status & Kiosk header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          #{eff?.id ?? reportId} · {eff?.title ?? title}
                        </span>
                        {effectiveStatus === "RESOLVED" ? (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                            Đã hoàn tất
                          </Badge>
                        ) : effectiveStatus === "IN_PROGRESS" ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-semibold">
                            Đang xử lý {isReporterTech && !eff?.assignedToUserId ? "(KTV tự báo & phụ trách)" : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-semibold">
                            Mới mở / Chưa phân công
                          </Badge>
                        )}
                        {eff?.overdue && (
                          <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-[10px]">
                            Quá hạn SLA
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span className="font-medium text-foreground">
                          {eff?.lockerName ?? `Kiosk #${eff?.lockerId ?? "—"}`}
                          {eff?.lockerCode ? ` (${eff.lockerCode})` : ""}
                        </span>
                        {eff?.boxNumber != null && (
                          <span className="text-foreground font-semibold">
                            · Ô #{eff.boxNumber} {eff.cellType ? `(${eff.cellType})` : ""}
                          </span>
                        )}
                      </p>
                      {eff?.lockerAddress && (
                        <p className="text-[11px] text-muted-foreground pl-5 mt-0.5">{eff.lockerAddress}</p>
                      )}
                    </div>
                  </div>

                  {/* User report content */}
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Nội dung sự cố báo cáo:
                    </span>
                    <p className="text-foreground bg-muted/50 p-2.5 rounded-md border border-border/50 leading-relaxed">
                      {eff?.description || "Không có mô tả chi tiết sự cố."}
                    </p>
                    {userPhotos.length > 0 && (
                      <div className="pt-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                          <Camera className="w-3.5 h-3.5 text-amber-600" /> Ảnh hiện trường User gửi ({userPhotos.length} ảnh):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {userPhotos.map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImage(p.url)}
                              className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border bg-slate-100 hover:opacity-90 transition-opacity"
                            >
                              <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] text-center px-0.5 truncate">
                                {p.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timestamps & Personnel grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/50">
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian tạo phiếu:</p>
                      <p className="font-mono text-foreground font-medium">{formatDT(eff?.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> KTV phụ trách:</p>
                      <p className="font-medium text-foreground">
                        {effectiveTechnicianName ? (
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                            {effectiveTechnicianName}
                            {isReporterTech && !eff?.assignedToUserId && (
                              <span className="ml-1 text-[10px] text-muted-foreground font-normal">(Người báo)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Chưa phân công</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian phân công:</p>
                      <p className="font-mono text-foreground font-medium">
                        {effectiveAssignedAt ? formatDT(effectiveAssignedAt) : "Chưa phân công"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Hạn xử lý SLA:</p>
                      <p className={`font-mono font-semibold ${eff?.overdue ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                        {eff?.slaDueAt ? formatDT(eff.slaDueAt) : "Quy chuẩn SLA 4h"}
                        {eff?.overdue ? " ⚠️ Quá hạn" : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian hoàn tất:</p>
                      <p className={`font-mono font-medium ${eff?.resolvedAt ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {eff?.resolvedAt ? formatDT(eff.resolvedAt) : (effectiveStatus === "RESOLVED" ? "Đã hoàn tất" : "Đang xử lý")}
                      </p>
                    </div>
                    {eff?.resolvedAt && (effectiveAssignedAt || eff?.createdAt) && (
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian xử lý:</p>
                        <p className="font-bold text-foreground">
                          {calcDuration(effectiveAssignedAt || eff?.createdAt, eff.resolvedAt)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Reporter info */}
                  {(eff?.reporterName || eff?.reporterPhone) && (
                    <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-[11px] flex-wrap">
                      <span className="text-muted-foreground">Người báo cáo:</span>
                      <span className="font-medium text-foreground">
                        {[eff.reporterName, eff.reporterPhone].filter(Boolean).join(" · ")}
                      </span>
                      {isReporterTech && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1.5 font-semibold">
                          Kỹ thuật viên Kiosk (Phụ trách xử lý)
                        </Badge>
                      )}
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
                      const images = extractImages(l.note);
                      const displayNote = stripImages(l.note);
                      return (
                        <div key={l.id} className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2">
                          {/* Note text */}
                          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{displayNote}</p>

                          {/* Image gallery — multi-photo */}
                          {images.length > 0 && (
                            <div className="pt-2 border-t border-border/50">
                              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                                Ảnh chụp hiện trường / Bằng chứng sửa chữa ({images.length} ảnh):
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {images.map((imgUrl, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setPreviewImage(imgUrl)}
                                    className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border bg-slate-100 hover:opacity-90 transition-opacity"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`Ảnh ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                      <ExternalLink className="w-4 h-4" />
                                    </div>
                                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] text-center px-1 py-0.5">
                                      Ảnh {idx + 1}
                                    </span>
                                  </button>
                                ))}
                              </div>
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
                  />

                  {/* Multi-image URL input */}
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        ref={urlInputRef}
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImageUrl())}
                        placeholder="Dán link ảnh (https://...jpg) rồi nhấn + để thêm nhiều ảnh"
                        className="flex-1 h-8 px-3 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addImageUrl}
                        disabled={!urlInput.trim()}
                        className="h-8 px-2 text-xs"
                      >
                        <Paperclip className="w-3.5 h-3.5 mr-1" /> + Thêm ảnh
                      </Button>
                    </div>

                    {/* Preview of added images */}
                    {imageUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md border border-border/50">
                        {imageUrls.map((url, idx) => (
                          <div key={idx} className="relative group w-16 h-16">
                            <img
                              src={url}
                              alt={`Ảnh ${idx + 1}`}
                              className="w-full h-full object-cover rounded-md border border-border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text y='18' font-size='18'>🖼️</text></svg>";
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeImageUrl(idx)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <p className="w-full text-[10px] text-muted-foreground pt-1">
                          {imageUrls.length} ảnh sẽ được đính kèm vào ghi chú này
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={submit}
                    disabled={adding || !note.trim()}
                    className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {adding ? "Đang lưu..." : `Ghi nhận bước xử lý${imageUrls.length > 0 ? ` + ${imageUrls.length} ảnh` : ""}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Image Preview */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-0 rounded-2xl overflow-hidden">
            <div className="relative flex items-center justify-center p-2">
              <img
                src={previewImage}
                alt="Ảnh phóng to"
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
