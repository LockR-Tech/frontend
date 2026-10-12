import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Eye } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/shared/data-table";
import { ReportErrorState } from "~/components/shared/reporting";
import { useGetRevenueByStoreQuery } from "~/stores/apis/admin/revenue";
import {
  EMPTY_VALUE,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "~/lib/report-format";
import type { DateRangeValue } from "~/components/shared/reporting";
import type { RevenueByStoreItem } from "~/types/admin/reporting";
import type { RevenueOrdersTarget } from "./RevenueOrdersModal";

interface StoreRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
  onViewOrders?: (target: RevenueOrdersTarget) => void;
}

const columnHelper = createColumnHelper<RevenueByStoreItem>();

/** Doanh thu theo cửa hàng (§ 3.7), gồm cả cửa hàng chưa phát sinh doanh thu. */
export function StoreRevenueTab({ range, skip, onViewOrders }: StoreRevenueTabProps) {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useGetRevenueByStoreQuery(range, {
    skip,
  });

  const columns = [
    columnHelper.accessor("name", {
      header: t("common.store"),
      cell: ({ row }) => {
        const store = row.original;
        // `storeId = null` gộp các đơn chưa gán cửa hàng nào.
        if (store.storeId === null) {
          return (
            <span className="text-sm text-muted-foreground italic">
              {t("admin.revenue.store.unassigned")}
            </span>
          );
        }
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {store.name ?? t("admin.orders.lookup.storeName")}
            </p>
            <p className="text-[11px] text-muted-foreground truncate max-w-[240px]">
              {store.address ?? EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("contactPhone", {
      header: t("admin.revenue.store.contact"),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.contactPhone ?? EMPTY_VALUE}
        </span>
      ),
    }),
    columnHelper.accessor("revenue", {
      header: t("admin.revenue.columns.revenue"),
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.revenue)}</span>
      ),
    }),
    columnHelper.accessor("netRevenue", {
      header: t("admin.revenue.columns.net"),
      cell: ({ row }) => formatCurrency(row.original.netRevenue),
    }),
    columnHelper.accessor("sharePct", {
      header: t("admin.revenue.columns.share"),
      cell: ({ row }) => formatPercent(row.original.sharePct),
    }),
    columnHelper.accessor("lockerCount", {
      header: t("admin.revenue.columns.lockerCount"),
      cell: ({ row }) => formatNumber(row.original.lockerCount),
    }),
    columnHelper.accessor("boxCount", {
      header: t("admin.revenue.columns.boxCount"),
      cell: ({ row }) => formatNumber(row.original.boxCount),
    }),
    columnHelper.accessor("orderCount", {
      header: t("admin.revenue.columns.newOrders"),
      cell: ({ row }) => formatNumber(row.original.orderCount),
    }),
    columnHelper.accessor("paidOrderCount", {
      header: t("admin.revenue.columns.paidOrders"),
      cell: ({ row }) => formatNumber(row.original.paidOrderCount),
    }),
    columnHelper.display({
      id: "actions",
      header: () => (
        <span className="text-right block">
          {t("admin.revenue.actions.header", "Hành động")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const storeName =
          item.name ??
          (item.storeId === null
            ? t("admin.revenue.store.unassigned")
            : `#${item.storeId}`);
        return (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
              disabled={item.paidOrderCount === 0 && item.orderCount === 0}
              onClick={() =>
                onViewOrders?.({
                  type: "STORE",
                  storeId: item.storeId,
                  label: storeName,
                  paidOrderCount: item.paidOrderCount,
                })
              }
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{t("admin.revenue.actions.viewOrders", "Xem đơn")}</span>
            </Button>
          </div>
        );
      },
    }),
  ];

  if (error) {
    return (
      <ReportErrorState
        error={error}
        onRetry={refetch}
        title={t("admin.revenue.store.loadFailed")}
      />
    );
  }

  const lookupAvailable = data?.data.lookupAvailable ?? true;

  return (
    <div className="space-y-3">
      {!lookupAvailable && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {t("admin.revenue.store.lookupUnavailable")}
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data.items ?? []}
        isLoading={isLoading}
        emptyMessage={t("admin.revenue.store.empty")}
      />
    </div>
  );
}
