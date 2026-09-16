import { useMemo } from "react";
import { Camera, CheckCircle2, Clock, ShieldCheck, Wrench } from "lucide-react";
import { PhotoGallery, type GalleryPhoto } from "~/components/shared/media";
import type { LockerReportResponse } from "~/stores/apis/admin/lockerOps";
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
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatPhotoShortTime = (dateStr?: string | null) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
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
  /** Admin chỉ xem (Read-only) theo nghiệp vụ hệ thống. */
  canManage?: boolean;
}

/// 4 nhóm ảnh phiếu sự cố (người báo · KTV xác nhận · trong khi sửa · nghiệm thu) + lightbox + hiển thị thời gian chi tiết.
export function ReportPhotoGroups({
  report,
  variant = "compact",
  userNames,
}: ReportPhotoGroupsProps) {
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
    photos.map((photo, idx) => {
      const timeExact = formatPhotoTime(photo.capturedAt || photo.createdAt);
      const timeShort = formatPhotoShortTime(photo.capturedAt || photo.createdAt);
      const uploader = uploaderName(photo);
      return {
        key: photo.key,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        alt: `${STAGE_LABELS[stage]} ${idx + 1} — phiếu #${report.id}`,
        caption: photo.caption,
        time: timeShort,
        uploader,
        meta: [
          uploader && `Người tải: ${uploader}`,
          timeExact && (photo.capturedAt ? `Chụp lúc ${timeExact}` : `Tải lên ${timeExact}`),
          photo.attachmentId == null && "Ảnh đính kèm trong mô tả",
        ]
          .filter(Boolean)
          .join(" · "),
        badge: variant === "compact" ? STAGE_STYLE[stage].badge : undefined,
        deletable: false,
      };
    });

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
                thumbClassName={`w-14 h-14 ${style.thumb}`}
              />
            </div>
          );
        })}
        {total === 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground italic">Chưa có ảnh đính kèm</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="pt-2 border-t border-border/60 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          Hình ảnh phiếu ({total} ảnh)
        </p>
      </div>
      {ATTACHMENT_STAGES.map((stage) => {
        const style = STAGE_STYLE[stage];
        const Icon = style.icon;
        const stagePhotos = groups[stage];
        const galleryItems = toGalleryPhotos(stage, stagePhotos);

        return (
          <div key={stage} className="space-y-1.5">
            <p className={`text-xs font-semibold flex items-center gap-1.5 ${style.heading}`}>
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {STAGE_LABELS[stage]} ({stagePhotos.length} ảnh):
            </p>
            {stagePhotos.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic pl-5">Chưa có ảnh</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {galleryItems.map((photo, pIdx) => {
                  const rawPhoto = stagePhotos[pIdx];
                  const timeExact = formatPhotoTime(rawPhoto?.capturedAt || rawPhoto?.createdAt);
                  return (
                    <div
                      key={photo.key}
                      className="flex items-start gap-2.5 p-2 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition-colors shadow-2xs"
                    >
                      <PhotoGallery
                        photos={[photo]}
                        title={`${STAGE_LABELS[stage]} · Phiếu sự cố #${report.id}`}
                        thumbClassName={`w-16 h-16 rounded-md shrink-0 shadow-xs ${style.thumb}`}
                      />
                      <div className="flex-1 min-w-0 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-foreground">
                            Ảnh #{pIdx + 1}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${style.chip}`}>
                            {style.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground font-mono font-medium flex items-center gap-1 text-slate-700 dark:text-slate-200">
                          <Clock className="w-3 h-3 shrink-0 text-indigo-500" />
                          <span>{timeExact || "—"}</span>
                        </p>
                        {photo.uploader && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            Người gửi: <span className="font-medium text-foreground">{photo.uploader}</span>
                          </p>
                        )}
                        {photo.caption && (
                          <p className="text-[10px] text-foreground/80 italic line-clamp-1">{photo.caption}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

