import { parseBackendDateTime } from "~/lib/datetime";
import { PromotionStatus } from "~/types/admin/enums";
import type { AdminPromotion } from "~/stores/apis/admin/promotions";

/**
 * Backend chỉ lưu ACTIVE/INACTIVE; các trạng thái Sắp diễn ra / Hết hạn / Hết lượt
 * suy ra tại client từ startAt/endAt (UTC) và usageCount/totalUsageLimit.
 */
export function effectivePromotionStatus(
  p: AdminPromotion,
  now: number = Date.now(),
): PromotionStatus {
  if ((p.status ?? "").toUpperCase() === "INACTIVE") return PromotionStatus.INACTIVE;
  const end = parseBackendDateTime(p.endAt ?? null);
  if (end && now > end.getTime()) return PromotionStatus.EXPIRED;
  if (p.totalUsageLimit != null && (p.usageCount ?? 0) >= p.totalUsageLimit) {
    return PromotionStatus.DEPLETED;
  }
  const start = parseBackendDateTime(p.startAt ?? null);
  if (start && now < start.getTime()) return PromotionStatus.UPCOMING;
  return PromotionStatus.ACTIVE;
}

/** Ưu tiên `message`/`code` backend trả. */
export function promotionError(err: unknown): { code: string; message: string } {
  const e = err as { data?: { code?: unknown; message?: unknown }; status?: unknown } | undefined;
  const code = typeof e?.data?.code === "string" ? e.data.code : "";
  const message =
    typeof e?.data?.message === "string" && e.data.message.trim()
      ? e.data.message
      : e?.status === "FETCH_ERROR"
        ? "Không kết nối được máy chủ"
        : "";
  return { code, message };
}
