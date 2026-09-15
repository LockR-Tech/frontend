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

function formatVND(amount: number): string {
  if (amount >= 1_000_000_000)
    return `${(amount / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)} tr đ`;
  return `${amount.toLocaleString("vi-VN")} đ`;
}

export default function Dashboard() {
  const {
    overview,
    chartData,
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

  const heroCards = [
    {
      label: "Tổng đơn gửi & thuê",
      value: overview.totalOrders.toLocaleString("vi-VN"),
      icon: Package,
      sublabel: "Toàn bộ mạng lưới Kiosk",
      deltaAmount: "+148 đơn (+13.4%)",
    },
    {
      label: "Đơn hôm nay",
      value: overview.ordersToday.toString(),
      sublabel: "Phát sinh trong ngày",
      deltaAmount: "+6 đơn (+16.7%)",
      icon: CalendarCheck,
    },
    {
      label: "Tổng doanh thu",
      value: formatVND(overview.totalRevenue),
      icon: CreditCard,
      sublabel: "Tích lũy hệ thống",
      deltaAmount: "+115.000 đ (+14.2%)",
    },
    {
      label: "Doanh thu hôm nay",
      value: formatVND(overview.revenueToday),
      sublabel: "Ghi nhận hôm nay",
      deltaAmount: "+45.000 đ (+6.5%)",
      icon: TrendingUp,
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
            onYearChange={setSelectedYear}
          />
        </div>
        <div className="lg:col-span-1">
          <OverviewSection data={overview} />
        </div>
      </div>

      {/* Row 2: 3 Specialized Distribution Donut / Bar Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PaymentMethodChart />
        <OrderStatusChart
          completed={Math.round(overview.totalOrders * 0.72) || 450}
          inProgress={Math.round(overview.totalOrders * 0.15) || 85}
          ready={Math.round(overview.totalOrders * 0.08) || 42}
          canceled={Math.round(overview.totalOrders * 0.05) || 23}
        />
        <ServiceRevenueChart />
      </div>

      {/* Row 3: Peak Hours + User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeakHoursChart />
        <UserGrowthChart />
      </div>

      {/* Row 4: Top Performing Locations & Kiosks Table */}
      <TopLocationsTable />

      {/* Row 5: Operational Recommendations */}
      <RecommendationsSection
        recommendations={recommendations}
        onRecommendationClick={handleRecommendationClick}
      />
    </div>
  );
}

