import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  RotateCcw,
  Box,
  XCircle,
  CircleDashed,
} from "lucide-react";
import { OrderStatus } from "~/types/admin/enums";

interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

interface Order {
  status: OrderStatus;
  createdAt?: string;
  timeline?: OrderTimelineEvent[];
}

interface OrderTimelineProps {
  order: Order;
}

const STATUS_FLOW: OrderStatus[] = [
  OrderStatus.INITIALIZED,
  OrderStatus.RESERVED,
  OrderStatus.WAITING,
  OrderStatus.COLLECTED,
  OrderStatus.PROCESSING,
  OrderStatus.READY,
  OrderStatus.RETURNED,
  OrderStatus.COMPLETED,
];

const STATUS_META: Record<
  OrderStatus,
  { label: string; icon: React.ElementType }
> = {
  [OrderStatus.INITIALIZED]: { label: "Khởi tạo", icon: Clock },
  [OrderStatus.RESERVED]:    { label: "Đã đặt",    icon: Package },
  [OrderStatus.WAITING]:     { label: "Chờ thu",   icon: Truck },
  [OrderStatus.COLLECTED]:   { label: "Đã thu",    icon: CheckCircle2 },
  [OrderStatus.PROCESSING]:  { label: "Xử lý",     icon: RotateCcw },
  [OrderStatus.READY]:       { label: "Sẵn sàng",  icon: CheckCircle2 },
  [OrderStatus.RETURNED]:    { label: "Đã trả",    icon: Box },
  [OrderStatus.COMPLETED]:   { label: "Hoàn thành",icon: CheckCircle2 },
  [OrderStatus.CANCELED]:    { label: "Đã hủy",    icon: XCircle },
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function OrderTimeline({ order }: OrderTimelineProps) {
  const isCanceled = order.status === OrderStatus.CANCELED;
  const currentIdx = STATUS_FLOW.indexOf(order.status);

  const events: OrderTimelineEvent[] =
    order.timeline && order.timeline.length > 0
      ? order.timeline
      : [{ status: OrderStatus.INITIALIZED, timestamp: order.createdAt ?? "" }];

  return (
    <div className="space-y-4">
      {/* Horizontal stepper */}
      {isCanceled ? (
        <div className="flex items-center gap-2 px-1">
          <div className="flex items-center gap-1.5 text-red-600">
            <XCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">Đơn hàng đã bị hủy</span>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="flex items-center min-w-max px-1 gap-0">
            {STATUS_FLOW.map((status, idx) => {
              const meta = STATUS_META[status];
              const Icon = meta.icon;
              const done = idx < currentIdx;
              const active = idx === currentIdx;
              const future = idx > currentIdx;

              return (
                <div key={status} className="flex items-center">
                  {/* Step node */}
                  <div className="flex flex-col items-center gap-1 w-16">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                            ? "bg-primary/20 text-primary"
                            : "bg-muted/50 text-muted-foreground/40"
                      }`}
                    >
                      {future ? (
                        <CircleDashed className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] text-center leading-tight ${
                        active
                          ? "text-primary font-semibold"
                          : done
                            ? "text-muted-foreground"
                            : "text-muted-foreground/40"
                      }`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {/* Connector line */}
                  {idx < STATUS_FLOW.length - 1 && (
                    <div
                      className={`h-0.5 w-4 mb-4 ${
                        idx < currentIdx ? "bg-primary/30" : "bg-muted/50"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact event log — only if real timeline data exists */}
      {order.timeline && order.timeline.length > 0 && (
        <div className="border-t border-border/30 pt-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {events.map((event, idx) => {
              const meta = STATUS_META[event.status] ?? STATUS_META[STATUS_FLOW[0]];
              const Icon = meta.icon;
              const isActive = idx === events.length - 1;
              return (
                <div key={idx} className="flex items-start gap-2">
                  <Icon
                    className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                      isActive ? "text-primary" : "text-muted-foreground/50"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-xs font-medium ${
                        isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {meta.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {formatDate(event.timestamp)}
                    </p>
                    {event.note && (
                      <p className="text-[10px] text-muted-foreground/60 italic">
                        {event.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
