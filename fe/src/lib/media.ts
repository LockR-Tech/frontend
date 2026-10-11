// Helper dùng chung cho các API gắn ảnh (Cloudinary) — mã lỗi theo docs/01-overview/media-storage.md

import i18n from "~/utils/i18n";

/** Thông báo khi server chưa cấu hình Cloudinary (dịch theo ngôn ngữ hiện tại). */
export function getMediaStorageDisabledMessage(): string {
  return i18n.t("shared.media.error.storageDisabled");
}

// Khoá i18n theo mã lỗi; dịch lúc gọi để theo ngôn ngữ hiện tại.
const MEDIA_ERROR_KEYS: Record<string, string> = {
  MEDIA_STORAGE_DISABLED: "shared.media.error.storageDisabled",
  MEDIA_PURPOSE_INVALID: "shared.media.error.purposeInvalid",
  MEDIA_PURPOSE_FORBIDDEN: "shared.media.error.purposeForbidden",
  MEDIA_SIGNATURE_INVALID: "shared.media.error.signatureInvalid",
  MEDIA_OWNER_MISMATCH: "shared.media.error.ownerMismatch",
  MEDIA_FORMAT_INVALID: "shared.media.error.formatInvalid",
  ATTACHMENT_LIMIT_EXCEEDED: "shared.media.error.attachmentLimitExceeded",
  ATTACHMENT_STAGE_INVALID: "shared.media.error.attachmentStageInvalid",
  ATTACHMENT_DELETE_FORBIDDEN: "shared.media.error.attachmentDeleteForbidden",
  REPORT_NOT_IN_PROGRESS: "shared.media.error.reportNotInProgress",
  REPORT_ALREADY_RESOLVED: "shared.media.error.reportAlreadyResolved",
  REPORT_NOT_ASSIGNED: "shared.media.error.reportNotAssigned",
  REPORT_NOT_OWNED: "shared.media.error.reportNotOwned",
  RESOLUTION_PHOTO_REQUIRED: "shared.media.error.resolutionPhotoRequired",
  DATA_CONFLICT: "shared.media.error.dataConflict",
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
export function getMediaErrorMessage(err: unknown, fallback?: string): string {
  const code = getApiErrorCode(err);
  if (code && MEDIA_ERROR_KEYS[code]) return i18n.t(MEDIA_ERROR_KEYS[code]);
  if (isMediaStorageDisabled(err)) return getMediaStorageDisabledMessage();
  const e = err as ErrorLike;
  const serverMessage = e?.data && typeof e.data === "object" ? e.data.message : undefined;
  return serverMessage || e?.message || (fallback ?? i18n.t("shared.media.error.generic"));
}

/** Backend mỗi service đặt tên trường ảnh khác nhau (`imageUrl`, `image`, `avatarUrl`). */
export function pickImageUrl(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as { imageUrl?: string | null; image?: string | null; avatarUrl?: string | null };
  return o.imageUrl || o.image || o.avatarUrl || undefined;
}
