import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { PartnerOrder, StaffAccessCode } from "@/types/partner.type";
import type { OrderStatus } from "@/types/partner.enum";
import { KANBAN_COLUMNS, isTransitionAllowed } from "./kanban.config";
import { KanbanColumn } from "./KanbanColumn";
import { OrderCard } from "./OrderCard";

interface KanbanBoardProps {
  /** Grouped orders: status → list of orders */
  columns: Record<string, PartnerOrder[]>;
  /** Called when a valid drag-drop occurs */
  onStatusChange: (
    order: PartnerOrder,
    newStatus: OrderStatus,
  ) => Promise<StaffAccessCode | null>;
}

export function KanbanBoard({ columns, onStatusChange }: KanbanBoardProps) {
  const [activeOrder, setActiveOrder] = useState<PartnerOrder | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require dragging at least 8px before activating (prevents accidental drags)
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const order = event.active.data.current?.order as PartnerOrder | undefined;
    if (order) {
      setActiveOrder(order);
      setIsDragging(true);
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveOrder(null);
      setIsDragging(false);

      const { active, over } = event;
      if (!over) return;

      const order = active.data.current?.order as PartnerOrder;
      const targetStatus = over.id as OrderStatus;

      if (!order || order.status === targetStatus) return;
      if (!isTransitionAllowed(order.status as OrderStatus, targetStatus))
        return;

      await onStatusChange(order, targetStatus);
    },
    [onStatusChange],
  );

  const handleDragCancel = useCallback(() => {
    setActiveOrder(null);
    setIsDragging(false);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Horizontal scroll container */}
      <div className="flex gap-2 overflow-x-auto pb-4 min-h-[calc(100vh-16rem)]">
        {KANBAN_COLUMNS.map((colConfig) => (
          <KanbanColumn
            key={colConfig.status}
            config={colConfig}
            orders={columns[colConfig.status] ?? []}
            isDraggingOver={isDragging}
          />
        ))}
      </div>

      {/* Drag overlay — rendered on top while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeOrder ? <OrderCard order={activeOrder} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
