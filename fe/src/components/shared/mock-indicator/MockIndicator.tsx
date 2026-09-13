import { Database, AlertCircle } from "lucide-react";
import { isMockEnabled } from "~/context/mock/mock-data-context";
import { cn } from "~/lib/utils";

interface MockIndicatorProps {
  className?: string;
}

export function MockIndicator({ className }: MockIndicatorProps) {
  if (!isMockEnabled) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2",
        "px-4 py-2 rounded-full text-sm font-medium",
        "bg-amber-500 text-white shadow-lg",
        "animate-pulse",
        className
      )}
    >
      <Database size={16} />
      <span>Mock Data</span>
      <div className="w-2 h-2 bg-white rounded-full" />
    </div>
  );
}

export function MockBanner({ className }: MockIndicatorProps) {
  if (!isMockEnabled) return null;

  return (
    <div
      className={cn(
        "bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium",
        "flex items-center justify-center gap-2",
        className
      )}
    >
      <AlertCircle size={16} />
      <span>
        Đang sử dụng dữ liệu giả (Mock Data). Cấu hình trong file .env để tắt.
      </span>
    </div>
  );
}
