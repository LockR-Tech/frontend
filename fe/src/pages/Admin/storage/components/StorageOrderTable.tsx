import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, Eye, HandHelping, MapPin, MoreHorizontal, UserRound } from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MetaBadge, orderPaymentStatusMeta, orderTypeMeta } from "~/components/shared/reporting";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency } from "~/lib/report-format";
import { cn } from "~/lib/utils";
import type { AdminOrder } from "~/types/admin/reporting";
import { outstandingOf, storedAtOf, storedDurationLabel, storedHours } from "../storage-utils";

interface StorageOrderTableProps {
  orders: AdminOrder[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onHandOver: (order: AdminOrder) => void;
}

/** Từ mốc này hiện màu cảnh báo / màu đỏ cho thời gian nằm kho. */
const WARN_DAYS = 3;
const ALERT_DAYS = 7;

export function StorageOrderTable({
  orders,
  isLoading,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
  onHandOver,
}: StorageOrderTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const columnHelper = createColumnHelper<AdminOrder>();
  const now = Date.now();

  const durationLabel = (hours: number) => storedDurationLabel(hours, t);

  const columns = [
    columnHelper.accessor("orderCode", {
      header: t("common.order"),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="min-w-0 space-y-1">
            <p className="font-mono font-semibold text-sm text-foreground truncate">
              {order.orderCode ?? t("admin.orders.noCode")}
            </p>
            <MetaBadge meta={orderTypeMeta(order.type)} hideIcon />
          </div>
        );
      },
    }),

    columnHelper.accessor("customer", {
      header: t("admin.orders.table.senderCustomer"),
      cell: ({ row }) => {
        const { customer } = row.original;
        return (
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {customer?.fullName || t("admin.orders.lookup.customerName")}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer?.phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("receiverName", {
      header: t("admin.orders.fields.receiver"),
      cell: ({ row }) => {
        const receiver = row.original.receiver;
        const name = receiver?.name || receiver?.accountFullName;
        const phone = receiver?.phone || receiver?.accountPhoneNumber;
        return (
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">{name || EMPTY_VALUE}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{phone || EMPTY_VALUE}</p>
          </div>
        );
      },
    }),

    columnHelper.accessor("lockerId", {
      header: t("admin.storage.table.fromLocker"),
      cell: ({ row }) => {
        const order = row.original;
        const locker = order.locker ?? order.destinationLocker;
        return (
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              {locker?.name || locker?.code || t("admin.orders.lookup.lockerName")}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {order.store?.name || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("pickupDeadline", {
      header: t("admin.storage.table.pickupDeadline"),
      cell: ({ row }) => (
        <p className="font-mono text-xs text-foreground whitespace-nowrap">
          {formatDateTime(row.original.pickupDeadline)}
        </p>
      ),
    }),

    columnHelper.display({
      id: "storedAt",
      header: t("admin.storage.table.storedAt"),
      cell: ({ row }) => {
        const order = row.original;
        const storage = order.storage;
        const byStaff = storage?.movedByUserId != null;
        return (
          <div className="min-w-0">
            <p className="font-mono text-xs text-foreground whitespace-nowrap">
              {formatDateTime(storedAtOf(order))}
            </p>
            {storage && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                {byStaff ? (
                  <UserRound className="h-3 w-3 shrink-0" />
                ) : (
                  <Bot className="h-3 w-3 shrink-0" />
                )}
                {byStaff
                  ? t("admin.storage.table.movedByStaff", {
                      name: storage.movedByName || `#${storage.movedByUserId}`,
                    })
                  : t("admin.storage.table.movedBySystem")}
              </p>
            )}
          </div>
        );
      },
    }),

    columnHelper.display({
      id: "storedFor",
      header: t("admin.storage.table.storedFor"),
      cell: ({ row }) => {
        const hours = storedHours(row.original, now);
        if (hours === null) return <span className="text-muted-foreground">{EMPTY_VALUE}</span>;
        const days = hours / 24;
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
              days >= ALERT_DAYS
                ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                : days >= WARN_DAYS
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  : "bg-secondary text-foreground border-border",
            )}
          >
            {durationLabel(hours)}
          </span>
        );
      },
    }),

    columnHelper.accessor("paymentStatus", {
      header: t("admin.storage.table.overtimeFee"),
      cell: ({ row }) => {
        const order = row.original;
        const owed = outstandingOf(order);
        return (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground whitespace-nowrap">
              {formatCurrency(order.fees?.overtimeFee ?? order.extraFee ?? 0)}
            </p>
            <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} hideIcon />
            {owed > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 whitespace-nowrap">
                {t("admin.orders.table.outstanding", { amount: formatCurrency(owed) })}
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
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => navigate(`/admin/orders/${order.id}`)}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                {t("dropdown.viewDetail")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onHandOver(order)} className="cursor-pointer">
                <HandHelping className="mr-2 h-4 w-4" />
                {t("admin.storage.handOver.action")}
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
      emptyMessage={t("admin.storage.table.empty")}
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
