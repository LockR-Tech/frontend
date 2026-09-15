import { useRef, useState, type ReactNode } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "~/components/ui/button";
import { IMAGE_ACCEPT_ATTR, validateImageFile } from "~/lib/cloudinary-upload";
import { getMediaErrorMessage } from "~/lib/media";
import { isHandledUploadError, useImageUpload } from "~/hooks/useImageUpload";
import type { MediaPurpose, MediaUpload } from "~/stores/apis/media";

interface ImageUploadButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  purpose: MediaPurpose;
  /** Gọi API nghiệp vụ (PUT …/image, …/avatar) với MediaUpload vừa upload. */
  onUploaded: (media: MediaUpload) => Promise<void>;
  children?: ReactNode;
  /** Thông báo lỗi khi API nghiệp vụ thất bại. */
  errorTitle?: string;
}

/// Nút chọn 1 ảnh → upload Cloudinary → gọi `onUploaded`. Dùng cho ảnh cửa hàng, avatar, khuyến mãi.
export function ImageUploadButton({
  purpose,
  onUploaded,
  children,
  errorTitle = "Không cập nhật được ảnh",
  disabled,
  ...buttonProps
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, items, isUploading, reset } = useImageUpload(purpose);
  const [saving, setSaving] = useState(false);
  const busy = isUploading || saving;
  const progress = items[0]?.progress ?? 0;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const invalid = validateImageFile(file, { beforeDownscale: true });
    if (invalid) {
      toast.error("Ảnh không hợp lệ", { description: invalid });
      return;
    }
    try {
      const [media] = await upload([file]);
      setSaving(true);
      await onUploaded(media);
    } catch (err) {
      if (!isHandledUploadError(err)) {
        toast.error(errorTitle, { description: getMediaErrorMessage(err) });
      }
    } finally {
      setSaving(false);
      reset();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        {...buttonProps}
        disabled={disabled || busy}
        aria-busy={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        {isUploading ? `Đang tải ${progress}%` : saving ? "Đang lưu..." : (children ?? "Đổi ảnh")}
      </Button>
    </>
  );
}
