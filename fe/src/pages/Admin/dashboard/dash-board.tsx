import { Skeleton } from "~/components/ui/skeleton";
import { useDashboard } from "./hooks/useDashboard";
import {
  OverviewCard,
  OverviewSection,
  MainChart,
  PaymentMethodChart,
  OrderStatusChart,
  ServiceRevenueChart,
  PeakHoursChart,
  TopLocationsTable,
  UserGrowthChart,
  RecommendationsSection,
} from "./components";
import {
  Package,
  CalendarCheck,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { changeDirection, formatDayLabel, formatPercentChange } from "~/lib/report-format";
import { toReportError } from "~/lib/report-error";

function formatVND(amount: number): string {
  if (amount >= 1_000_000_000)
    return `${(amount / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)} tr đ`;
  return `${amount.toLocaleString("vi-VN")} đ`;
}

/** Mức thay đổi theo % (null = kỳ trước bằng 0 → không so sánh được). */
function deltaOf(pct: number | null | undefined, suffix: string) {
  if (pct === undefined) return undefined;
  return {
    text: pct === null ? `Kỳ trước chưa có số liệu` : `${formatPercentChange(pct)} ${suffix}`,
    direction: changeDirection(pct),
  };
}

export default function Dashboard() {
  const {
    overview,
    byStatus,
    activeLockers,
    lockersLoaded,
    chartData,
    dailyQuery,
    yearOptions,
    byMethod,
    byService,
    byStore,
    peakHours,
    peakRange,
    userGrowth,
    monthSummary,
    todaySummary,
    recommendations,
    selectedYear,
    setSelectedYear,
    isLoading,
    handleRecommendationClick,
  } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  // Doanh thu = tiền thực thu (payment COMPLETED) từ /api/admin/revenue/summary.
  // Lỗi (vd 503 PAYMENT_DATA_UNAVAILABLE) → hiện "—" kèm lý do, không hiện 0.
  const month = monthSummary.data?.data;
  const day = todaySummary.data?.data;
  const monthError = toReportError(monthSummary.error);
  const dayError = toReportError(todaySummary.error);
  const pending = "…";

  const heroCards = [
    {
      label: "Tổng đơn gửi & thuê",
      value: overview.totalOrders.toLocaleString("vi-VN"),
      icon: Package,
      sublabel: month
        ? `Tháng này: ${month.current.orderCount.toLocaleString("vi-VN")} đơn`
        : "Toàn bộ mạng lưới Kiosk",
      delta: month ? deltaOf(month.changes.orderCountPct, "đơn so với kỳ trước") : undefined,
    },
    {
      label: "Đơn hôm nay",
      // Ngày theo giờ Việt Nam từ báo cáo; overview (giờ máy chủ) chỉ là dự phòng.
      value: (day ? day.current.orderCount : overview.ordersToday).toLocaleString("vi-VN"),
      icon: CalendarCheck,
      sublabel: "Đơn tạo trong ngày",
      delta: day ? deltaOf(day.changes.orderCountPct, "so với hôm qua") : undefined,
    },
    {
      label: "Doanh thu tháng này",
      value: month
        ? formatVND(month.current.totalRevenue)
        : monthSummary.isLoading
          ? pending
          : "—",
      icon: CreditCard,
      sublabel: monthError
        ? monthError.message
        : month
          ? `Tiền thực thu từ ${formatDayLabel(month.from)}`
          : undefined,
      delta: month ? deltaOf(month.changes.totalRevenuePct, "so với kỳ trước") : undefined,
    },
    {
      label: "Doanh thu hôm nay",
      value: day ? formatVND(day.current.totalRevenue) : todaySummary.isLoading ? pending : "—",
      icon: TrendingUp,
      sublabel: dayError ? dayError.message : "Tiền thực thu hôm nay",
      delta: day ? deltaOf(day.changes.totalRevenuePct, "so với hôm qua") : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tổng quan thời gian thực về đơn gửi hàng, thuê ô, doanh thu và vận hành mạng lưới Kiosk
          </p>
        </div>
      </div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {heroCards.map((card) => (
          <OverviewCard key={card.label} {...card} />
        ))}
      </div>

      {/* Row 1: Main Trend + Infrastructure Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MainChart
            data={chartData}
            selectedYear={selectedYear}
            yearOptions={yearOptions}
            onYearChange={setSelectedYear}
            isLoading={dailyQuery.isFetching}
            error={dailyQuery.error}
            onRetry={dailyQuery.refetch}
          />
        </div>
        <div className="lg:col-span-1">
          <OverviewSection data={overview} activeLockers={lockersLoaded ? activeLockers : null} />
        </div>
      </div>

      {/* Row 2: 3 Specialized Distribution Donut / Bar Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PaymentMethodChart
          items={byMethod.data?.data?.items}
          year={selectedYear}
          isLoading={byMethod.isFetching}
          error={byMethod.error}
          onRetry={byMethod.refetch}
        />
        <OrderStatusChart byStatus={byStatus} />
        <ServiceRevenueChart
          items={byService.data?.data?.items}
          year={selectedYear}
          isLoading={byService.isFetching}
          error={byService.error}
          onRetry={byService.refetch}
        />
      </div>

      {/* Row 3: Peak Hours + User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeakHoursChart
          points={peakHours.data?.data}
          range={peakRange}
          isLoading={peakHours.isLoading}
          error={peakHours.error}
          onRetry={peakHours.refetch}
        />
        <UserGrowthChart
          points={userGrowth.data?.data}
          isLoading={userGrowth.isLoading}
          error={userGrowth.error}
          onRetry={userGrowth.refetch}
        />
      </div>

      {/* Row 4: Top Performing Locations */}
      <TopLocationsTable
        items={byStore.data?.data?.items}
        year={selectedYear}
        isLoading={byStore.isFetching}
        error={byStore.error}
        onRetry={byStore.refetch}
      />

      {/* Row 5: Shortcuts to admin pages */}
      <RecommendationsSection
        recommendations={recommendations}
        onRecommendationClick={handleRecommendationClick}
      />
    </div>
  );
}
