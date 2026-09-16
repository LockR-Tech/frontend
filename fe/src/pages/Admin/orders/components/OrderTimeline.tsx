import { ArrowRight, CircleDashed, User } from "lucide-react";
import { MetaBadge, orderStatusMeta } from "~/components/shared/reporting";
import { formatDateTime } from "~/lib/datetime";
import type { AdminOrderTimelineEntry } from "~/types/admin/reporting";

interface OrderTimelineProps {
  /** `null` khi đang tải hoặc khi lấy từ danh sách (danh sách không trả timeline). */
  timeline: AdminOrderTimelineEntry[] | null | undefined;
}

/**
 * Lịch sử chuyển trạng thái do backend ghi, cũ trước mới sau. Không dựng "các bước
 * lẽ ra phải có": mỗi loại đơn đi một đường khác nhau, nên chỉ hiển thị đúng những
 * gì đã xảy ra.
 */
export function OrderTimeline({ timeline }: OrderTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
        <CircleDashed className="h-4 w-4" />
        Chưa có bản ghi chuyển trạng thái nào.
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border/60 pl-5">
      {timeline.map((entry, index) => (
        <li key={`${entry.createdAt}-${index}`} className="relative">
          <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/70 ring-4 ring-background" />

          <div className="flex flex-wrap items-center gap-2">
            {entry.oldStatus && (
              <>
                <MetaBadge
                  meta={orderStatusMeta(entry.oldStatus)}
                  hideIcon
                  className="opacity-70"
                />
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </>
            )}
            <MetaBadge meta={orderStatusMeta(entry.newStatus)} />
            <span className="font-mono text-xs text-muted-foreground ml-auto whitespace-nowrap">
              {formatDateTime(entry.createdAt)}
            </span>
          </div>

          <div className="mt-1 space-y-0.5">
            {(entry.changedByName || entry.changedByUserId !== null) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3 shrink-0" />
                {entry.changedByName ?? `Người dùng #${entry.changedByUserId}`}
              </p>
            )}
            {entry.note && (
              <p className="text-xs text-foreground/80">{entry.note}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
