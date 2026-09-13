import { useDroppable } from "@dnd-kit/core";
import type { PartnerOrder } from "@/types/partner.type";
import type { OrderStatus } from "@/types/partner.enum";
import type { KanbanColumnConfig } from "./kanban.config";
import { OrderCard } from "./OrderCard";

interface KanbanColumnProps {
  config: KanbanColumnConfig;
  orders: PartnerOrder[];
  /** Whether dragging is currently happening globally */
  isDraggingOver?: boolean;
}

export function KanbanColumn({
  config,
  orders,
  isDraggingOver = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: config.status,
    data: { status: config.status as OrderStatus },
  });

  return (
    <div className="flex flex-col flex-1 min-w-40 shrink-0">
      {/* Column Header */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-t-lg border-b-2 ${config.accent} bg-card`}
      >
        <span className="text-sm font-semibold text-foreground truncate flex-1">
          {config.label}
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground min-w-6 text-center">
          {orders.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={[
          "flex flex-col gap-2 p-2 rounded-b-lg flex-1 min-h-32 transition-colors duration-150",
          config.bg,
          isOver && isDraggingOver
            ? "ring-2 ring-inset ring-blue-400 bg-blue-50/80 dark:bg-blue-900/30"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}

        {orders.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-xs text-muted-foreground/60 italic select-none">
              Không có đơn
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
