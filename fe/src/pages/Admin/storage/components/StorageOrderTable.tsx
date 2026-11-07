import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Bot, HandHelping, MapPin, UserRound } from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Button } from "~/components/ui/button";
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

/**
 * 5 cột gộp (đơn + tủ gốc, khách gửi → người nhận, lưu kho, phí, trao trả) để vừa màn hình laptop
 * mà không phải kéo ngang; chữ dài thì xuống dòng thay vì đẩy bảng rộng ra.
 */
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

  const columns = [
    columnHelper.accessor("orderCode", {
      header: t("common.order"),
      cell: ({ row }) => {
        const order = row.original;
        const locker = order.locker ?? order.destinationLocker;
        return (
          <div className="min-w-[150px] max-w-[220px] space-y-1">
            <p className="break-all font-mono text-sm font-semibold text-foreground">
              {order.orderCode ?? t("admin.orders.noCode")}
            </p>
            <MetaBadge meta={orderTypeMeta(order.type)} hideIcon />
            <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">
                {locker?.name || locker?.code || t("admin.orders.lookup.lockerName")}
                {order.store?.name ? ` · ${order.store.name}` : ""}
              </span>
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("customer", {
      header: t("admin.storage.table.people"),
      cell: ({ row }) => {
        const { customer, receiver } = row.original;
        const receiverName = receiver?.name || receiver?.accountFullName;
        const receiverPhone = receiver?.phone || receiver?.accountPhoneNumber;
        return (
          <div className="min-w-[160px] max-w-[240px] space-y-1.5">
            <div>
              <p className="line-clamp-1 text-sm font-medium text-foreground">
                {customer?.fullName || t("admin.orders.lookup.customerName")}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {customer?.phoneNumber || EMPTY_VALUE}
              </p>
            </div>
            <div className="flex items-start gap-1">
              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              {receiverName || receiverPhone ? (
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs text-foreground">{receiverName || EMPTY_VALUE}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{receiverPhone || EMPTY_VALUE}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("admin.storage.handOver.selfPickup")}</p>
              )}
            </div>
          </div>
        );
      },
    }),

    columnHelper.display({
      id: "storage",
      header: t("admin.storage.table.storage"),
      cell: ({ row }) => {
        const order = row.original;
        const storage = order.storage;
        const byStaff = storage?.movedByUserId != null;
        const hours = storedHours(order, now);
        const days = hours === null ? 0 : hours / 24;
        return (
          <div className="min-w-[170px] space-y-1">
            {hours !== null && (
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                  days >= ALERT_DAYS
                    ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
                    : days >= WARN_DAYS
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "border-border bg-secondary text-foreground",
                )}
              >
                {storedDurationLabel(hours, t)}
              </span>
            )}
            <p className="text-[11px] text-foreground">
              {t("admin.storage.table.storedAtShort", { time: formatDateTime(storedAtOf(order)) })}
            </p>
            {storage && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {byStaff ? <UserRound className="h-3 w-3 shrink-0" /> : <Bot className="h-3 w-3 shrink-0" />}
                <span className="line-clamp-1">
                  {byStaff
                    ? t("admin.storage.table.movedByStaff", {
                        name: storage.movedByName || `#${storage.movedByUserId}`,
                      })
                    : t("admin.storage.table.movedBySystem")}
                </span>
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {t("admin.storage.table.deadlineShort", { time: formatDateTime(order.pickupDeadline) })}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor("paymentStatus", {
      header: t("admin.storage.table.overtimeFee"),
      cell: ({ row }) => {
        const order = row.original;
        const owed = outstandingOf(order);
        return (
          <div className="min-w-[110px] space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(order.fees?.overtimeFee ?? order.extraFee ?? 0)}
            </p>
            <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} hideIcon />
            {owed > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
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
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 whitespace-nowrap"
          onClick={() => onHandOver(row.original)}
        >
          <HandHelping className="h-4 w-4" />
          {t("admin.storage.table.handOver")}
        </Button>
      ),
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
