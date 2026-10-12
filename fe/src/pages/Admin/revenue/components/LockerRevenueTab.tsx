import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Eye } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/shared/data-table";
import { ReportErrorState } from "~/components/shared/reporting";
import { useGetRevenueByLockerQuery } from "~/stores/apis/admin/revenue";
import {
  EMPTY_VALUE,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "~/lib/report-format";
import type { DateRangeValue } from "~/components/shared/reporting";
import type { RevenueByLockerItem } from "~/types/admin/reporting";
import type { RevenueOrdersTarget } from "./RevenueOrdersModal";

interface LockerRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
  onViewOrders?: (target: RevenueOrdersTarget) => void;
}

const columnHelper = createColumnHelper<RevenueByLockerItem>();

/**
 * Doanh thu theo tủ (§ 3.6). Danh sách gồm CẢ tủ chưa phát sinh doanh thu, để thấy
 * ngay tủ nào đang không sinh tiền — đó là lý do bảng này không lọc bỏ dòng bằng 0.
 */
export function LockerRevenueTab({ range, skip, onViewOrders }: LockerRevenueTabProps) {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useGetRevenueByLockerQuery(range, {
    skip,
  });

  const columns = [
    columnHelper.accessor("code", {
      header: t("admin.orders.fields.locker"),
      cell: ({ row }) => {
        const locker = row.original;
        // `lockerId = null` là dòng gộp các đơn không gắn tủ nào.
        if (locker.lockerId === null) {
          return (
            <span className="text-sm text-muted-foreground italic">
              {t("admin.revenue.locker.noLocker")}
            </span>
          );
        }
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium font-mono truncate">
              {locker.name ?? locker.code ?? t("admin.orders.lookup.lockerName")}
            </p>
            <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
              {locker.name ?? locker.address ?? EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("storeName", {
      header: t("common.store"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.storeName ??
            t("admin.orders.lookup.storeName")}
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
    columnHelper.accessor("boxCount", {
      header: t("admin.revenue.columns.boxCount"),
      cell: ({ row }) => formatNumber(row.original.boxCount),
    }),
    columnHelper.accessor("revenuePerBox", {
      header: t("admin.revenue.locker.revenuePerBox"),
      cell: ({ row }) => formatCurrency(row.original.revenuePerBox),
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
        const lockerName =
          item.name ??
          item.code ??
          (item.lockerId === null
            ? t("admin.revenue.locker.noLocker")
            : `#${item.lockerId}`);
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
                  type: "LOCKER",
                  lockerId: item.lockerId,
                  label: lockerName,
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
        title={t("admin.revenue.locker.loadFailed")}
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
            {t("admin.revenue.locker.lookupUnavailable")}
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data.items ?? []}
        isLoading={isLoading}
        emptyMessage={t("admin.revenue.locker.empty")}
      />

      <p className="text-[11px] text-muted-foreground">
        {t("admin.revenue.locker.note")}
      </p>
    </div>
  );
}
