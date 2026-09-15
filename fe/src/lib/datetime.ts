// Định dạng thời gian dùng chung cho admin web.
//
// Backend trả `LocalDateTime` KHÔNG kèm offset và các container chạy UTC, nên chuỗi
// ISO không có `Z`/`+hh:mm` được hiểu là giờ UTC. Hiển thị luôn theo giờ Việt Nam
// (Asia/Ho_Chi_Minh) với định dạng `HH:mm:ss dd/MM/yyyy`, bất kể múi giờ máy người xem.
// Chỉ dùng Intl.DateTimeFormat, không phụ thuộc thư viện ngày giờ.

export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Giá trị hiển thị khi không có thời gian hoặc thời gian không hợp lệ. */
export const EMPTY_DATETIME = "—";

/**
 * Các dạng thời gian backend có thể trả:
 * - chuỗi ISO có hoặc không có offset (`2026-09-15T08:30:00`, `2026-09-15T08:30:00Z`);
 * - epoch milliseconds;
 * - mảng `LocalDateTime` của Jackson khi chưa tắt WRITE_DATES_AS_TIMESTAMPS
 *   (`[2026, 9, 15, 8, 30, 0, 123000000]`).
 */
export type DateTimeInput =
  | string
  | number
  | Date
  | readonly number[]
  | null
  | undefined;

const HAS_OFFSET = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(?:[.,](\d+))?$/;

function validOrNull(date: Date): Date | null {
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIsoString(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  if (DATE_ONLY.test(value)) {
    return validOrNull(new Date(`${value}T00:00:00Z`));
  }

  const local = LOCAL_DATE_TIME.exec(value);
  if (local) {
    // Không có offset -> coi là UTC. Cắt phần lẻ giây về mili giây (Java có thể trả nano giây).
    const [, date, time, fraction] = local;
    const millis = fraction ? `.${fraction.slice(0, 3).padEnd(3, "0")}` : "";
    return validOrNull(new Date(`${date}T${time}${millis}Z`));
  }

  if (HAS_OFFSET.test(value)) {
    // Chuẩn hoá phần lẻ giây dài hơn 3 chữ số và offset `+hhmm` để mọi trình duyệt đều parse được.
    const normalized = value
      .replace(" ", "T")
      .replace(/([.,])(\d{4,})(?=Z|[+-]|$)/i, (_m, _sep, digits: string) => `.${digits.slice(0, 3)}`)
      .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    return validOrNull(new Date(normalized));
  }

  return null;
}

/** Chuyển giá trị thời gian từ backend thành `Date` (UTC chuẩn), `null` nếu rỗng hoặc không hợp lệ. */
export function parseBackendDateTime(value: DateTimeInput): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return validOrNull(value);
  if (typeof value === "number") {
    return Number.isFinite(value) ? validOrNull(new Date(value)) : null;
  }
  if (Array.isArray(value)) {
    const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, nanos = 0] =
      value as number[];
    if (!Number.isFinite(year)) return null;
    return validOrNull(
      new Date(Date.UTC(year, month - 1, day, hour, minute, second, Math.floor(nanos / 1e6))),
    );
  }
  if (typeof value === "string") return parseIsoString(value);
  return null;
}

let cachedFormatter: Intl.DateTimeFormat | null = null;

function formatter(): Intl.DateTimeFormat {
  if (!cachedFormatter) {
    cachedFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  }
  return cachedFormatter;
}

interface DateTimeParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

function toParts(date: Date): DateTimeParts {
  const parts: Partial<DateTimeParts> = {};
  for (const part of formatter().formatToParts(date)) {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour" ||
      part.type === "minute" ||
      part.type === "second"
    ) {
      parts[part.type] = part.value;
    }
  }
  return {
    year: parts.year ?? "",
    month: parts.month ?? "",
    day: parts.day ?? "",
    // Một số engine cũ trả "24" cho nửa đêm dù đã đặt h23.
    hour: parts.hour === "24" ? "00" : (parts.hour ?? ""),
    minute: parts.minute ?? "",
    second: parts.second ?? "",
  };
}

/** `HH:mm:ss dd/MM/yyyy` theo giờ Việt Nam; `—` khi rỗng hoặc không hợp lệ. */
export function formatDateTime(value: DateTimeInput): string {
  const date = parseBackendDateTime(value);
  if (!date) return EMPTY_DATETIME;
  const p = toParts(date);
  return `${p.hour}:${p.minute}:${p.second} ${p.day}/${p.month}/${p.year}`;
}

/** `dd/MM/yyyy` theo giờ Việt Nam; `—` khi rỗng hoặc không hợp lệ. */
export function formatDate(value: DateTimeInput): string {
  const date = parseBackendDateTime(value);
  if (!date) return EMPTY_DATETIME;
  const p = toParts(date);
  return `${p.day}/${p.month}/${p.year}`;
}

/** `HH:mm:ss` theo giờ Việt Nam; `—` khi rỗng hoặc không hợp lệ. */
export function formatTime(value: DateTimeInput): string {
  const date = parseBackendDateTime(value);
  if (!date) return EMPTY_DATETIME;
  const p = toParts(date);
  return `${p.hour}:${p.minute}:${p.second}`;
}
