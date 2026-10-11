import { Star, RotateCcw, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "~/lib/datetime";
import { Badge } from "~/components/ui/badge";

// Chuỗi backend không kèm múi giờ = UTC, phải qua formatDateTime mới ra giờ VN.
export function fmtDate(d: string) {
  return formatDateTime(d);
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
  const { t } = useTranslation();
  const cls =
    rating >= 4
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
      : rating === 3
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
        : "bg-destructive/10 text-destructive border-destructive/20";
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${cls}`}>
      {"★".repeat(rating)}
      {" — "}
      {t(
        rating <= 2
          ? "admin.feedback.rating.poor"
          : rating === 3
            ? "admin.feedback.rating.ok"
            : "admin.feedback.rating.good",
      )}
    </Badge>
  );
}

export function ErrorBanner({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
      <AlertCircle size={16} className="text-destructive shrink-0" />
      <p className="text-xs text-destructive flex-1 font-medium">{t("admin.feedback.loadError")}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-xs text-destructive font-semibold hover:underline"
        >
          <RotateCcw size={13} /> {t("common.retry")}
        </button>
      )}
    </div>
  );
}

/** `labelKey` là message key — dịch lúc render bằng `t(meta.labelKey)`. */
export const REPORT_STATUS_META: Record<
  string,
  { labelKey: string; cls: string }
> = {
  OPEN: {
    labelKey: "admin.feedback.reportStatus.open",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  IN_PROGRESS: {
    labelKey: "admin.feedback.reportStatus.inProgress",
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  RESOLVED: {
    labelKey: "admin.feedback.reportStatus.resolved",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
};
