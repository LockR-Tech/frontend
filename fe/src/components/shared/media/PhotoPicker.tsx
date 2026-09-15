import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import {
  DEFAULT_MAX_IMAGE_BYTES,
  IMAGE_ACCEPT_ATTR,
  detectImageFormat,
  formatBytes,
  validateImageFile,
} from "~/lib/cloudinary-upload";
import type { UploadProgressItem } from "~/hooks/useImageUpload";

interface PhotoPickerProps {
  /** Danh sách file đang chọn (controlled). */
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxBytes?: number;
  disabled?: boolean;
  /** Tiến trình từ `useImageUpload().items` — khớp theo `File`. */
  uploadItems?: UploadProgressItem[];
  /** Bắt Ctrl+V ảnh ở cả cửa sổ (mặc định bật) — tắt nếu trang có nhiều picker cùng lúc. */
  pasteFromWindow?: boolean;
  hint?: string;
  className?: string;
}

const BROWSER_PREVIEWABLE = ["jpg", "jpeg", "png", "webp", "gif"];

/// Chọn ảnh bằng click / kéo-thả / dán, xem trước, bỏ ảnh và hiện tiến trình upload.
export function PhotoPicker({
  value,
  onChange,
  maxFiles = 10,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
  disabled = false,
  uploadItems,
  pasteFromWindow = true,
  hint,
  className,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<Map<File, string>>(new Map());
  const [brokenPreviews, setBrokenPreviews] = useState<Set<File>>(new Set());

  // Object URL cho ảnh xem trước; thu hồi khi danh sách đổi / unmount
  useEffect(() => {
    const map = new Map<File, string>();
    value.forEach((file) => {
      const format = detectImageFormat(file);
      if (format && BROWSER_PREVIEWABLE.includes(format)) {
        map.set(file, URL.createObjectURL(file));
      }
    });
    setPreviews(map);
    return () => map.forEach((url) => URL.revokeObjectURL(url));
  }, [value]);

  // Giữ tham chiếu mới nhất cho listener paste ở window
  const addFilesRef = useRef<(files: File[]) => void>(() => {});

  const addFiles = (incoming: File[]) => {
    if (disabled || incoming.length === 0) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of incoming) {
      const error = validateImageFile(file, { maxBytes, beforeDownscale: true });
      if (error) rejected.push(error);
      else accepted.push(file);
    }

    const room = Math.max(0, maxFiles - value.length);
    if (accepted.length > room) {
      rejected.push(`Chỉ được chọn tối đa ${maxFiles} ảnh`);
    }
    const next = accepted.slice(0, room);

    if (rejected.length > 0) {
      toast.error("Một số ảnh không được thêm", { description: rejected.slice(0, 3).join(" · ") });
    }
    if (next.length > 0) onChange([...value, ...next]);
  };
  addFilesRef.current = addFiles;

  useEffect(() => {
    if (!pasteFromWindow || disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter(
        (f) => f.type.startsWith("image/") || detectImageFormat(f),
      );
      if (files.length === 0) return;
      e.preventDefault();
      addFilesRef.current(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pasteFromWindow, disabled]);

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const progressOf = (file: File) => uploadItems?.find((it) => it.file === file);
  const isBusy = uploadItems?.some((it) => it.status === "uploading" || it.status === "queued") ?? false;
  const canAdd = !disabled && value.length < maxFiles;

  return (
    <div
      role="group"
      aria-label="Chọn ảnh đính kèm"
      className={cn(
        "rounded-lg border border-dashed p-2.5 transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20",
        disabled && "opacity-70",
        className,
      )}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(Array.from(e.dataTransfer.files ?? []));
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        multiple={maxFiles > 1}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        {value.map((file, idx) => {
          const item = progressOf(file);
          const preview = previews.get(file);
          const showImage = preview && !brokenPreviews.has(file);
          const uploading = item?.status === "uploading" || item?.status === "queued";
          return (
            <div
              key={`${file.name}-${file.lastModified}-${idx}`}
              className={cn(
                "relative w-20 h-20 rounded-md overflow-hidden border bg-muted shrink-0",
                item?.status === "error" ? "border-rose-400" : "border-border",
              )}
              title={item?.error ?? `${file.name} · ${formatBytes(file.size)}`}
            >
              {showImage ? (
                <img
                  src={preview}
                  alt={`Ảnh xem trước ${file.name}`}
                  className="w-full h-full object-cover"
                  onError={() => setBrokenPreviews((prev) => new Set(prev).add(file))}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-muted-foreground px-1">
                  <ImagePlus className="w-4 h-4" aria-hidden />
                  <span className="text-[9px] font-mono uppercase truncate max-w-full">
                    {detectImageFormat(file) ?? "ảnh"}
                  </span>
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                  <Loader2 className="w-4 h-4 text-white animate-spin" aria-hidden />
                  <span className="text-[10px] font-semibold text-white">{item?.progress ?? 0}%</span>
                </div>
              )}
              {uploading && (
                <div
                  className="absolute bottom-0 inset-x-0 h-1 bg-black/30"
                  role="progressbar"
                  aria-label={`Tiến trình tải ${file.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item?.progress ?? 0}
                >
                  <div className="h-full bg-emerald-400 transition-all" style={{ width: `${item?.progress ?? 0}%` }} />
                </div>
              )}
              {item?.status === "done" && (
                <span className="absolute bottom-1 left-1 rounded-full bg-emerald-600 text-white p-0.5" aria-label="Đã tải lên">
                  <CheckCircle2 className="w-3 h-3" aria-hidden />
                </span>
              )}
              {item?.status === "error" && (
                <span className="absolute bottom-1 left-1 rounded-full bg-rose-600 text-white p-0.5" aria-label={`Lỗi: ${item.error ?? ""}`}>
                  <AlertCircle className="w-3 h-3" aria-hidden />
                </span>
              )}

              <button
                type="button"
                onClick={() => removeAt(idx)}
                disabled={disabled || isBusy}
                aria-label={`Bỏ ảnh ${file.name}`}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-3 h-3" aria-hidden />
              </button>
            </div>
          );
        })}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isBusy}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              value.length === 0 ? "w-full min-h-20 px-3 py-3" : "w-20 h-20",
            )}
          >
            <ImagePlus className="w-4 h-4" aria-hidden />
            {value.length === 0 ? (
              <>
                <span className="text-xs font-medium">Bấm để chọn, kéo thả hoặc dán (Ctrl+V) ảnh</span>
                <span className="text-[10px]">
                  {hint ?? `JPG, PNG, WebP, HEIC · tối đa ${formatBytes(maxBytes)}/ảnh · ${maxFiles} ảnh`}
                </span>
              </>
            ) : (
              <span className="text-[10px] font-medium">Thêm ảnh</span>
            )}
          </button>
        )}
      </div>

      {value.length > 0 && (
        <p className="text-[10px] text-muted-foreground pt-1.5">
          {value.length}/{maxFiles} ảnh · Ảnh lớn sẽ được tự động nén trước khi tải lên
        </p>
      )}
    </div>
  );
}
