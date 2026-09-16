import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "~/components/shared/data-table";
import {
  MetaBadge,
  ReportErrorState,
  paymentMethodMeta,
} from "~/components/shared/reporting";
import { useGetRevenueByMethodQuery } from "~/stores/apis/admin/revenue";
import { formatCurrency, formatNumber, formatPercent } from "~/lib/report-format";
import type { DateRangeValue } from "~/components/shared/reporting";
import type { RevenueByMethodItem } from "~/types/admin/reporting";

interface MethodRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
}

const columnHelper = createColumnHelper<RevenueByMethodItem>();

/**
 * Doanh thu theo phương thức thanh toán (§ 3.5). Nạp ví (`VNPAY_TOPUP`) không xuất
 * hiện ở đây vì tiền nạp là tiền gửi, chỉ tính khi khách dùng ví trả cho một đơn.
 */
export function MethodRevenueTab({ range, skip }: MethodRevenueTabProps) {
  const { data, isLoading, error, refetch } = useGetRevenueByMethodQuery(range, {
    skip,
  });

  const columns = [
    columnHelper.accessor("method", {
      header: "Phương thức",
      cell: ({ row }) => <MetaBadge meta={paymentMethodMeta(row.original.method)} />,
    }),
    columnHelper.accessor("revenue", {
      header: "Doanh thu",
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.revenue)}</span>
      ),
    }),
    columnHelper.accessor("refundAmount", {
      header: "Hoàn tiền",
      cell: ({ row }) => formatCurrency(row.original.refundAmount),
    }),
    columnHelper.accessor("netRevenue", {
      header: "Thực thu",
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.netRevenue)}</span>
      ),
    }),
    columnHelper.accessor("sharePct", {
      header: "Tỉ trọng",
      cell: ({ row }) => formatPercent(row.original.sharePct),
    }),
    columnHelper.accessor("paymentCount", {
      header: "Lượt thanh toán",
      cell: ({ row }) => formatNumber(row.original.paymentCount),
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
        title="Không tải được doanh thu theo phương thức"
      />
    );
  }

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={data?.data.items ?? []}
        isLoading={isLoading}
        emptyMessage="Chưa có khoản thu nào trong khoảng đã chọn"
      />
      <p className="text-[11px] text-muted-foreground">
        Hoàn tiền được quy về phương thức của giao dịch bị hoàn. Tiền nạp ví không nằm
        trong doanh thu; ví chỉ tính khi khách dùng số dư trả cho một đơn.
      </p>
    </div>
  );
}
