import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCreateUploadSignaturesMutation,
  type MediaPurpose,
  type MediaUpload,
  type UploadSignatureItem,
} from "~/stores/apis/media";
import {
  downscaleImageIfNeeded,
  uploadToCloudinary,
  validateImageFile,
} from "~/lib/cloudinary-upload";
import {
  getMediaErrorMessage,
  isMediaStorageDisabled,
  MEDIA_STORAGE_DISABLED_MESSAGE,
} from "~/lib/media";

export type UploadStatus = "queued" | "uploading" | "done" | "error";

export interface UploadProgressItem {
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
}

/** Lỗi upload đã được hook báo bằng toast — nơi gọi không cần toast lại. */
export class ImageUploadError extends Error {
  handled = true;
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export const isHandledUploadError = (err: unknown): boolean =>
  err instanceof ImageUploadError && err.handled;

const MAX_SIGNATURES_PER_REQUEST = 10;

interface UploadTask {
  file: File;
  prepared: File;
  signature: UploadSignatureItem;
  uploadUrl: string;
  maxBytes: number;
  allowedFormats: string[];
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/**
 * Upload nhiều ảnh lên Cloudinary theo hợp đồng media-storage:
 * xin N chữ ký trong 1 lần gọi → upload song song (tối đa 3) → trả `MediaUpload[]` đúng thứ tự file.
 * Ảnh đã upload thành công được nhớ theo `File`, nên bấm gửi lại chỉ upload các ảnh còn lỗi.
 */
export function useImageUpload(purpose: MediaPurpose, options: { concurrency?: number } = {}) {
  const concurrency = options.concurrency ?? 3;
  const [createSignatures] = useCreateUploadSignaturesMutation();
  const [items, setItems] = useState<UploadProgressItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const cacheRef = useRef(new Map<File, MediaUpload>());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const patchItem = useCallback((file: File, patch: Partial<UploadProgressItem>) => {
    setItems((prev) => prev.map((it) => (it.file === file ? { ...it, ...patch } : it)));
  }, []);

  const upload = useCallback(
    async (files: File[]): Promise<MediaUpload[]> => {
      if (files.length === 0) return [];
      const cache = cacheRef.current;
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      setIsUploading(true);
      setItems(
        files.map((file) =>
          cache.has(file)
            ? { file, progress: 100, status: "done" }
            : { file, progress: 0, status: "queued" },
        ),
      );

      const errors: string[] = [];
      const fail = (file: File, message: string) => {
        errors.push(message);
        patchItem(file, { status: "error", error: message });
      };

      try {
        // 1. Nén + kiểm tra sơ bộ trước khi xin chữ ký (không phí chữ ký cho file hỏng)
        const prepared: { file: File; prepared: File }[] = [];
        for (const file of files.filter((f) => !cache.has(f))) {
          const processed = await downscaleImageIfNeeded(file);
          const invalid = validateImageFile(processed);
          if (invalid) fail(file, invalid);
          else prepared.push({ file, prepared: processed });
        }

        // 2. Xin chữ ký theo lô (count ≤ 10 mỗi lần)
        const tasks: UploadTask[] = [];
        for (let i = 0; i < prepared.length; i += MAX_SIGNATURES_PER_REQUEST) {
          const chunk = prepared.slice(i, i + MAX_SIGNATURES_PER_REQUEST);
          try {
            const res = await createSignatures({ purpose, count: chunk.length }).unwrap();
            const data = res.data;
            if (!data?.uploadUrl || !data.uploads || data.uploads.length < chunk.length) {
              throw new Error("Máy chủ trả về chữ ký upload không hợp lệ");
            }
            chunk.forEach((entry, idx) =>
              tasks.push({
                ...entry,
                signature: data.uploads[idx],
                uploadUrl: data.uploadUrl,
                maxBytes: data.maxBytes,
                allowedFormats: data.allowedFormats,
              }),
            );
          } catch (err) {
            const message = getMediaErrorMessage(err, "Không xin được chữ ký upload ảnh");
            chunk.forEach((entry) => patchItem(entry.file, { status: "error", error: message }));
            toast.error(isMediaStorageDisabled(err) ? MEDIA_STORAGE_DISABLED_MESSAGE : "Không thể tải ảnh lên", {
              description: isMediaStorageDisabled(err)
                ? "Liên hệ quản trị hệ thống để đặt CLOUDINARY_URL cho các service."
                : message,
            });
            throw new ImageUploadError(message);
          }
        }

        // 3. Upload song song lên Cloudinary
        await runWithConcurrency(tasks, concurrency, async (task) => {
          if (controller.signal.aborted) return;
          const invalid = validateImageFile(task.prepared, {
            maxBytes: task.maxBytes || undefined,
            allowedFormats: task.allowedFormats?.length ? task.allowedFormats : undefined,
          });
          if (invalid) {
            fail(task.file, invalid);
            return;
          }
          patchItem(task.file, { status: "uploading", progress: 0 });
          try {
            const media = await uploadToCloudinary(
              task.prepared,
              task.signature,
              task.uploadUrl,
              (progress) => patchItem(task.file, { progress }),
              controller.signal,
            );
            cache.set(task.file, media);
            patchItem(task.file, { status: "done", progress: 100 });
          } catch (err) {
            fail(task.file, err instanceof Error ? err.message : "Upload thất bại");
          }
        });

        if (controller.signal.aborted) {
          throw new ImageUploadError("Đã huỷ upload");
        }

        if (errors.length > 0) {
          toast.error(`Không tải lên được ${errors.length}/${files.length} ảnh`, {
            description: errors[0],
          });
          throw new ImageUploadError(errors[0]);
        }

        return files.map((file) => cache.get(file)!);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsUploading(false);
      }
    },
    [concurrency, createSignatures, patchItem, purpose],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    cacheRef.current = new Map();
    setItems([]);
  }, []);

  return { upload, items, isUploading, cancel, reset };
}
