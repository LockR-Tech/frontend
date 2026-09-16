import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { BadgeMeta } from "./report-meta";

interface MetaBadgeProps {
  meta: BadgeMeta;
  /** Ẩn biểu tượng khi chỗ hẹp (ví dụ trong ô bảng nhiều cột). */
  hideIcon?: boolean;
  className?: string;
}

/** Badge trạng thái/loại dựa trên bảng metadata ở `report-meta.ts`. */
export function MetaBadge({ meta, hideIcon = false, className }: MetaBadgeProps) {
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap",
        meta.style,
        className,
      )}
    >
      {!hideIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {meta.label}
    </Badge>
  );
}
