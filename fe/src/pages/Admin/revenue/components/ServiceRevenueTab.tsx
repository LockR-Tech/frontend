import {
  MetaBadge,
  ReportErrorState,
  revenueServiceMeta,
} from "~/components/shared/reporting";
import { Skeleton } from "~/components/ui/skeleton";
import { useGetRevenueByServiceQuery } from "~/stores/apis/admin/revenue";
import {
  EMPTY_VALUE,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "~/lib/report-format";
import type { DateRangeValue } from "~/components/shared/reporting";

interface ServiceRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
}

/**
 * Doanh thu theo loại dịch vụ (§ 3.4). Dòng `OVERTIME_FEE` không phải một loại đơn:
 * đó là phần phí quá hạn đã thu, backend tách khỏi dòng loại đơn để không đếm hai lần.
 */
export function ServiceRevenueTab({ range, skip }: ServiceRevenueTabProps) {
  const { data, isLoading, error, refetch } = useGetRevenueByServiceQuery(range, {
    skip,
  });

  if (error) {
    return (
      <ReportErrorState
        error={error}
        onRetry={refetch}
        title="Không tải được doanh thu theo dịch vụ"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const items = data?.data.items ?? [];
  const total = data?.data.totalRevenue ?? 0;

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        Chưa có doanh thu trong khoảng đã chọn.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const meta = revenueServiceMeta(item.serviceType);
        const isOvertime = item.serviceType === "OVERTIME_FEE";
        const share = item.sharePct ?? (total > 0 ? (item.revenue / total) * 100 : 0);

        return (
          <div
            key={item.serviceType}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MetaBadge meta={meta} />
              <div className="text-right">
                <p className="text-lg font-bold text-foreground leading-tight">
                  {formatCurrency(item.revenue)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatPercent(item.sharePct)} tổng doanh thu
                </p>
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Hoàn tiền</p>
                <p className="font-medium">{formatCurrency(item.refundAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Thực thu</p>
                <p className="font-medium">{formatCurrency(item.netRevenue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Đơn tạo mới</p>
                <p className="font-medium">
                  {isOvertime ? EMPTY_VALUE : formatNumber(item.orderCount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Đơn có thu tiền</p>
                <p className="font-medium">{formatNumber(item.paidOrderCount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lượt thanh toán</p>
                <p className="font-medium">
                  {isOvertime ? EMPTY_VALUE : formatNumber(item.paymentCount)}
                </p>
              </div>
            </div>

            {isOvertime && (
              <p className="text-[11px] text-muted-foreground">
                Phần phí quá hạn đã thu, tách khỏi dòng loại đơn để không tính hai lần.
                Hoàn tiền luôn được quy về loại đơn, không quy về dòng này.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
