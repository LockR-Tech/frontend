import { useEffect, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

export interface GalleryPhoto {
  key: string | number;
  /** Ảnh gốc — dùng trong lightbox. */
  url: string;
  /** Ảnh thu nhỏ (Cloudinary `thumbnailUrl`); thiếu thì dùng `url`. */
  thumbnailUrl?: string | null;
  alt?: string;
  caption?: string | null;
  /** Dòng phụ trong lightbox, ví dụ "Người tải: KTV A · 08:10 15/09/2026". */
  meta?: string | null;
  /** Nhãn nhỏ in trên thumbnail. */
  badge?: string;
  /** Thời gian chụp/tải lên cụ thể, hiển thị trực tiếp trên thumbnail. */
  time?: string | null;
  /** Người tải ảnh lên. */
  uploader?: string | null;
  /** `false` ⇒ ẩn nút xoá cho ảnh này (ví dụ ảnh legacy lấy từ mô tả). */
  deletable?: boolean;
}

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  /** Có ⇒ hiện nút xoá (kèm hộp xác nhận) trong lightbox. */
  onDelete?: (photo: GalleryPhoto) => Promise<void> | void;
  /** Tiêu đề lightbox, ví dụ "Ảnh nghiệm thu · Phiếu #12". */
  title?: string;
  emptyText?: string;
  className?: string;
  thumbClassName?: string;
}

/// Lưới thumbnail + lightbox (Dialog) xem ảnh lớn, chuyển ảnh trước/sau, xoá có xác nhận.
export function PhotoGallery({
  photos,
  onDelete,
  title,
  emptyText,
  className,
  thumbClassName,
}: PhotoGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const current = openIndex != null ? photos[openIndex] : undefined;

  // Danh sách đổi (ví dụ vừa xoá ảnh) ⇒ giữ index hợp lệ
  useEffect(() => {
    if (openIndex != null && openIndex >= photos.length) {
      setOpenIndex(photos.length > 0 ? photos.length - 1 : null);
    }
  }, [photos.length, openIndex]);

  const step = (delta: number) => {
    if (openIndex == null || photos.length === 0) return;
    setOpenIndex((openIndex + delta + photos.length) % photos.length);
  };

  if (photos.length === 0) {
    return emptyText ? <p className={cn("text-[11px] text-muted-foreground italic", className)}>{emptyText}</p> : null;
  }

  const handleConfirmDelete = async () => {
    if (!confirmDelete || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(confirmDelete);
      setConfirmDelete(null);
    } catch {
      // Nơi gọi đã báo lỗi (toast) — giữ hộp xác nhận để thử lại
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {photos.map((photo, idx) => (
          <div key={photo.key} className="flex flex-col items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex(idx);
              }}
              className={cn(
                "relative w-16 h-16 rounded-md overflow-hidden border border-border/80 hover:border-foreground/50 transition-all group shrink-0 cursor-pointer shadow-2xs bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                thumbClassName,
              )}
              title={photo.caption ?? photo.alt ?? (photo.time ? `Thời gian: ${photo.time}` : undefined)}
              aria-label={`Xem ảnh ${photo.alt ?? idx + 1}`}
            >
              <img
                src={photo.thumbnailUrl || photo.url}
                alt={photo.alt ?? `Ảnh ${idx + 1}`}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-3.5 h-3.5 text-white" aria-hidden />
              </div>
              {photo.badge && (
                <span className="absolute top-0.5 left-0.5 bg-black/75 backdrop-blur-xs text-[8px] text-white rounded px-1 font-medium z-10">
                  {photo.badge}
                </span>
              )}
              {photo.time && (
                <span className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs text-[8px] text-white text-center font-mono truncate px-0.5 py-0.5 font-medium z-10">
                  {photo.time}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>

      <Dialog open={openIndex != null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent
          className="max-w-3xl p-4"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") step(-1);
            if (e.key === "ArrowRight") step(1);
          }}
        >
          <DialogHeader className="pb-2 border-b pr-8">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" aria-hidden />
              {title ?? "Hình ảnh"}
              {photos.length > 1 && openIndex != null && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({openIndex + 1}/{photos.length})
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Xem ảnh kích thước lớn. Dùng phím mũi tên trái/phải để chuyển ảnh.
            </DialogDescription>
          </DialogHeader>

          {current && (
            <div className="relative rounded-lg overflow-hidden border border-border/80 bg-black/95 flex items-center justify-center min-h-[280px] max-h-[70vh]">
              <img
                src={current.url}
                alt={current.alt ?? current.caption ?? "Ảnh phóng to"}
                className="max-h-[68vh] w-auto max-w-full object-contain"
              />
              {photos.length > 1 && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                    onClick={() => step(-1)}
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                    onClick={() => step(1)}
                    aria-label="Ảnh sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          )}

          {current && (
            <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
              <div className="min-w-0 space-y-0.5">
                {current.caption && <p className="font-medium text-foreground break-words">{current.caption}</p>}
                {current.meta && <p className="text-muted-foreground">{current.meta}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
                  <a href={current.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" /> Ảnh gốc
                  </a>
                </Button>
                {onDelete && current.deletable !== false && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => setConfirmDelete(current)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xoá ảnh
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && !deleting && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá ảnh này?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh sẽ bị gỡ khỏi hồ sơ và xoá khỏi kho lưu trữ. Không thể hoàn tác thao tác này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Xoá ảnh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
