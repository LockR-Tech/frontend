import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { Calendar, Phone, Scale, Eye } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { PartnerOrder } from "@/types/partner.type";
import type { OrderStatus } from "@/types/partner.enum";
import { COLUMN_CONFIG_MAP, isTransitionAllowed } from "./kanban.config";

interface OrderCardProps {
  order: PartnerOrder;
  /** If set, renders a ghost overlay (no interaction) */
  isOverlay?: boolean;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount?: number) => {
  if (!amount) return null;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

export function OrderCard({ order, isOverlay = false }: OrderCardProps) {
  const navigate = useNavigate();
  const config = COLUMN_CONFIG_MAP[order.status as OrderStatus];

  // Draggable only when there are valid transitions from this status
  const canDrag =
    !isOverlay &&
    (COLUMN_CONFIG_MAP as Record<string, unknown>)[order.status] !==
      undefined &&
    Object.keys(COLUMN_CONFIG_MAP).some((s) =>
      isTransitionAllowed(order.status as OrderStatus, s as OrderStatus),
    );

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: order.id,
      data: { order },
      disabled: !canDrag,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group",
        isDragging && "opacity-40",
        isOverlay && "shadow-2xl rotate-2 scale-105",
        canDrag && "cursor-grab active:cursor-grabbing",
      ]
        .filter(Boolean)
        .join(" ")}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
    >
      <Card className="border border-border/60 hover:border-border hover:shadow-md transition-all duration-200 bg-card">
        <CardContent className="p-3 space-y-2">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-semibold text-blue-600 truncate">
                {order.orderCode}
              </p>
              <p className="text-sm font-medium text-foreground truncate mt-0.5">
                {order.customerName}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`text-xs shrink-0 ${config?.badge ?? ""}`}
            >
              {config?.label ?? order.status}
            </Badge>
          </div>

          {/* Meta info */}
          <div className="space-y-1">
            {order.customerPhone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone size={11} className="shrink-0" />
                <span>{order.customerPhone}</span>
              </div>
            )}
            {order.createdAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar size={11} className="shrink-0" />
                <span>{formatDate(order.createdAt)}</span>
              </div>
            )}
            {order.weight != null && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Scale size={11} className="shrink-0" />
                <span>{order.weight} kg</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            {order.totalPrice != null ? (
              <span className="text-xs font-semibold text-emerald-600">
                {formatCurrency(order.totalPrice)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {order.lockerName ?? "—"}
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/partner/orders/${order.id}`);
              }}
              aria-label="Xem chi tiết"
            >
              <Eye size={12} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
