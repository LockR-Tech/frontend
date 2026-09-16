// Định dạng tiền, phần trăm và khoảng ngày dùng chung cho 3 màn hình báo cáo admin
// (`/admin/orders`, `/admin/payments`, `/admin/revenue`).
//
// Thời gian có giờ:phút:giây dùng `formatDateTime` ở `./datetime`. File này lo phần còn lại.

import { APP_TIME_ZONE } from "./datetime";

/** Giá trị hiển thị khi không có số liệu. */
export const EMPTY_VALUE = "—";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

/** `15.000 ₫`; `—` khi không có số. Backend trả `BigDecimal` nên chấp nhận cả chuỗi. */
export function formatCurrency(value: number | string | null | undefined): string {
  const amount = toNumber(value);
  if (amount === null) return EMPTY_VALUE;
  return currencyFormatter.format(amount);
}

/** Số nguyên có phân cách hàng nghìn; `—` khi không có số. */
export function formatNumber(value: number | string | null | undefined): string {
  const amount = toNumber(value);
  if (amount === null) return EMPTY_VALUE;
  return numberFormatter.format(amount);
}

/**
 * `+8,33 %` / `−1,20 %`; `—` khi `null` (backend dùng `null` cho "không có kỳ nền",
 * tức là chia cho 0 — khác hẳn 0 %).
 */
export function formatPercentChange(value: number | null | undefined): string {
  const pct = toNumber(value);
  if (pct === null) return EMPTY_VALUE;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${numberFormatter.format(Math.abs(round2(pct)))} %`;
}

/** `84,17 %` cho tỉ lệ tuyệt đối (không phải mức thay đổi); `—` khi `null`. */
export function formatPercent(value: number | null | undefined): string {
  const pct = toNumber(value);
  if (pct === null) return EMPTY_VALUE;
  return `${numberFormatter.format(round2(pct))} %`;
}

/** `+1,20 điểm` — dùng cho `successRatePoints` (chênh lệch theo điểm phần trăm). */
export function formatPercentPoints(value: number | null | undefined): string {
  const points = toNumber(value);
  if (points === null) return EMPTY_VALUE;
  const sign = points > 0 ? "+" : points < 0 ? "−" : "";
  return `${sign}${numberFormatter.format(Math.abs(round2(points)))} điểm`;
}

/** Hướng của một mức thay đổi, để chọn màu và mũi tên. */
export type ChangeDirection = "up" | "down" | "flat" | "unknown";

export function changeDirection(value: number | null | undefined): ChangeDirection {
  const pct = toNumber(value);
  if (pct === null) return "unknown";
  if (pct > 0) return "up";
  if (pct < 0) return "down";
  return "flat";
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================
// Khoảng ngày — `yyyy-MM-dd` theo lịch Việt Nam
// ============================================

const isoDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Hôm nay theo giờ Việt Nam, `yyyy-MM-dd` — bất kể múi giờ của máy người xem. */
export function vietnamToday(): string {
  return isoDayFormatter.format(new Date());
}

/** Dời một ngày `yyyy-MM-dd` đi `days` ngày (âm = lùi). Tính trên lịch, không phụ thuộc múi giờ. */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Ngày mùng 1 của tháng chứa `day`. */
export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Thứ Hai của tuần chứa `day` (tuần bắt đầu thứ Hai như backend). */
export function startOfWeek(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  // getUTCDay: 0 = Chủ nhật -> lùi 6 ngày; 1 = thứ Hai -> lùi 0.
  const offset = (date.getUTCDay() + 6) % 7;
  return shiftDay(day, -offset);
}

/** `01/09/2026` từ `2026-09-01`; không đổi múi giờ vì đây đã là ngày Việt Nam. */
export function formatDayLabel(day: string | null | undefined): string {
  if (!day || day.length < 10) return EMPTY_VALUE;
  const [year, month, date] = day.slice(0, 10).split("-");
  return `${date}/${month}/${year}`;
}

/** `01/09` — nhãn ngắn cho trục biểu đồ. */
export function formatDayShort(day: string | null | undefined): string {
  if (!day || day.length < 10) return EMPTY_VALUE;
  const [, month, date] = day.slice(0, 10).split("-");
  return `${date}/${month}`;
}

/** Số ngày của khoảng (tính cả hai đầu), dùng để kiểm giới hạn 366 ngày trước khi gọi API. */
export function dayCount(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

/** Giới hạn khoảng báo cáo backend chấp nhận (tính cả hai đầu). */
export const MAX_REPORT_DAYS = 366;
