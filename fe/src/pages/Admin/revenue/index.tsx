import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Undo2,
  Wallet,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  DateRangeFilter,
  ReportErrorState,
  ReportStatCard,
} from "~/components/shared/reporting";
import {
  useGetRevenueDailyQuery,
  useGetRevenueSummaryQuery,
} from "~/stores/apis/admin/revenue";
import { formatCurrency, formatDayLabel, formatNumber } from "~/lib/report-format";
import { useRevenueRange } from "./hooks/useRevenueRange";
import { RevenueDailyChart } from "./components/RevenueDailyChart";
import { ServiceRevenueTab } from "./components/ServiceRevenueTab";
import { MethodRevenueTab } from "./components/MethodRevenueTab";
import { LockerRevenueTab } from "./components/LockerRevenueTab";
import { StoreRevenueTab } from "./components/StoreRevenueTab";
import { CustomerRevenueTab } from "./components/CustomerRevenueTab";

export default function RevenuePage() {
  const { t } = useTranslation();
  const { range, setRange, valid, skip } = useRevenueRange();

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetRevenueSummaryQuery(range, { skip });

  const {
    data: dailyData,
    isLoading: isDailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useGetRevenueDailyQuery(range, { skip });

  const summary = summaryData?.data;
  const current = summary?.current;
  const changes = summary?.changes;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("admin.revenue.title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t("admin.revenue.description")}
          </p>
        </div>
        <Link to="/admin/payments">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            {t("admin.revenue.reconcile")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <DateRangeFilter value={range} onChange={setRange} />
        {summary && (
          <p className="text-[11px] text-muted-foreground shrink-0">
            {t("admin.payments.stats.compareWith", {
              from: formatDayLabel(summary.previousFrom),
              to: formatDayLabel(summary.previousTo),
            })}
          </p>
        )}
      </div>

      {summaryError ? (
        <ReportErrorState
          error={summaryError}
          onRetry={refetchSummary}
          title={t("admin.revenue.summary.loadFailed")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <ReportStatCard
            label={t("admin.revenue.summary.periodRevenue")}
            value={formatCurrency(current?.totalRevenue)}
            hint={`${formatDayLabel(range.from)} – ${formatDayLabel(range.to)}`}
            icon={TrendingUp}
            changePct={changes?.totalRevenuePct}
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label={t("admin.revenue.netAfterRefund")}
            value={formatCurrency(current?.netRevenue)}
            hint={t("admin.revenue.refundedHint", {
              amount: formatCurrency(current?.refundAmount),
            })}
            icon={Wallet}
            changePct={changes?.netRevenuePct}
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label={t("admin.revenue.summary.refundAmount")}
            value={formatCurrency(current?.refundAmount)}
            hint={t("admin.revenue.summary.refundHint")}
            icon={Undo2}
            changePct={changes?.refundAmountPct}
            invertChangeColor
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label={t("admin.revenue.summary.aov")}
            value={formatCurrency(current?.averageOrderValue)}
            hint={t("admin.revenue.summary.aovHint")}
            icon={ShoppingBag}
            changePct={changes?.averageOrderValuePct}
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label={t("admin.revenue.columns.newOrders")}
            value={formatNumber(current?.orderCount)}
            hint={t("admin.revenue.summary.ordersHint", {
              completed: formatNumber(current?.completedOrderCount),
              canceled: formatNumber(current?.canceledOrderCount),
            })}
            icon={Receipt}
            changePct={changes?.orderCountPct}
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label={t("admin.revenue.columns.paidOrders")}
            value={formatNumber(current?.paidOrderCount)}
            hint={t("admin.revenue.summary.paymentCount", {
              total: formatNumber(current?.paymentCount),
            })}
            icon={CreditCard}
            changePct={changes?.paidOrderCountPct}
            isLoading={isSummaryLoading}
          />
        </div>
      )}

      {/* Mốc nhanh, không phụ thuộc khoảng đang chọn. */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { labelKey: "common.today", period: summary.today },
            { labelKey: "admin.revenue.quick.thisWeek", period: summary.thisWeek },
            { labelKey: "admin.revenue.quick.thisMonth", period: summary.thisMonth },
          ].map(({ labelKey, period }) => (
            <div
              key={labelKey}
              className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{t(labelKey)}</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(period.totalRevenue)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("admin.revenue.quick.paidOrders", {
                    total: formatNumber(period.paidOrderCount),
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <RevenueDailyChart
        data={dailyData?.data}
        isLoading={isDailyLoading}
        error={dailyError}
        onRetry={refetchDaily}
      />

      <Card className="border border-border/80 bg-card shadow-xs">
        <CardContent className="p-6">
          <Tabs defaultValue="service">
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="service" className="text-xs px-4">
                {t("admin.revenue.tabs.service")}
              </TabsTrigger>
              <TabsTrigger value="method" className="text-xs px-4">
                {t("admin.revenue.tabs.method")}
              </TabsTrigger>
              <TabsTrigger value="locker" className="text-xs px-4">
                {t("admin.revenue.tabs.locker")}
              </TabsTrigger>
              <TabsTrigger value="store" className="text-xs px-4">
                {t("admin.revenue.tabs.store")}
              </TabsTrigger>
              <TabsTrigger value="customer" className="text-xs px-4">
                {t("admin.revenue.tabs.customer")}
              </TabsTrigger>
            </TabsList>

            {/* Mọi tab dùng chung một khoảng ngày để các con số cộng khớp nhau. */}
            <TabsContent value="service" className="mt-0">
              <ServiceRevenueTab range={range} skip={skip} />
            </TabsContent>
            <TabsContent value="method" className="mt-0">
              <MethodRevenueTab range={range} skip={skip} />
            </TabsContent>
            <TabsContent value="locker" className="mt-0">
              <LockerRevenueTab range={range} skip={skip} />
            </TabsContent>
            <TabsContent value="store" className="mt-0">
              <StoreRevenueTab range={range} skip={skip} />
            </TabsContent>
            <TabsContent value="customer" className="mt-0">
              <CustomerRevenueTab range={range} skip={skip} />
            </TabsContent>
          </Tabs>

          {!valid && (
            <p className="text-xs text-destructive mt-4">
              {t("admin.revenue.invalidRange")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
