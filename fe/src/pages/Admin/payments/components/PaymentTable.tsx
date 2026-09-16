import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Eye, MoreHorizontal, Package } from "lucide-react";
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
  orderStatusMeta,
  paymentKindMeta,
  paymentMethodMeta,
  paymentStatusMeta,
} from "~/components/shared/reporting";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency } from "~/lib/report-format";
import type { AdminPayment } from "~/types/admin/reporting";

interface PaymentTableProps {
  payments: AdminPayment[];
  isLoading: boolean;
  onViewDetail: (id: number) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<AdminPayment>();

export function PaymentTable({
  payments,
  isLoading,
  onViewDetail,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: PaymentTableProps) {
  const navigate = useNavigate();

  const columns = [
    columnHelper.accessor("id", {
      header: "Giao dịch",
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="min-w-0">
            {/* Giao dịch không có tên; mã tham chiếu là thứ đối soát được với cổng
                thanh toán nên đưa lên làm nhãn chính thay cho số thứ tự nội bộ. */}
            <p className="font-mono font-semibold text-sm text-foreground truncate max-w-[200px]">
              {payment.referenceId ?? `Giao dịch ${payment.id}`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {paymentKindMeta(payment.kind).label}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("customer", {
      header: "Khách hàng",
      cell: ({ row }) => {
        const { customer } = row.original;
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {customer?.fullName || "Chưa tra được tên khách"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer?.phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("order", {
      header: "Đơn hàng",
      cell: ({ row }) => {
        const payment = row.original;
        // Giao dịch nạp ví không gắn đơn nào (`orderId = 0`).
        if (payment.kind === "TOPUP") {
          return (
            <MetaBadge meta={paymentKindMeta("TOPUP")} hideIcon />
          );
        }
        const order = payment.order;
        if (!order) {
          // `order` rỗng nghĩa là order-service không trả lời — nói thẳng thay vì
          // hiện một con số mà người xem không tra được thành đơn nào.
          return (
            <span className="text-xs text-muted-foreground">
              {payment.orderId ? "Chưa tra được đơn" : EMPTY_VALUE}
            </span>
          );
        }
        return (
          <button
            type="button"
            onClick={() => navigate(`/admin/orders/${order.id}`)}
            className="text-left min-w-0 hover:underline"
          >
            <p className="text-sm font-mono text-foreground truncate flex items-center gap-1">
              <Package className="h-3 w-3 text-muted-foreground shrink-0" />
              {order.orderCode ?? "Đơn chưa có mã"}
            </p>
            <div className="mt-0.5">
              <MetaBadge meta={orderStatusMeta(order.status)} hideIcon />
            </div>
          </button>
        );
      },
    }),

    columnHelper.accessor("amount", {
      header: "Số tiền",
      cell: ({ row }) => {
        const payment = row.original;
        const refunded = payment.refundedAmount ?? 0;
        return (
          <div className="text-right">
            <p className="font-semibold text-sm text-foreground">
              {formatCurrency(payment.amount)}
            </p>
            {refunded > 0 && (
              <p className="text-[11px] text-violet-600 dark:text-violet-400">
                Hoàn {formatCurrency(refunded)}
              </p>
            )}
          </div>
        );
      },
    }),

    columnHelper.accessor("method", {
      header: "Phương thức",
      cell: ({ row }) => (
        <MetaBadge meta={paymentMethodMeta(row.original.method)} />
      ),
    }),

    columnHelper.accessor("status", {
      header: "Trạng thái",
      cell: ({ row }) => (
        <MetaBadge meta={paymentStatusMeta(row.original.status)} />
      ),
    }),

    columnHelper.accessor("createdAt", {
      header: "Tạo lúc",
      cell: ({ row }) => (
        <p className="font-mono text-xs text-foreground whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </p>
      ),
    }),

    columnHelper.accessor("paidAt", {
      header: "Thu lúc",
      cell: ({ row }) => {
        // `paidAt` chỉ có khi giao dịch COMPLETED; PENDING/FAILED luôn trống.
        const paidAt = row.original.paidAt;
        return (
          <p className="font-mono text-xs whitespace-nowrap text-muted-foreground">
            {paidAt ? formatDateTime(paidAt) : EMPTY_VALUE}
          </p>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal size={16} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onViewDetail(row.original.id)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </DropdownMenuItem>
            {row.original.order && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigate(`/admin/orders/${row.original.order!.id}`)}
              >
                <Package className="mr-2 h-4 w-4" />
                Mở đơn hàng
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={payments}
      isLoading={isLoading}
      emptyMessage="Không có giao dịch nào khớp bộ lọc"
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
