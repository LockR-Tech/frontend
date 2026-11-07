import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Edit3, Eye, MapPin, MoreHorizontal } from "lucide-react";
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
import { adminOrderNextStatuses } from "~/types/admin/reporting";
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

/**
 * 6 cột gộp để vừa màn hình laptop, không phải kéo ngang. Mọi thứ bảng gộp/rút gọn vẫn có đủ ở
 * trang chi tiết (`detail.tsx`): ngày tạo ở tiêu đề + "Thông tin đơn", chế độ bay ở khối Drone,
 * phương thức thanh toán ở thẻ Thanh toán, số ô gửi/nhận/giữ ở khối Tủ.
 */
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
  const { t } = useTranslation();
  const navigate = useNavigate();

  const modeLabel = (mode: string) =>
    mode === "DEMO"
      ? t("admin.droneOrders.fields.modeDemo")
      : mode === "STANDARD"
        ? t("admin.droneOrders.fields.modeStandard")
        : mode;

  const columns = [
    columnHelper.accessor("orderCode", {
      header: t("common.order"),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="min-w-[150px] max-w-[210px] space-y-1">
            {/* Mã đơn là thứ khách và nhân viên đọc cho nhau; id nội bộ bỏ đi vì
                nhìn vào không biết là đơn nào. */}
            <p className="break-all font-mono text-sm font-semibold text-foreground">
              {order.orderCode ?? t("admin.orders.noCode")}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <MetaBadge meta={orderTypeMeta(order.type)} hideIcon />
              {order.fulfillmentMode && (
                <span className="text-[11px] text-muted-foreground">{modeLabel(order.fulfillmentMode)}</span>
              )}
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">{formatDateTime(order.createdAt)}</p>
          </div>
        );
      },
    }),

    columnHelper.accessor("customer", {
      header: t("admin.orders.table.people"),
      cell: ({ row }) => {
        const { customer, receiver } = row.original;
        const receiverName = receiver?.name || receiver?.accountFullName;
        const receiverPhone = receiver?.phone || receiver?.accountPhoneNumber;
        return (
          <div className="min-w-[150px] max-w-[230px] space-y-1.5">
            <div>
              <p className="line-clamp-1 text-sm font-medium text-foreground">
                {customer?.fullName || t("admin.orders.lookup.customerName")}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {customer?.phoneNumber || EMPTY_VALUE}
              </p>
            </div>
            {(receiverName || receiverPhone) && (
              <div className="flex items-start gap-1">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs text-foreground">{receiverName || EMPTY_VALUE}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{receiverPhone || EMPTY_VALUE}</p>
                </div>
              </div>
            )}
          </div>
        );
      },
    }),

    columnHelper.accessor("status", {
      header: t("admin.orders.table.statusPayment"),
      cell: ({ row }) => {
        const order = row.original;
        const method = order.payment?.lastPaidMethod;
        return (
          <div className="min-w-[120px] space-y-1">
            <MetaBadge meta={orderStatusMeta(order.status)} />
            <div className="flex flex-wrap items-center gap-1">
              <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} hideIcon />
              {method && (
                <span className="text-[11px] text-muted-foreground">{paymentMethodMeta(method).label}</span>
              )}
            </div>
          </div>
        );
      },
    }),

    columnHelper.accessor("lockerId", {
      header: t("admin.orders.table.lockerBox"),
      cell: ({ row }) => {
        const order = row.original;
        const locker = lockerOf(order);
        const boxNumber = order.sendBoxNumber ?? order.receiveBoxNumber;
        return (
          <div className="min-w-[120px] max-w-[200px]">
            <p className="flex items-start gap-1 text-sm text-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">
                {locker?.name || locker?.code || t("admin.orders.lookup.lockerName")}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {boxNumber !== null && boxNumber !== undefined
                ? t("admin.orders.boxNumber", { number: boxNumber })
                : t("admin.orders.table.noBox")}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("totalPrice", {
      header: t("admin.orders.columns.total"),
      cell: ({ row }) => {
        const order = row.original;
        const outstanding = order.payment?.outstandingAmount ?? null;
        return (
          <div className="min-w-[90px] text-right">
            <p className="text-sm font-semibold text-foreground">{formatCurrency(order.totalPrice)}</p>
            {outstanding !== null && outstanding > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                {t("admin.orders.table.outstanding", {
                  amount: formatCurrency(outstanding),
                })}
              </p>
            )}
          </div>
        );
      },
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
                {t("dropdown.viewDetail")}
              </DropdownMenuItem>
              {/* Đơn đã đóng (COMPLETED/CANCELED) không còn bước nào admin đổi tay được. */}
              {adminOrderNextStatuses(order.status).length > 0 && (
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(order)}
                  className="cursor-pointer"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  {t("admin.orders.updateStatus")}
                </DropdownMenuItem>
              )}
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
      emptyMessage={t("admin.orders.table.empty")}
      onRowClick={(order) => navigate(`/admin/orders/${order.id}`)}
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
