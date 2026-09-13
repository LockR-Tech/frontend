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

// Unified icon wrapper
const IconWrapper = ({
  children,
  color = "blue",
}: {
  children: React.ReactNode;
  color?: "blue" | "gray";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    gray: "bg-muted/50 text-muted-foreground",
  };
  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}
    >
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
  const variants: Record<
    OrderStatus,
    {
      bg: string;
      text: string;
      border: string;
      label: string;
      icon: React.ElementType;
    }
  > = {
    [OrderStatus.INITIALIZED]: {
      bg: "bg-muted/30",
      text: "text-foreground/80",
      border: "border-border/50",
      label: "Khởi tạo",
      icon: Clock,
    },
    [OrderStatus.RESERVED]: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      label: "Đã đặt",
      icon: CheckCircle2,
    },
    [OrderStatus.WAITING]: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      label: "Chờ thu gom",
      icon: Truck,
    },
    [OrderStatus.COLLECTED]: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      label: "Đã thu gom",
      icon: CheckCircle2,
    },
    [OrderStatus.PROCESSING]: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      label: "Đang xử lý",
      icon: RotateCcw,
    },
    [OrderStatus.READY]: {
      bg: "bg-teal-50",
      text: "text-teal-700",
      border: "border-teal-200",
      label: "Sẵn sàng",
      icon: CheckCircle2,
    },
    [OrderStatus.RETURNED]: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      label: "Đã trả",
      icon: Box,
    },
    [OrderStatus.COMPLETED]: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      label: "Hoàn thành",
      icon: CheckCircle2,
    },
    [OrderStatus.CANCELED]: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      label: "Đã hủy",
      icon: XCircle,
    },
  };

  const variant = variants[status] ?? {
    bg: "bg-muted/30",
    text: "text-foreground/80",
    border: "border-border/50",
    label: (status as string) || "—",
    icon: Clock,
  };
  const Icon = variant.icon;

  return (
    <Badge
      className={`${variant.bg} ${variant.text} ${variant.border} font-medium`}
      variant="outline"
    >
      <Icon className="mr-1 h-3.5 w-3.5" />
      {variant.label}
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
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "N/A"}
        </span>
      ),
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
