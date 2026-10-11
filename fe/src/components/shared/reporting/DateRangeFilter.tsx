import { CalendarRange } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  MAX_REPORT_DAYS,
  dayCount,
  shiftDay,
  startOfMonth,
  startOfWeek,
  vietnamToday,
} from "~/lib/report-format";
import type { DateRangeValue } from "./date-range";

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Ẩn hàng nút chọn nhanh khi chỗ hẹp. */
  hidePresets?: boolean;
  /**
   * Cho phép để trống cả hai ô (màn hình đơn hàng: trống = mọi thời điểm).
   * Màn hình doanh thu KHÔNG bật, vì mọi endpoint doanh thu đều cần một khoảng.
   */
  allowEmpty?: boolean;
  className?: string;
}

function presets(): { labelKey: string; range: DateRangeValue }[] {
  const today = vietnamToday();
  const yesterday = shiftDay(today, -1);
  return [
    { labelKey: "common.today", range: { from: today, to: today } },
    { labelKey: "shared.dateRange.yesterday", range: { from: yesterday, to: yesterday } },
    { labelKey: "shared.dateRange.last7Days", range: { from: shiftDay(today, -6), to: today } },
    { labelKey: "shared.dateRange.thisWeek", range: { from: startOfWeek(today), to: today } },
    { labelKey: "shared.dateRange.thisMonth", range: { from: startOfMonth(today), to: today } },
    {
      labelKey: "shared.dateRange.lastMonth",
      range: (() => {
        const firstOfThisMonth = startOfMonth(today);
        const lastOfPrevMonth = shiftDay(firstOfThisMonth, -1);
        return { from: startOfMonth(lastOfPrevMonth), to: lastOfPrevMonth };
      })(),
    },
  ];
}

/**
 * Chọn khoảng ngày cho báo cáo. Giá trị là `yyyy-MM-dd` theo lịch Việt Nam và tính
 * cả hai đầu, đúng như backend quy định; khoảng quá 366 ngày bị chặn ngay tại đây
 * để không phải chờ lỗi `INVALID_DATE_RANGE`.
 */
export function DateRangeFilter({
  value,
  onChange,
  hidePresets = false,
  allowEmpty = false,
  className,
}: DateRangeFilterProps) {
  const { t } = useTranslation();
  const today = vietnamToday();
  const partial = !value.from || !value.to;
  const length = partial ? 0 : dayCount(value.from, value.to);
  // Khoảng để trống chỉ hợp lệ khi màn hình cho phép; khi đó không cảnh báo gì.
  const tooLong = !partial && length > MAX_REPORT_DAYS;
  const reversed = !partial && length <= 0;
  const incomplete = partial && !allowEmpty;

  const handleFrom = (from: string) => {
    if (!from) {
      if (allowEmpty) onChange({ from: "", to: value.to });
      return;
    }
    onChange({ from, to: value.to && value.to < from ? from : value.to });
  };

  const handleTo = (to: string) => {
    if (!to) {
      if (allowEmpty) onChange({ from: value.from, to: "" });
      return;
    }
    onChange({ from: value.from && value.from > to ? to : value.from, to });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          type="date"
          value={value.from}
          max={value.to || today}
          onChange={(e) => handleFrom(e.target.value)}
          className="h-9 w-[150px]"
          aria-label={t("shared.dateRange.from")}
        />
        <span className="text-muted-foreground text-sm">→</span>
        <Input
          type="date"
          value={value.to}
          min={value.from}
          onChange={(e) => handleTo(e.target.value)}
          className="h-9 w-[150px]"
          aria-label={t("shared.dateRange.to")}
        />
        {!hidePresets &&
          presets().map((preset) => (
            <Button
              key={preset.labelKey}
              type="button"
              variant={
                preset.range.from === value.from && preset.range.to === value.to
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              className="h-9 text-xs"
              onClick={() => onChange(preset.range)}
            >
              {t(preset.labelKey)}
            </Button>
          ))}
        {allowEmpty && (value.from || value.to) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => onChange({ from: "", to: "" })}
          >
            {t("shared.dateRange.allTime")}
          </Button>
        )}
      </div>

      {(tooLong || reversed || incomplete) && (
        <p className="text-xs text-destructive">
          {incomplete
            ? t("shared.dateRange.incomplete")
            : reversed
              ? t("shared.dateRange.reversed")
              : t("shared.dateRange.tooLong", { max: MAX_REPORT_DAYS, count: length })}
        </p>
      )}
    </div>
  );
}
