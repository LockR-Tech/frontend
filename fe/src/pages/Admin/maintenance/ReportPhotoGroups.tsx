import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Camera, CheckCircle2, Clock, ShieldCheck, Wrench } from "lucide-react";
import { PhotoGallery, type GalleryPhoto } from "~/components/shared/media";
import type { LockerReportResponse } from "~/stores/apis/admin/lockerOps";
import type { AttachmentStage } from "~/stores/apis/media";
import { formatDateTime } from "~/lib/datetime";
import {
  ATTACHMENT_STAGES,
  STAGE_LABELS,
  groupReportPhotos,
  type ReportPhoto,
} from "./maintenancePhotos";

// Giờ backend là UTC không offset ⇒ luôn qua ~/lib/datetime để ra giờ VN
const formatPhotoTime = (dateStr?: string | null) => (dateStr ? formatDateTime(dateStr) : "");

const formatPhotoShortTime = (dateStr?: string | null) => {
  // "HH:mm:ss dd/MM/yyyy" ⇒ "HH:mm dd/MM"
  const m = /^(\d{2}:\d{2}):\d{2} (\d{2}\/\d{2})\/\d{4}$/.exec(formatPhotoTime(dateStr));
  return m ? `${m[1]} ${m[2]}` : "";
};

// Màu giữ theo quy ước cũ của trang: người báo = rose, KTV = amber, đang sửa = blue, nghiệm thu = emerald
// `badgeKey` là khoá i18n, dịch lúc render
const STAGE_STYLE: Record<
  AttachmentStage,
  { chip: string; heading: string; thumb: string; icon: typeof Camera; badgeKey: string }
> = {
  REPORT: {
    chip: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60",
    heading: "text-rose-700 dark:text-rose-300",
    thumb: "border-rose-300 dark:border-rose-800 hover:border-rose-500 ring-1 ring-rose-200/50",
    icon: Camera,
    badgeKey: "admin.maintenance.photos.badge.reporter",
  },
  INSPECTION: {
    chip: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/60",
    heading: "text-amber-700 dark:text-amber-300",
    thumb: "border-amber-300 dark:border-amber-800 hover:border-amber-500",
    icon: ShieldCheck,
    badgeKey: "admin.maintenance.photos.badge.technicianVerified",
  },
  PROGRESS: {
    chip: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/60",
    heading: "text-blue-700 dark:text-blue-300",
    thumb: "border-blue-300 dark:border-blue-800 hover:border-blue-500",
    icon: Wrench,
    badgeKey: "admin.maintenance.photos.badge.repairing",
  },
  RESOLUTION: {
    chip: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/60",
    heading: "text-emerald-700 dark:text-emerald-300",
    thumb: "border-emerald-300 dark:border-emerald-700 hover:border-emerald-500 ring-1 ring-emerald-200/50",
    icon: CheckCircle2,
    badgeKey: "admin.maintenance.photos.badge.acceptance",
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
  const { t } = useTranslation();
  const groups = useMemo(() => groupReportPhotos(report), [report]);
  const total = ATTACHMENT_STAGES.reduce((sum, stage) => sum + groups[stage].length, 0);

  const uploaderName = (photo: ReportPhoto) => {
    const id = photo.uploadedByUserId;
    if (id == null) return undefined;
    if (userNames?.[id]) return userNames[id];
    if (id === report.userId && report.reporterName) return report.reporterName;
    return t("admin.maintenance.photos.userNumber", { id });
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
        alt: t("admin.maintenance.photos.gallery.alt", { stage: STAGE_LABELS[stage], index: idx + 1, id: report.id }),
        caption: photo.caption,
        time: timeShort,
        uploader,
        meta: [
          uploader && t("admin.maintenance.photos.gallery.uploadedBy", { name: uploader }),
          timeExact &&
            (photo.capturedAt
              ? t("admin.maintenance.photos.gallery.capturedAt", { time: timeExact })
              : t("admin.maintenance.photos.gallery.uploadedAt", { time: timeExact })),
          photo.attachmentId == null && t("admin.maintenance.photos.gallery.inDescription"),
        ]
          .filter(Boolean)
          .join(" · "),
        badge: variant === "compact" ? t(STAGE_STYLE[stage].badgeKey) : undefined,
        deletable: false,
      };
    });

  if (variant === "compact") {
    return (
      <div className="mt-2 space-y-1.5">
        {ATTACHMENT_STAGES.map((stage) => {
          const style = STAGE_STYLE[stage];
          const Icon = style.icon;
          const stagePhotos = groups[stage];
          return (
            <div key={stage} className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] font-semibold flex items-center gap-1 shrink-0 px-2 py-0.5 rounded border shadow-2xs ${style.chip}`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {t("admin.maintenance.photos.gallery.stageCount", { stage: STAGE_LABELS[stage], count: stagePhotos.length })}
              </span>
              {stagePhotos.length > 0 ? (
                <PhotoGallery
                  photos={toGalleryPhotos(stage, stagePhotos)}
                  title={t("admin.maintenance.photos.gallery.compactTitle", { stage: STAGE_LABELS[stage], id: report.id, title: report.title })}
                  thumbClassName={`w-14 h-14 ${style.thumb}`}
                />
              ) : (
                <span className="text-[11px] text-muted-foreground italic">{t("admin.maintenance.photos.gallery.noPhotos")}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-border/60 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          {t("admin.maintenance.photos.gallery.reportPhotos", { count: total })}
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
              {t("admin.maintenance.photos.gallery.stageCount", { stage: STAGE_LABELS[stage], count: stagePhotos.length })}
            </p>
            {stagePhotos.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic pl-5">{t("admin.maintenance.photos.gallery.noPhotos")}</p>
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
                        title={t("admin.maintenance.photos.gallery.stackedTitle", { stage: STAGE_LABELS[stage], id: report.id })}
                        thumbClassName={`w-16 h-16 rounded-md shrink-0 shadow-xs ${style.thumb}`}
                      />
                      <div className="flex-1 min-w-0 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-foreground">
                            {t("admin.maintenance.photos.gallery.photoNumber", { index: pIdx + 1 })}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${style.chip}`}>
                            {t(style.badgeKey)}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground font-mono font-medium flex items-center gap-1 text-slate-700 dark:text-slate-200">
                          <Clock className="w-3 h-3 shrink-0 text-indigo-500" />
                          <span>{timeExact || "—"}</span>
                        </p>
                        {photo.uploader && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {t("admin.maintenance.photos.gallery.sender")}{" "}
                            <span className="font-medium text-foreground">{photo.uploader}</span>
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

