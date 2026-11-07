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

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** "5 giờ" / "3 ngày" / "3 ngày 5 giờ". */
export function storedDurationLabel(hours: number, t: Translate): string {
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  if (days === 0) return t("admin.storage.duration.hours", { hours: rest });
  if (rest === 0) return t("admin.storage.duration.days", { days });
  return t("admin.storage.duration.daysHours", { days, hours: rest });
}

export const digitsOf = (value: string | null | undefined): string => (value ?? "").replace(/\D/g, "");

/** Che SĐT khi trao đồ: chỉ giữ 3 số đầu để nhân viên phải hỏi người tới nhận đọc 4 số cuối. */
export function maskPhone(phone: string | null | undefined): string | null {
  const digits = digitsOf(phone);
  if (!digits) return null;
  return digits.slice(0, 3) + "•".repeat(Math.max(0, digits.length - 3));
}

/** SĐT web biết của từng bên — server còn có thêm (vd. SĐT người gửi đơn drone) nên danh sách rỗng ≠ không có. */
export function knownPhonesOf(order: AdminOrder, party: "SENDER" | "RECEIVER"): string[] {
  const raw =
    party === "SENDER"
      ? [order.customer?.phoneNumber]
      : [order.receiver?.phone, order.receiver?.accountPhoneNumber, order.receiverPhone];
  return [...new Set(raw.map(digitsOf).filter((p) => p.length >= 4))];
}
