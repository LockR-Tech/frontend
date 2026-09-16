import { Link } from "react-router-dom";
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
            Quản lý doanh thu
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Doanh thu tính theo tiền thực thu của đơn thật; tiền nạp ví không được tính
            là doanh thu.
          </p>
        </div>
        <Link to="/admin/payments">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Đối soát giao dịch
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <DateRangeFilter value={range} onChange={setRange} />
        {summary && (
          <p className="text-[11px] text-muted-foreground shrink-0">
            So sánh với {formatDayLabel(summary.previousFrom)} –{" "}
            {formatDayLabel(summary.previousTo)}
          </p>
        )}
      </div>

      {summaryError ? (
        <ReportErrorState
          error={summaryError}
          onRetry={refetchSummary}
          title="Không tải được tổng quan doanh thu"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <ReportStatCard
            label="Doanh thu trong kỳ"
            value={formatCurrency(current?.totalRevenue)}
            hint={`${formatDayLabel(range.from)} – ${formatDayLabel(range.to)}`}
            icon={TrendingUp}
            changePct={changes?.totalRevenuePct}
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label="Thực thu sau hoàn"
            value={formatCurrency(current?.netRevenue)}
            hint={`Đã hoàn ${formatCurrency(current?.refundAmount)}`}
            icon={Wallet}
            changePct={changes?.netRevenuePct}
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label="Tiền hoàn"
            value={formatCurrency(current?.refundAmount)}
            hint="Phiếu hoàn đã xử lý xong trong kỳ"
            icon={Undo2}
            changePct={changes?.refundAmountPct}
            invertChangeColor
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label="Giá trị đơn trung bình"
            value={formatCurrency(current?.averageOrderValue)}
            hint="Doanh thu chia số đơn có thu tiền"
            icon={ShoppingBag}
            changePct={changes?.averageOrderValuePct}
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label="Đơn tạo mới"
            value={formatNumber(current?.orderCount)}
            hint={`Hoàn thành ${formatNumber(current?.completedOrderCount)} · huỷ ${formatNumber(current?.canceledOrderCount)}`}
            icon={Receipt}
            changePct={changes?.orderCountPct}
            isLoading={isSummaryLoading}
          />
          <ReportStatCard
            label="Đơn có thu tiền"
            value={formatNumber(current?.paidOrderCount)}
            hint={`${formatNumber(current?.paymentCount)} lượt thanh toán`}
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
            { label: "Hôm nay", period: summary.today },
            { label: "Tuần này", period: summary.thisWeek },
            { label: "Tháng này", period: summary.thisMonth },
          ].map(({ label, period }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(period.totalRevenue)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatNumber(period.paidOrderCount)} đơn thu tiền
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
                Theo dịch vụ
              </TabsTrigger>
              <TabsTrigger value="method" className="text-xs px-4">
                Theo phương thức
              </TabsTrigger>
              <TabsTrigger value="locker" className="text-xs px-4">
                Theo tủ
              </TabsTrigger>
              <TabsTrigger value="store" className="text-xs px-4">
                Theo cửa hàng
              </TabsTrigger>
              <TabsTrigger value="customer" className="text-xs px-4">
                Theo khách hàng
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
              Khoảng ngày chưa hợp lệ nên chưa tải được số liệu.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
