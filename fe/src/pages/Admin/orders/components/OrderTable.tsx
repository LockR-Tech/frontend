import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Edit3, Eye, MapPin, MoreHorizontal } from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  MetaBadge,
  orderPaymentStatusMeta,
  orderStatusMeta,
  orderTypeMeta,
  paymentMethodMeta,
} from "~/components/shared/reporting";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency } from "~/lib/report-format";
import type { AdminOrder } from "~/types/admin/reporting";

interface OrderTableProps {
  orders: AdminOrder[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onUpdateStatus: (order: AdminOrder) => void;
}

const columnHelper = createColumnHelper<AdminOrder>();

/** Tủ hiển thị theo tủ gửi, nếu đơn không có thì lấy tủ đích (đơn drone). */
function lockerOf(order: AdminOrder) {
  return order.locker ?? order.destinationLocker;
}

export function OrderTable({
  orders,
  isLoading,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
  onUpdateStatus,
}: OrderTableProps) {
  const navigate = useNavigate();

  const columns = [
    columnHelper.accessor("orderCode", {
      header: "Đơn hàng",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="min-w-0">
            {/* Mã đơn là thứ khách và nhân viên đọc cho nhau; id nội bộ bỏ đi vì
                nhìn vào không biết là đơn nào. */}
            <p className="font-mono font-semibold text-sm text-foreground truncate">
              {order.orderCode ?? "Đơn chưa có mã"}
            </p>
            {order.fulfillmentMode && (
              <p className="text-[11px] text-muted-foreground">
                {order.fulfillmentMode}
              </p>
            )}
          </div>
        );
      },
    }),

    columnHelper.accessor("customer", {
      header: "Khách gửi",
      cell: ({ row }) => {
        const { customer } = row.original;
        return (
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {customer?.fullName || "Chưa tra được tên khách"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer?.phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("receiverName", {
      header: "Người nhận",
      cell: ({ row }) => {
        const receiver = row.original.receiver;
        const name = receiver?.name || receiver?.accountFullName;
        const phone = receiver?.phone || receiver?.accountPhoneNumber;
        return (
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">
              {name || EMPTY_VALUE}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {phone || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("type", {
      header: "Loại",
      cell: ({ row }) => (
        <MetaBadge meta={orderTypeMeta(row.original.type)} hideIcon />
      ),
    }),

    columnHelper.accessor("status", {
      header: "Trạng thái",
      cell: ({ row }) => <MetaBadge meta={orderStatusMeta(row.original.status)} />,
    }),

    columnHelper.accessor("paymentStatus", {
      header: "Thanh toán",
      cell: ({ row }) => {
        const order = row.original;
        const method = order.payment?.lastPaidMethod;
        return (
          <div className="space-y-1">
            <MetaBadge
              meta={orderPaymentStatusMeta(order.paymentStatus)}
              hideIcon
            />
            <p className="text-[11px] text-muted-foreground">
              {method ? paymentMethodMeta(method).label : EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("lockerId", {
      header: "Tủ / ô",
      cell: ({ row }) => {
        const order = row.original;
        const locker = lockerOf(order);
        const boxNumber = order.sendBoxNumber ?? order.receiveBoxNumber;
        return (
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              {locker?.name || locker?.code || "Chưa tra được tên tủ"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {boxNumber !== null && boxNumber !== undefined
                ? `Ô ${boxNumber}`
                : "Chưa gán ô"}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("totalPrice", {
      header: "Tổng tiền",
      cell: ({ row }) => {
        const order = row.original;
        const outstanding = order.payment?.outstandingAmount ?? null;
        return (
          <div className="text-right">
            <p className="font-semibold text-sm text-foreground">
              {formatCurrency(order.totalPrice)}
            </p>
            {outstanding !== null && outstanding > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Còn thiếu {formatCurrency(outstanding)}
              </p>
            )}
          </div>
        );
      },
    }),

    columnHelper.accessor("createdAt", {
      header: "Tạo lúc",
      cell: ({ row }) => (
        <p className="font-mono text-xs text-foreground whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </p>
      ),
    }),

    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal size={16} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => navigate(`/admin/orders/${order.id}`)}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateStatus(order)}
                className="cursor-pointer"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Cập nhật trạng thái
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={orders}
      isLoading={isLoading}
      emptyMessage="Không có đơn nào khớp bộ lọc"
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
