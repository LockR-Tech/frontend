import { Star, RotateCcw, AlertCircle } from "lucide-react";
import { Badge } from "~/components/ui/badge";

export function fmtDate(d: string) {
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
            i <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

export function RatingBadge({ rating }: { rating: number }) {
  const cls =
    rating >= 4
      ? "bg-green-100 text-green-700 border-green-200"
      : rating === 3
        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
        : "bg-red-100 text-red-700 border-red-200";
  return (
    <Badge className={`text-xs font-bold ${cls}`}>
      {"★".repeat(rating)}
      {rating <= 2 ? " — Không hài lòng" : rating === 3 ? " — Bình thường" : ""}
    </Badge>
  );
}

export function ErrorBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
      <AlertCircle size={18} className="text-red-600 shrink-0" />
      <p className="text-sm text-red-700 flex-1">Không thể tải dữ liệu.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-sm text-red-700 font-medium hover:underline"
        >
          <RotateCcw size={14} /> Thử lại
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
    cls: "bg-red-100 text-red-700 border-red-200",
  },
  RESOLVED: {
    label: "Đã giải quyết",
    cls: "bg-green-100 text-green-700 border-green-200",
  },
  REJECTED: {
    label: "Từ chối",
    cls: "bg-muted/50 text-muted-foreground border-border/50",
  },
};
