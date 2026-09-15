// Helper dùng chung cho các API gắn ảnh (Cloudinary) — mã lỗi theo docs/01-overview/media-storage.md

export const MEDIA_STORAGE_DISABLED_MESSAGE = "Chưa cấu hình lưu trữ ảnh Cloudinary trên server";

const MEDIA_ERROR_MESSAGES: Record<string, string> = {
  MEDIA_STORAGE_DISABLED: MEDIA_STORAGE_DISABLED_MESSAGE,
  MEDIA_PURPOSE_INVALID: "Loại ảnh không hợp lệ",
  MEDIA_PURPOSE_FORBIDDEN: "Tài khoản không có quyền tải loại ảnh này",
  MEDIA_SIGNATURE_INVALID: "Chữ ký ảnh không hợp lệ hoặc đã hết hạn, vui lòng tải lại ảnh",
  MEDIA_OWNER_MISMATCH: "Ảnh không thuộc tài khoản đang đăng nhập",
  MEDIA_FORMAT_INVALID: "Định dạng ảnh không được hỗ trợ",
  ATTACHMENT_LIMIT_EXCEEDED: "Đã vượt quá số ảnh cho phép của phiếu",
  ATTACHMENT_STAGE_INVALID: "Giai đoạn ảnh không hợp lệ",
  ATTACHMENT_DELETE_FORBIDDEN: "Không có quyền xoá ảnh này",
  REPORT_NOT_IN_PROGRESS: "Phiếu chưa ở trạng thái Đang xử lý",
  REPORT_ALREADY_RESOLVED: "Phiếu đã hoàn tất, không thể thay đổi ảnh",
  REPORT_NOT_ASSIGNED: "Bạn không phải người được giao phiếu này",
  REPORT_NOT_OWNED: "Bạn không phải chủ phiếu này",
  RESOLUTION_PHOTO_REQUIRED: "Cần ít nhất 1 ảnh nghiệm thu trước khi hoàn tất phiếu",
  DATA_CONFLICT: "Ảnh này đã được gắn trước đó",
};

interface ErrorLike {
  status?: number | string;
  message?: string;
  data?: { code?: string; message?: string } | string | null;
}

/** Mã lỗi nghiệp vụ từ `ApiResponse.code` của RTK Query error (nếu có). */
export function getApiErrorCode(err: unknown): string | undefined {
  const data = (err as ErrorLike)?.data;
  return data && typeof data === "object" ? data.code : undefined;
}

export function isMediaStorageDisabled(err: unknown): boolean {
  const e = err as ErrorLike;
  return getApiErrorCode(err) === "MEDIA_STORAGE_DISABLED" || e?.status === 503;
}

/** Thông báo lỗi dễ hiểu cho các thao tác ảnh (xin chữ ký, gắn ảnh, xoá ảnh…). */
export function getMediaErrorMessage(err: unknown, fallback = "Đã xảy ra lỗi khi xử lý ảnh"): string {
  const code = getApiErrorCode(err);
  if (code && MEDIA_ERROR_MESSAGES[code]) return MEDIA_ERROR_MESSAGES[code];
  if (isMediaStorageDisabled(err)) return MEDIA_STORAGE_DISABLED_MESSAGE;
  const e = err as ErrorLike;
  const serverMessage = e?.data && typeof e.data === "object" ? e.data.message : undefined;
  return serverMessage || e?.message || fallback;
}

/** Backend mỗi service đặt tên trường ảnh khác nhau (`imageUrl`, `image`, `avatarUrl`). */
export function pickImageUrl(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as { imageUrl?: string | null; image?: string | null; avatarUrl?: string | null };
  return o.imageUrl || o.image || o.avatarUrl || undefined;
}
