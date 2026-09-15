import { baseApi } from '../baseAPi';
import { MEDIA_ENDPOINTS } from '../../constants';
import type { ApiResponse } from '../../types';

// ---- Types mirroring docs/01-overview/media-storage.md (hợp đồng API ảnh) ----

export type MediaPurpose = 'REPORT_EVIDENCE' | 'AVATAR' | 'STORE_IMAGE' | 'PROMOTION_IMAGE';

/// Giai đoạn của ảnh phiếu sự cố: người báo → KTV xác nhận → trong khi sửa → nghiệm thu.
export type AttachmentStage = 'REPORT' | 'INSPECTION' | 'PROGRESS' | 'RESOLUTION';

export interface UploadSignatureItem {
  publicId: string;
  /** Gửi nguyên văn tới Cloudinary (api_key, timestamp, public_id, allowed_formats, signature). */
  fields: Record<string, string>;
}

export interface UploadSignaturesResponse {
  provider: 'CLOUDINARY' | string;
  cloudName: string;
  uploadUrl: string;
  maxBytes: number;
  allowedFormats: string[];
  expiresAt: string;
  uploads: UploadSignatureItem[];
}

export interface UploadSignaturesRequest {
  purpose: MediaPurpose;
  /** 1–10, mặc định 1. */
  count?: number;
}

/// Lấy nguyên từ phản hồi Cloudinary, gửi kèm mọi API gắn ảnh — server tự xác minh chữ ký.
export interface MediaUpload {
  publicId: string;
  version: number;
  signature: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

export interface ReportAttachmentRequest extends MediaUpload {
  caption?: string;
  /** ISO `yyyy-MM-ddTHH:mm:ss`. */
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
}

export interface ReportAttachmentResponse {
  id: number;
  reportId: number;
  repairLogId: number | null;
  stage: AttachmentStage;
  url: string;
  thumbnailUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string | null;
  uploadedByUserId: number | null;
  createdAt: string;
}

export const mediaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Chỉ xin chữ ký — byte ảnh đi thẳng tới Cloudinary (xem lib/cloudinary-upload.ts)
    createUploadSignatures: builder.mutation<
      ApiResponse<UploadSignaturesResponse>,
      UploadSignaturesRequest
    >({
      query: ({ purpose, count = 1 }) => ({
        url: MEDIA_ENDPOINTS.UPLOAD_SIGNATURES,
        method: 'POST',
        body: { purpose, count },
      }),
    }),
  }),
});

export const { useCreateUploadSignaturesMutation } = mediaApi;
