import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { ReportErrorState } from "~/components/shared/reporting";
import { cn } from "~/lib/utils";

interface ChartPlaceholderProps {
  isLoading?: boolean;
  error?: FetchBaseQueryError | SerializedError;
  isEmpty?: boolean;
  onRetry?: () => void;
  className?: string;
}

/**
 * Trạng thái thay cho biểu đồ: đang tải / lỗi / chưa có dữ liệu. Trả `null` khi đã có
 * dữ liệu để vẽ. Không bao giờ vẽ số 0 thay cho lỗi.
 */
export function ChartPlaceholder({
  isLoading,
  error,
  isEmpty,
  onRetry,
  className = "h-52",
}: ChartPlaceholderProps) {
  if (isLoading) return <Skeleton className={cn("w-full rounded-lg", className)} />;
  if (error) {
    return (
      <ReportErrorState
        error={error}
        onRetry={onRetry}
        title="Không tải được dữ liệu biểu đồ"
        className="my-2"
      />
    );
  }
  if (isEmpty) {
    return (
      <div
        className={cn(
          "w-full flex flex-col items-center justify-center gap-2 text-muted-foreground",
          className,
        )}
      >
        <BarChart3 className="h-8 w-8 opacity-40" />
        <p className="text-sm">Chưa có dữ liệu</p>
      </div>
    );
  }
  return null;
}
