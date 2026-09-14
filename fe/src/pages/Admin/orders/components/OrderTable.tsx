import { createColumnHelper } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Package,
  Eye,
  Edit3,
  Ban,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  Box,
  XCircle,
} from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { OrderStatus } from "~/types/admin/enums";
import type { OrderResponse } from "~/types/admin/order";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface OrderTableProps {
  orders: OrderResponse[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<OrderResponse>();

// Unified clean icon wrapper
const IconWrapper = ({
  children,
}: {
  children: React.ReactNode;
  color?: string;
}) => {
  return (
    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-secondary text-foreground border border-border/50">
      {children}
    </div>
  );
};

// Truncated text with tooltip
const TruncatedText = ({
  text,
  maxLength = 18,
  className = "",
}: {
  text: string;
  maxLength?: number;
  className?: string;
}) => {
  if (!text || text.length <= maxLength)
    return <span className={className}>{text || "-"}</span>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className}`}>
            {text.slice(0, maxLength)}...
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const getStatusBadge = (status: OrderStatus) => {
  const statusMeta: Record<
    OrderStatus,
    {
      style: string;
      label: string;
      icon: React.ElementType;
    }
  > = {
    [OrderStatus.INITIALIZED]: {
      style: "bg-secondary text-muted-foreground border-border",
      label: "Khởi tạo",
      icon: Clock,
    },
    [OrderStatus.RESERVED]: {
      style: "bg-secondary text-foreground border-border",
      label: "Đã đặt",
      icon: CheckCircle2,
    },
    [OrderStatus.WAITING]: {
      style: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      label: "Chờ thu gom",
      icon: Truck,
    },
    [OrderStatus.COLLECTED]: {
      style: "bg-secondary text-foreground border-border",
      label: "Đã thu gom",
      icon: CheckCircle2,
    },
    [OrderStatus.PROCESSING]: {
      style: "bg-secondary text-foreground border-border",
      label: "Đang xử lý",
      icon: RotateCcw,
    },
    [OrderStatus.READY]: {
      style: "bg-secondary text-foreground border-border",
      label: "Sẵn sàng",
      icon: CheckCircle2,
    },
    [OrderStatus.RETURNED]: {
      style: "bg-secondary text-foreground border-border",
      label: "Đã trả",
      icon: Box,
    },
    [OrderStatus.COMPLETED]: {
      style: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      label: "Hoàn thành",
      icon: CheckCircle2,
    },
    [OrderStatus.CANCELED]: {
      style: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      label: "Đã hủy",
      icon: XCircle,
    },
  };

  const meta = statusMeta[status] ?? {
    style: "bg-secondary text-foreground border-border",
    label: (status as string) || "—",
    icon: Clock,
  };
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={`${meta.style} font-medium text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1.5`}
    >
      <Icon className="mr-1 h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export function OrderTable({
  orders,
  isLoading,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: OrderTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const columns = [
    columnHelper.accessor("id", {
      header: t("admin.orders.columns.id"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <IconWrapper color="blue">
            <Package size={18} />
          </IconWrapper>
          <div className="min-w-0">
            <span className="font-semibold text-foreground font-mono text-sm">
              #{row.original.id}
            </span>
            <p className="text-xs text-muted-foreground">
              {row.original.orderDetails?.length || 0} dịch vụ
            </p>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("senderName", {
      header: t("admin.orders.columns.customer"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <TruncatedText
            text={row.original.senderName || "N/A"}
            maxLength={18}
            className="font-medium text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            {row.original.senderPhone || ""}
          </p>
        </div>
      ),
    }),

    columnHelper.accessor("orderDetails", {
      header: t("admin.orders.columns.service"),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          {row.original.orderDetails?.slice(0, 2).map((item, idx) => (
            <Badge
              key={item.id ?? idx}
              variant="outline"
              className="bg-muted/30 text-foreground/80 font-normal w-fit text-xs"
            >
              {item.serviceName ?? "Dịch vụ"} × {item.quantity}
            </Badge>
          ))}
          {row.original.orderDetails &&
            row.original.orderDetails.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{row.original.orderDetails.length - 2} dịch vụ khác
              </span>
            )}
        </div>
      ),
    }),

    columnHelper.accessor("totalPrice", {
      header: t("admin.orders.columns.total"),
      cell: ({ row }) => (
        <span className="font-semibold text-blue-600">
          {row.original.totalPrice
            ? formatCurrency(row.original.totalPrice)
            : "N/A"}
        </span>
      ),
    }),

    columnHelper.accessor("status", {
      header: t("admin.orders.columns.status"),
      cell: ({ row }) => getStatusBadge(row.original.status),
    }),

    columnHelper.accessor("createdAt", {
      header: t("common.createdAt"),
      cell: ({ row }) => {
        const rawDate = row.original.createdAt;
        if (!rawDate) return <span className="text-sm text-muted-foreground">N/A</span>;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return <span className="text-xs font-mono text-muted-foreground">{rawDate}</span>;
        const timeStr = d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const dateStr = d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        return (
          <div className="font-mono text-xs">
            <p className="font-semibold text-foreground tracking-tight">{timeStr}</p>
            <p className="text-[11px] text-muted-foreground">{dateStr}</p>
          </div>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => {
        const order = row.original;
        const canCancel = (
          [OrderStatus.INITIALIZED, OrderStatus.WAITING] as OrderStatus[]
        ).includes(order.status);

        return (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                >
                  <MoreHorizontal size={16} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-popover border border-border/50"
              >
                <DropdownMenuItem
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Cập nhật trạng thái
                </DropdownMenuItem>
                {canCancel && (
                  <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                    <Ban className="mr-2 h-4 w-4" />
                    Hủy đơn
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={orders}
      isLoading={isLoading}
      emptyMessage={t("common.noData")}
      serverPagination={{
        pageIndex: page,
        pageSize,
        pageCount: totalPages,
        totalRows: totalElements,
        onPageChange,
        onPageSizeChange,
      }}
    />
  );
}
