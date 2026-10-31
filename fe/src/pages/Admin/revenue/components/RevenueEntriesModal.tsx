import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createColumnHelper } from "@tanstack/react-table";
import { Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { DataTable } from "~/components/shared/data-table";
import {
  MetaBadge,
  ReportErrorState,
  orderTypeMeta,
  paymentMethodMeta,
} from "~/components/shared/reporting";
import { useGetRevenueEntriesQuery } from "~/stores/apis/admin/revenue";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency, formatNumber } from "~/lib/report-format";
import type { RevenueEntry, RevenueEntryKind } from "~/types/admin/reporting";

export interface RevenueEntriesTarget {
  kind: RevenueEntryKind;
  label: string;
  range: { from: string; to: string };
}

const entryColumn = createColumnHelper<RevenueEntry>();

function orderPath(entry: RevenueEntry) {
  return entry.orderType === "DRONE_DELIVERY" ? `/admin/drone-orders/${entry.orderId}` : `/admin/orders/${entry.orderId}`;
}

/** Đúng các khoản thu/hoàn đã cộng vào số trên thẻ doanh thu, nên tổng trong hộp luôn khớp thẻ. */
export function RevenueEntriesModal({
  target,
  onClose,
}: {
  target: RevenueEntriesTarget | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [target]);

  const { data, isLoading, error, refetch } = useGetRevenueEntriesQuery(
    target ? { ...target.range, kind: target.kind } : { from: "", to: "", kind: "PAYMENTS" },
    { skip: !target },
  );
  const result = data?.data;
  const entries = useMemo(() => result?.entries ?? [], [result]);

  const columns = [
    entryColumn.accessor("orderCode", {
      header: t("common.order"),
      cell: ({ row }) =>
        row.original.orderId ? (
          <Link
            to={orderPath(row.original)}
            onClick={onClose}
            className="font-mono text-xs font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
          >
            {row.original.orderCode ?? `#${row.original.orderId}`}
          </Link>
        ) : (
          EMPTY_VALUE
        ),
    }),
    entryColumn.accessor("customerName", {
      header: t("common.customer"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{row.original.customerName ?? EMPTY_VALUE}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{row.original.customerPhone ?? EMPTY_VALUE}</p>
        </div>
      ),
    }),
    entryColumn.accessor("orderType", {
      header: t("admin.orders.fields.kind"),
      cell: ({ row }) =>
        row.original.orderType ? <MetaBadge meta={orderTypeMeta(row.original.orderType)} hideIcon /> : EMPTY_VALUE,
    }),
    entryColumn.accessor("method", {
      header: t("admin.payments.method"),
      cell: ({ row }) =>
        row.original.method ? <MetaBadge meta={paymentMethodMeta(row.original.method)} hideIcon /> : EMPTY_VALUE,
    }),
    entryColumn.accessor("amount", {
      header: t("admin.payments.amount"),
      cell: ({ row }) => (
        <span className={`text-xs font-semibold ${row.original.kind === "REFUNDS" ? "text-rose-600" : "text-emerald-600"}`}>
          {formatCurrency(row.original.amount)}
        </span>
      ),
    }),
    entryColumn.accessor("at", {
      header: t("common.time"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
          {formatDateTime(row.original.at)}
        </span>
      ),
    }),
  ];

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[88vh] max-w-5xl flex-col p-6">
        <DialogHeader className="shrink-0 space-y-1.5 border-b pb-4">
          <DialogTitle className="text-base font-bold sm:text-lg">{target?.label}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {t("admin.revenue.entries.summary", {
                total: formatCurrency(result?.total),
                entries: formatNumber(entries.length),
                orders: formatNumber(result?.orderCount),
              })}
            </span>
            {target && (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-[11px]">
                <Calendar className="h-3 w-3" />
                {target.range.from} → {target.range.to}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-3 overflow-y-auto py-3">
          {error && <ReportErrorState error={error} onRetry={refetch} />}
          <DataTable
            columns={columns as never}
            data={entries.slice(page * pageSize, (page + 1) * pageSize)}
            isLoading={isLoading}
            emptyMessage={t("admin.revenue.ordersModal.empty")}
            serverPagination={{
              pageIndex: page,
              pageSize,
              pageCount: Math.max(1, Math.ceil(entries.length / pageSize)),
              totalRows: entries.length,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(0);
              },
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
