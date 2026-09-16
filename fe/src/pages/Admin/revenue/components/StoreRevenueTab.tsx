import { createColumnHelper } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
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

interface StoreRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
}

const columnHelper = createColumnHelper<RevenueByStoreItem>();

/** Doanh thu theo cửa hàng (§ 3.7), gồm cả cửa hàng chưa phát sinh doanh thu. */
export function StoreRevenueTab({ range, skip }: StoreRevenueTabProps) {
  const { data, isLoading, error, refetch } = useGetRevenueByStoreQuery(range, {
    skip,
  });

  const columns = [
    columnHelper.accessor("name", {
      header: "Cửa hàng",
      cell: ({ row }) => {
        const store = row.original;
        // `storeId = null` gộp các đơn chưa gán cửa hàng nào.
        if (store.storeId === null) {
          return (
            <span className="text-sm text-muted-foreground italic">
              Chưa gán cửa hàng
            </span>
          );
        }
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {store.name ?? "Chưa tra được tên cửa hàng"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate max-w-[240px]">
              {store.address ?? EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("contactPhone", {
      header: "Liên hệ",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.contactPhone ?? EMPTY_VALUE}
        </span>
      ),
    }),
    columnHelper.accessor("revenue", {
      header: "Doanh thu",
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.revenue)}</span>
      ),
    }),
    columnHelper.accessor("netRevenue", {
      header: "Thực thu",
      cell: ({ row }) => formatCurrency(row.original.netRevenue),
    }),
    columnHelper.accessor("sharePct", {
      header: "Tỉ trọng",
      cell: ({ row }) => formatPercent(row.original.sharePct),
    }),
    columnHelper.accessor("lockerCount", {
      header: "Số tủ",
      cell: ({ row }) => formatNumber(row.original.lockerCount),
    }),
    columnHelper.accessor("boxCount", {
      header: "Số ô",
      cell: ({ row }) => formatNumber(row.original.boxCount),
    }),
    columnHelper.accessor("orderCount", {
      header: "Đơn tạo mới",
      cell: ({ row }) => formatNumber(row.original.orderCount),
    }),
    columnHelper.accessor("paidOrderCount", {
      header: "Đơn có thu tiền",
      cell: ({ row }) => formatNumber(row.original.paidOrderCount),
    }),
  ];

  if (error) {
    return (
      <ReportErrorState
        error={error}
        onRetry={refetch}
        title="Không tải được doanh thu theo cửa hàng"
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
            Không tra cứu được danh mục cửa hàng: tên có thể trống và các cửa hàng chưa
            phát sinh doanh thu có thể bị thiếu khỏi bảng.
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data.items ?? []}
        isLoading={isLoading}
        emptyMessage="Chưa có cửa hàng nào trong khoảng đã chọn"
      />
    </div>
  );
}
