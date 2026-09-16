// Tiện ích cho khoảng ngày báo cáo, tách khỏi `DateRangeFilter.tsx` để file component
// chỉ export component (điều kiện của react-refresh).

import {
  MAX_REPORT_DAYS,
  dayCount,
  startOfMonth,
  vietnamToday,
} from "~/lib/report-format";

export interface DateRangeValue {
  from: string;
  to: string;
}

/** Khoảng mặc định của mọi báo cáo: mùng 1 tháng này → hôm nay (giờ Việt Nam). */
export function defaultReportRange(): DateRangeValue {
  const today = vietnamToday();
  return { from: startOfMonth(today), to: today };
}

/** `true` khi khoảng hợp lệ để gọi API (đủ hai đầu, không đảo ngược, không quá 366 ngày). */
export function isValidReportRange(range: DateRangeValue): boolean {
  if (!range.from || !range.to) return false;
  const length = dayCount(range.from, range.to);
  return length > 0 && length <= MAX_REPORT_DAYS;
}
