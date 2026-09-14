import { Star, RotateCcw, AlertCircle } from "lucide-react";
import { Badge } from "~/components/ui/badge";

export function fmtDate(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={
            i <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"
          }
        />
      ))}
    </div>
  );
}

export function RatingBadge({ rating }: { rating: number }) {
  const cls =
    rating >= 4
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
      : rating === 3
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
        : "bg-destructive/10 text-destructive border-destructive/20";
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${cls}`}>
      {"★".repeat(rating)}
      {rating <= 2 ? " — Kém" : rating === 3 ? " — Ổn" : " — Tốt"}
    </Badge>
  );
}

export function ErrorBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
      <AlertCircle size={16} className="text-destructive shrink-0" />
      <p className="text-xs text-destructive flex-1 font-medium">Không thể tải dữ liệu.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-xs text-destructive font-semibold hover:underline"
        >
          <RotateCcw size={13} /> Thử lại
        </button>
      )}
    </div>
  );
}

export const REPORT_STATUS_META: Record<
  string,
  { label: string; cls: string }
> = {
  PENDING: {
    label: "Chờ xử lý",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  RESOLVED: {
    label: "Đã giải quyết",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  REJECTED: {
    label: "Từ chối",
    cls: "bg-secondary text-muted-foreground border-border",
  },
};
