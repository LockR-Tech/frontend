import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import { Button } from "~/components/ui/button";
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
import type { RevenueOrdersTarget } from "./RevenueOrdersModal";

interface ServiceRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
  onViewOrders?: (target: RevenueOrdersTarget) => void;
}

/**
 * Doanh thu theo loại dịch vụ (§ 3.4). Dòng `OVERTIME_FEE` không phải một loại đơn:
 * đó là phần phí quá hạn đã thu, backend tách khỏi dòng loại đơn để không đếm hai lần.
 */
export function ServiceRevenueTab({
  range,
  skip,
  onViewOrders,
}: ServiceRevenueTabProps) {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useGetRevenueByServiceQuery(range, {
    skip,
  });

  if (error) {
    return (
      <ReportErrorState
        error={error}
        onRetry={refetch}
        title={t("admin.revenue.service.loadFailed")}
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
        {t("admin.revenue.service.empty")}
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
              <div className="flex items-center gap-2">
                <MetaBadge meta={meta} />
                {!isOvertime && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                    disabled={item.paidOrderCount === 0 && item.orderCount === 0}
                    onClick={() =>
                      onViewOrders?.({
                        type: "SERVICE",
                        serviceType: item.serviceType,
                        label: meta.label,
                        paidOrderCount: item.paidOrderCount,
                      })
                    }
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>{t("admin.revenue.actions.viewOrders", "Xem đơn")}</span>
                  </Button>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foreground leading-tight">
                  {formatCurrency(item.revenue)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("admin.revenue.service.share", {
                    percent: formatPercent(item.sharePct),
                  })}
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
                <p className="text-muted-foreground">{t("admin.payments.refunds")}</p>
                <p className="font-medium">{formatCurrency(item.refundAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("admin.revenue.columns.net")}</p>
                <p className="font-medium">{formatCurrency(item.netRevenue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("admin.revenue.columns.newOrders")}</p>
                <p className="font-medium">
                  {isOvertime ? EMPTY_VALUE : formatNumber(item.orderCount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("admin.revenue.columns.paidOrders")}</p>
                <p className="font-medium">{formatNumber(item.paidOrderCount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("admin.revenue.columns.paymentCount")}</p>
                <p className="font-medium">
                  {isOvertime ? EMPTY_VALUE : formatNumber(item.paymentCount)}
                </p>
              </div>
            </div>

            {isOvertime && (
              <p className="text-[11px] text-muted-foreground">
                {t("admin.revenue.service.overtimeNote")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
