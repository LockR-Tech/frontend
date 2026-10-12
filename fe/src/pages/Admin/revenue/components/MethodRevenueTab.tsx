import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
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

import { Eye } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { RevenueOrdersTarget } from "./RevenueOrdersModal";

interface MethodRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
  onViewOrders?: (target: RevenueOrdersTarget) => void;
}

const columnHelper = createColumnHelper<RevenueByMethodItem>();

/**
 * Doanh thu theo phương thức thanh toán (§ 3.5). Nạp ví (`VNPAY_TOPUP`) không xuất
 * hiện ở đây vì tiền nạp là tiền gửi, chỉ tính khi khách dùng ví trả cho một đơn.
 */
export function MethodRevenueTab({ range, skip, onViewOrders }: MethodRevenueTabProps) {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useGetRevenueByMethodQuery(range, {
    skip,
  });

  const columns = [
    columnHelper.accessor("method", {
      header: t("admin.payments.method"),
      cell: ({ row }) => <MetaBadge meta={paymentMethodMeta(row.original.method)} />,
    }),
    columnHelper.accessor("revenue", {
      header: t("admin.revenue.columns.revenue"),
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.revenue)}</span>
      ),
    }),
    columnHelper.accessor("refundAmount", {
      header: t("admin.payments.refunds"),
      cell: ({ row }) => formatCurrency(row.original.refundAmount),
    }),
    columnHelper.accessor("netRevenue", {
      header: t("admin.revenue.columns.net"),
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.netRevenue)}</span>
      ),
    }),
    columnHelper.accessor("sharePct", {
      header: t("admin.revenue.columns.share"),
      cell: ({ row }) => formatPercent(row.original.sharePct),
    }),
    columnHelper.accessor("paymentCount", {
      header: t("admin.revenue.columns.paymentCount"),
      cell: ({ row }) => formatNumber(row.original.paymentCount),
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
        const meta = paymentMethodMeta(item.method);
        return (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
              disabled={item.paidOrderCount === 0}
              onClick={() =>
                onViewOrders?.({
                  type: "METHOD",
                  method: item.method,
                  label: meta.label,
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
        title={t("admin.revenue.method.loadFailed")}
      />
    );
  }

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={data?.data.items ?? []}
        isLoading={isLoading}
        emptyMessage={t("admin.revenue.method.empty")}
      />
      <p className="text-[11px] text-muted-foreground">
        {t("admin.revenue.method.note")}
      </p>
    </div>
  );
}
