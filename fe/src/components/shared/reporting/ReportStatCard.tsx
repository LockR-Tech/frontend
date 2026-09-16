import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { EMPTY_VALUE, changeDirection, formatPercentChange } from "~/lib/report-format";

interface ReportStatCardProps {
  label: string;
  value: React.ReactNode;
  /** Dòng phụ: kỳ so sánh, cách tính, hoặc con số nền. */
  hint?: React.ReactNode;
  icon?: React.ElementType;
  /** % thay đổi so với kỳ trước; `null` = không có kỳ nền (backend chia cho 0). */
  changePct?: number | null;
  /** Ghi đè nhãn thay đổi, ví dụ `formatPercentPoints` cho tỉ lệ thành công. */
  changeLabel?: string;
  /** Tăng là xấu (ví dụ số giao dịch thất bại, tiền hoàn). */
  invertChangeColor?: boolean;
  isLoading?: boolean;
  className?: string;
  /** Thu nhỏ chữ khi giá trị dài, ví dụ một mốc thời gian đầy đủ. */
  valueClassName?: string;
}

/**
 * Thẻ số liệu tổng quan. Mức thay đổi luôn là số thật do backend tính; khi backend
 * trả `null` (không có kỳ nền) thẻ hiển thị "—" thay vì bịa ra một tỉ lệ.
 */
export function ReportStatCard({
  label,
  value,
  hint,
  icon: Icon,
  changePct,
  changeLabel,
  invertChangeColor = false,
  isLoading = false,
  className,
  valueClassName,
}: ReportStatCardProps) {
  const direction = changeDirection(changePct);
  const showChange = changePct !== undefined || changeLabel !== undefined;

  const good = invertChangeColor ? direction === "down" : direction === "up";
  const bad = invertChangeColor ? direction === "up" : direction === "down";

  const ChangeIcon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <Card className={cn("border border-border bg-card", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-7 w-24 mt-2" />
        ) : (
          <p
            className={cn(
              "text-xl font-bold text-foreground leading-tight mt-1.5 break-words",
              valueClassName,
            )}
          >
            {value}
          </p>
        )}

        {showChange && !isLoading && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1 text-xs font-semibold",
              good && "text-emerald-600 dark:text-emerald-400",
              bad && "text-rose-600 dark:text-rose-400",
              !good && !bad && "text-muted-foreground",
            )}
          >
            {direction === "unknown" ? (
              <span className="text-muted-foreground font-normal">
                {changeLabel ?? EMPTY_VALUE} so với kỳ trước
              </span>
            ) : (
              <>
                <ChangeIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{changeLabel ?? formatPercentChange(changePct)}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  so với kỳ trước
                </span>
              </>
            )}
          </div>
        )}

        {hint && (
          <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
