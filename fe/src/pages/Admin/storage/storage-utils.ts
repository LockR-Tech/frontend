import { parseBackendDateTime } from "~/lib/datetime";
import type { AdminOrder } from "~/types/admin/reporting";

const HOUR_MS = 3_600_000;

/** Lúc vào kho: mốc chuyển EXPIRED từ backend, backend cũ chưa có thì lấy lần cập nhật cuối. */
export function storedAtOf(order: AdminOrder): string | null {
  return order.storage?.storedAt ?? order.updatedAt;
}

/** Số giờ đã nằm kho tính tới `now`; `null` khi không có mốc. */
export function storedHours(order: AdminOrder, now: number = Date.now()): number | null {
  const at = parseBackendDateTime(storedAtOf(order));
  if (!at) return null;
  return Math.max(0, Math.floor((now - at.getTime()) / HOUR_MS));
}

/** Số tiền khách còn nợ: ưu tiên số payment-service tính, không có thì phí quá hạn khi đơn UNPAID. */
export function outstandingOf(order: AdminOrder): number {
  const fromPayment = order.payment?.outstandingAmount;
  if (fromPayment !== null && fromPayment !== undefined) return Math.max(0, fromPayment);
  return order.paymentStatus === "UNPAID" ? order.extraFee ?? order.fees?.overtimeFee ?? 0 : 0;
}
