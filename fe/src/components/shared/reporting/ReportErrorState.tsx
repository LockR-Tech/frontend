import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { toReportError } from "~/lib/report-error";

interface ReportErrorStateProps {
  error: FetchBaseQueryError | SerializedError | undefined;
  onRetry?: () => void;
  /** Dòng đầu, mặc định nêu đúng phần dữ liệu không tải được. */
  title?: string;
  className?: string;
}

/**
 * Báo lỗi cho một khối báo cáo. Dùng thay cho việc vẽ số 0: khi payment-service
 * không phản hồi, backend trả `503 PAYMENT_DATA_UNAVAILABLE` và số 0 sẽ bị hiểu
 * nhầm là "hôm nay không thu được đồng nào".
 */
export function ReportErrorState({
  error,
  onRetry,
  title = "Không tải được dữ liệu",
  className,
}: ReportErrorStateProps) {
  const detail = toReportError(error);
  if (!detail) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3",
        className,
      )}
    >
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{detail.message}</p>
        {(detail.code || detail.status) && (
          <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono">
            {[detail.status, detail.code].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Thử lại
        </Button>
      )}
    </div>
  );
}
