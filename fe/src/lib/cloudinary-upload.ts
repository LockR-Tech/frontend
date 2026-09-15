import type { MediaUpload, UploadSignatureItem } from "~/stores/apis/media";

// Upload trực tiếp lên Cloudinary bằng chữ ký do backend cấp.
// KHÔNG đi qua RTK/baseQuery: baseQuery luôn gắn Authorization + Content-Type JSON,
// còn Cloudinary cần multipart và tuyệt đối không được nhận JWT.

export const DEFAULT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
export const IMAGE_ACCEPT_ATTR =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

const MIME_TO_FORMAT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/heic-sequence": "heic",
  "image/heif-sequence": "heif",
};

// Nén trước khi upload (docs §5): cạnh dài ≤ 1920 px, JPEG ~0.82
const DOWNSCALE_MAX_EDGE = 1920;
const DOWNSCALE_MIN_BYTES = 1.5 * 1024 * 1024;
const DOWNSCALE_QUALITY = 0.82;

export class CloudinaryUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

/** Định dạng ảnh suy từ MIME, fallback theo đuôi file (HEIC trên Windows thường có MIME rỗng). */
export function detectImageFormat(file: File): string | null {
  const byMime = MIME_TO_FORMAT[file.type?.toLowerCase()];
  if (byMime) return byMime;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext && ext !== file.name.toLowerCase() ? ext : null;
}

export const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

// Định dạng trình duyệt nén lại được; khi chọn file cho phép lớn hơn maxBytes (sẽ nén trước khi upload)
const DOWNSCALABLE_FORMATS = ["jpg", "jpeg", "png", "webp"];
const DOWNSCALABLE_SIZE_FACTOR = 5;

/**
 * Trả về thông báo lỗi (tiếng Việt) nếu file không hợp lệ, `null` nếu hợp lệ.
 * `beforeDownscale`: kiểm tra lúc chọn file — ảnh jpg/png/webp được phép tới 5× maxBytes vì sẽ được nén.
 */
export function validateImageFile(
  file: File,
  opts: { maxBytes?: number; allowedFormats?: string[]; beforeDownscale?: boolean } = {},
): string | null {
  const allowed = (opts.allowedFormats ?? DEFAULT_ALLOWED_IMAGE_FORMATS).map((f) => f.toLowerCase());
  const format = detectImageFormat(file);
  if (!format || !allowed.includes(format)) {
    return `"${file.name}" không đúng định dạng (chỉ nhận ${allowed.join(", ")})`;
  }
  const baseMax = opts.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const maxBytes =
    opts.beforeDownscale && DOWNSCALABLE_FORMATS.includes(format)
      ? baseMax * DOWNSCALABLE_SIZE_FACTOR
      : baseMax;
  if (file.size > maxBytes) {
    return `"${file.name}" quá lớn (${formatBytes(file.size)}, tối đa ${formatBytes(maxBytes)})`;
  }
  return null;
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh"));
    };
    img.src = url;
  });

/**
 * Thu nhỏ ảnh jpeg/png/webp trong trình duyệt khi file > ~1.5 MB hoặc cạnh dài > 1920 px.
 * HEIC/HEIF (trình duyệt không vẽ được) và mọi lỗi giải mã ⇒ giữ nguyên file gốc.
 */
export async function downscaleImageIfNeeded(file: File): Promise<File> {
  const format = detectImageFormat(file);
  if (!format || !DOWNSCALABLE_FORMATS.includes(format)) return file;
  if (typeof document === "undefined") return file;

  try {
    const img = await loadImage(file);
    const { naturalWidth: w, naturalHeight: h } = img;
    const longEdge = Math.max(w, h);
    if (file.size <= DOWNSCALE_MIN_BYTES && longEdge <= DOWNSCALE_MAX_EDGE) return file;

    const scale = Math.min(1, DOWNSCALE_MAX_EDGE / longEdge);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // PNG/WebP trong suốt → nền trắng thay vì đen khi đổi sang JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", DOWNSCALE_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

interface CloudinaryUploadJson {
  public_id?: string;
  version?: number;
  signature?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  error?: { message?: string };
}

/**
 * Gửi multipart tới `uploadUrl`: toàn bộ `fields` (giữ nguyên) + `file`.
 * Dùng XMLHttpRequest để có tiến trình upload; không gắn header nào (kể cả Authorization).
 */
export function uploadToCloudinary(
  file: Blob,
  signatureItem: UploadSignatureItem,
  uploadUrl: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<MediaUpload> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CloudinaryUploadError("Đã huỷ upload"));
      return;
    }

    const form = new FormData();
    Object.entries(signatureItem.fields).forEach(([key, value]) => form.append(key, value));
    if (file instanceof File) {
      form.append("file", file, file.name);
    } else {
      form.append("file", file);
    }

    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort);
    const cleanup = () => signal?.removeEventListener("abort", onAbort);

    xhr.open("POST", uploadUrl);
    xhr.responseType = "text";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
      }
    };

    xhr.onload = () => {
      cleanup();
      let json: CloudinaryUploadJson | null = null;
      try {
        json = JSON.parse(xhr.responseText) as CloudinaryUploadJson;
      } catch {
        json = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && json?.public_id && json.signature) {
        onProgress?.(100);
        resolve({
          publicId: json.public_id,
          version: Number(json.version),
          signature: json.signature,
          format: json.format ?? "",
          bytes: Number(json.bytes ?? 0),
          width: Number(json.width ?? 0),
          height: Number(json.height ?? 0),
        });
        return;
      }

      reject(
        new CloudinaryUploadError(
          json?.error?.message || `Cloudinary từ chối ảnh (HTTP ${xhr.status})`,
        ),
      );
    };

    xhr.onerror = () => {
      cleanup();
      reject(new CloudinaryUploadError("Lỗi mạng khi tải ảnh lên Cloudinary"));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new CloudinaryUploadError("Đã huỷ upload"));
    };

    xhr.send(form);
  });
}
