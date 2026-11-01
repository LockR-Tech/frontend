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
import { useTranslation } from "react-i18next";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
  DateRangeFilter,
  ReportErrorState,
  ReportStatCard,
  paymentMethodMeta,
  paymentStatusMeta,
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
  /// Thẻ/hàng ứng với bộ lọc đang áp cho bảng giao dịch, để tô sáng.
  selected: { status?: string; method?: string } | null;
  /// Bấm để bảng giao dịch hiện những giao dịch tạo nên con số.
  onSelect: (filter: { status?: string; method?: string }) => void;
  /// Thẻ tiền hoàn và thực thu không phải danh sách giao dịch, mở hộp các khoản.
  onShowEntries: (kind: "REFUNDS" | "NET", label: string) => void;
}

const SELECTED_CARD = "ring-2 ring-primary";

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
  selected,
  onSelect,
  onShowEntries,
}: PaymentStatsProps) {
  const { t } = useTranslation();
  const current = stats?.current;
  const changes = stats?.changes;
  const isSelected = (status?: string) => selected !== null && !selected.method && selected.status === status;
  const statusCard = (status?: string) => ({
    onClick: () => onSelect({ status }),
    className: isSelected(status) ? SELECTED_CARD : undefined,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <DateRangeFilter value={range} onChange={onRangeChange} />
        {stats && (
          <p className="text-[11px] text-muted-foreground shrink-0">
            {t("admin.payments.stats.compareWith", {
              from: formatDayLabel(stats.previousFrom),
              to: formatDayLabel(stats.previousTo),
            })}
          </p>
        )}
      </div>

      {error ? (
        <ReportErrorState
          error={error}
          onRetry={onRetry}
          title={t("admin.payments.stats.loadFailed")}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <ReportStatCard
            label={t("admin.payments.stats.total")}
            value={formatNumber(current?.totalCount)}
            hint={t("admin.payments.stats.totalValue", {
              amount: formatCurrency(current?.totalAmount),
            })}
            icon={CreditCard}
            changePct={changes?.totalCountPct}
            isLoading={isLoading}
            {...statusCard()}
          />
          <ReportStatCard
            label={t("common.success")}
            value={formatNumber(current?.completedCount)}
            hint={formatCurrency(current?.completedAmount)}
            icon={CheckCircle}
            changePct={changes?.completedCountPct}
            isLoading={isLoading}
            {...statusCard("COMPLETED")}
          />
          <ReportStatCard
            label={t("admin.payments.stats.pending")}
            value={formatNumber(current?.pendingCount)}
            hint={formatCurrency(current?.pendingAmount)}
            icon={Clock}
            isLoading={isLoading}
            {...statusCard("PENDING")}
          />
          <ReportStatCard
            label={t("common.failed")}
            value={formatNumber(current?.failedCount)}
            hint={formatCurrency(current?.failedAmount)}
            icon={AlertCircle}
            isLoading={isLoading}
            {...statusCard("FAILED")}
          />
          <ReportStatCard
            label={t("admin.payments.stats.successRate")}
            value={formatPercent(current?.successRate)}
            hint={t("admin.payments.stats.successRateHint")}
            icon={Target}
            changePct={changes?.successRatePoints}
            changeLabel={formatPercentPoints(changes?.successRatePoints)}
            isLoading={isLoading}
            onClick={() => onSelect({ status: "COMPLETED" })}
          />
          <ReportStatCard
            label={t("admin.payments.refunds")}
            value={formatCurrency(current?.refundAmount)}
            hint={t("admin.payments.stats.refundCount", {
              total: formatNumber(current?.refundCount),
            })}
            icon={RefreshCcw}
            changePct={changes?.refundAmountPct}
            invertChangeColor
            isLoading={isLoading}
            onClick={() => onShowEntries("REFUNDS", t("admin.payments.refunds"))}
          />
          <ReportStatCard
            label={t("admin.payments.stats.netCollected")}
            value={formatCurrency(current?.netCollectedAmount)}
            hint={t("admin.payments.stats.netCollectedHint")}
            icon={Wallet}
            changePct={changes?.netCollectedAmountPct}
            isLoading={isLoading}
            onClick={() => onShowEntries("NET", t("admin.payments.stats.netCollected"))}
          />
        </div>
      )}

      {current && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StatsBreakdown
            title={t("admin.payments.stats.byStatus")}
            rows={current.byStatus}
            icon={CreditCard}
            formatKey={(key) => paymentStatusMeta(key).label}
            selectedKey={selected?.method ? undefined : selected?.status}
            onSelect={(status) => onSelect({ status })}
          />
          <StatsBreakdown
            title={t("admin.payments.stats.byMethod")}
            rows={current.byMethod}
            icon={PiggyBank}
            formatKey={(key) => paymentMethodMeta(key).label}
            selectedKey={selected?.method}
            onSelect={(method) => onSelect({ method })}
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
  formatKey,
  selectedKey,
  onSelect,
}: {
  title: string;
  rows: { key: string; count: number; amount: number; completedAmount: number }[];
  icon: React.ElementType;
  /** Đổi mã enum backend sang nhãn tiếng Việt. */
  formatKey: (key: string) => string;
  selectedKey?: string;
  onSelect: (key: string) => void;
}) {
  const { t } = useTranslation();
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
          <button
            key={row.key}
            type="button"
            onClick={() => onSelect(row.key)}
            className={`block w-full space-y-1 rounded-md p-1 text-left hover:bg-muted/50 ${
              selectedKey === row.key ? "bg-muted" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground truncate" title={row.key}>
                {formatKey(row.key)}
              </span>
              <span className="text-muted-foreground shrink-0">
                {t("admin.payments.stats.breakdownRow", {
                  total: formatNumber(row.count),
                  amount: formatCurrency(row.amount),
                })}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.round((row.amount / max) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t("admin.payments.stats.breakdownCompleted", {
                amount: formatCurrency(row.completedAmount),
              })}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
