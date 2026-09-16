import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  PiggyBank,
  RefreshCcw,
  Target,
  Wallet,
} from "lucide-react";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
  DateRangeFilter,
  ReportErrorState,
  ReportStatCard,
} from "~/components/shared/reporting";
import {
  formatCurrency,
  formatDayLabel,
  formatNumber,
  formatPercent,
  formatPercentPoints,
} from "~/lib/report-format";
import type { PaymentStatsResponse } from "~/types/admin/reporting";

interface PaymentStatsProps {
  stats: PaymentStatsResponse | undefined;
  isLoading: boolean;
  error: FetchBaseQueryError | SerializedError | undefined;
  range: { from: string; to: string };
  onRangeChange: (range: { from: string; to: string }) => void;
  onRetry: () => void;
}

/**
 * Thẻ tổng quan giao dịch. Mọi mức thay đổi lấy từ `changes` của backend (kỳ hiện tại
 * so với kỳ liền trước cùng độ dài) — trang cũ ghi cứng "+20.8%" nên không dùng lại.
 */
export function PaymentStats({
  stats,
  isLoading,
  error,
  range,
  onRangeChange,
  onRetry,
}: PaymentStatsProps) {
  const current = stats?.current;
  const changes = stats?.changes;

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <DateRangeFilter value={range} onChange={onRangeChange} />
        {stats && (
          <p className="text-[11px] text-muted-foreground shrink-0">
            So sánh với {formatDayLabel(stats.previousFrom)} –{" "}
            {formatDayLabel(stats.previousTo)}
          </p>
        )}
      </div>

      {error ? (
        <ReportErrorState
          error={error}
          onRetry={onRetry}
          title="Không tải được thống kê giao dịch"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <ReportStatCard
            label="Tổng giao dịch"
            value={formatNumber(current?.totalCount)}
            hint={`Giá trị ${formatCurrency(current?.totalAmount)}`}
            icon={CreditCard}
            changePct={changes?.totalCountPct}
            isLoading={isLoading}
          />
          <ReportStatCard
            label="Thành công"
            value={formatNumber(current?.completedCount)}
            hint={formatCurrency(current?.completedAmount)}
            icon={CheckCircle}
            changePct={changes?.completedCountPct}
            isLoading={isLoading}
          />
          <ReportStatCard
            label="Chờ thanh toán"
            value={formatNumber(current?.pendingCount)}
            hint={formatCurrency(current?.pendingAmount)}
            icon={Clock}
            isLoading={isLoading}
          />
          <ReportStatCard
            label="Thất bại"
            value={formatNumber(current?.failedCount)}
            hint={formatCurrency(current?.failedAmount)}
            icon={AlertCircle}
            isLoading={isLoading}
          />
          <ReportStatCard
            label="Tỉ lệ thành công"
            value={formatPercent(current?.successRate)}
            hint="Số giao dịch thành công / tổng"
            icon={Target}
            changePct={changes?.successRatePoints}
            changeLabel={formatPercentPoints(changes?.successRatePoints)}
            isLoading={isLoading}
          />
          <ReportStatCard
            label="Hoàn tiền"
            value={formatCurrency(current?.refundAmount)}
            hint={`${formatNumber(current?.refundCount)} lượt hoàn`}
            icon={RefreshCcw}
            changePct={changes?.refundAmountPct}
            invertChangeColor
            isLoading={isLoading}
          />
          <ReportStatCard
            label="Thực thu theo đơn"
            value={formatCurrency(current?.netCollectedAmount)}
            hint="Thu theo đơn trừ hoàn tiền, không tính nạp ví"
            icon={Wallet}
            changePct={changes?.netCollectedAmountPct}
            isLoading={isLoading}
          />
        </div>
      )}

      {current && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StatsBreakdown
            title="Theo trạng thái"
            rows={current.byStatus}
            icon={CreditCard}
          />
          <StatsBreakdown
            title="Theo phương thức"
            rows={current.byMethod}
            icon={PiggyBank}
          />
        </div>
      )}
    </div>
  );
}

function StatsBreakdown({
  title,
  rows,
  icon: Icon,
}: {
  title: string;
  rows: { key: string; count: number; amount: number; completedAmount: number }[];
  icon: React.ElementType;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((row) => row.amount), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground truncate">{row.key}</span>
              <span className="text-muted-foreground shrink-0">
                {formatNumber(row.count)} GD · {formatCurrency(row.amount)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.round((row.amount / max) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Thành công {formatCurrency(row.completedAmount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
