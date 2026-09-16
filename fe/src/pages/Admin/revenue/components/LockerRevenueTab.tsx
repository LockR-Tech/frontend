import { createColumnHelper } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
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

interface LockerRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
}

const columnHelper = createColumnHelper<RevenueByLockerItem>();

/**
 * Doanh thu theo tủ (§ 3.6). Danh sách gồm CẢ tủ chưa phát sinh doanh thu, để thấy
 * ngay tủ nào đang không sinh tiền — đó là lý do bảng này không lọc bỏ dòng bằng 0.
 */
export function LockerRevenueTab({ range, skip }: LockerRevenueTabProps) {
  const { data, isLoading, error, refetch } = useGetRevenueByLockerQuery(range, {
    skip,
  });

  const columns = [
    columnHelper.accessor("code", {
      header: "Tủ",
      cell: ({ row }) => {
        const locker = row.original;
        // `lockerId = null` là dòng gộp các đơn không gắn tủ nào.
        if (locker.lockerId === null) {
          return (
            <span className="text-sm text-muted-foreground italic">
              Đơn không gắn tủ
            </span>
          );
        }
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium font-mono truncate">
              {locker.name ?? locker.code ?? "Chưa tra được tên tủ"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
              {locker.name ?? locker.address ?? EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("storeName", {
      header: "Cửa hàng",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.storeName ??
            "Chưa tra được tên cửa hàng"}
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
    columnHelper.accessor("boxCount", {
      header: "Số ô",
      cell: ({ row }) => formatNumber(row.original.boxCount),
    }),
    columnHelper.accessor("revenuePerBox", {
      header: "Doanh thu / ô",
      cell: ({ row }) => formatCurrency(row.original.revenuePerBox),
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
        title="Không tải được doanh thu theo tủ"
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
            Không tra cứu được danh mục tủ hoặc cửa hàng: tên tủ có thể trống và các tủ
            chưa phát sinh doanh thu có thể bị thiếu khỏi bảng.
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data.items ?? []}
        isLoading={isLoading}
        emptyMessage="Chưa có tủ nào trong khoảng đã chọn"
      />

      <p className="text-[11px] text-muted-foreground">
        Bảng gồm cả tủ chưa phát sinh doanh thu. Số ô tính cả ô đang ngừng hoạt động.
      </p>
    </div>
  );
}
