import { Skeleton } from "~/components/ui/skeleton";
import { useDashboard } from "./hooks/useDashboard";
import {
  OverviewCard,
  OverviewSection,
  MainChart,
  RecommendationsSection,
} from "./components";
import {
  ShoppingBag,
  CalendarCheck,
  DollarSign,
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-87.5" />
          <Skeleton className="h-87.5" />
        </div>
      </div>
    );
  }

  const heroCards = [
    {
      label: "Tổng đơn hàng",
      value: overview.totalOrders.toLocaleString("vi-VN"),
      icon: ShoppingBag,
      color: "blue" as const,
    },
    {
      label: "Đơn hôm nay",
      value: overview.ordersToday.toString(),
      sublabel: "Hôm nay",
      icon: CalendarCheck,
      color: "indigo" as const,
    },
    {
      label: "Tổng doanh thu",
      value: formatVND(overview.totalRevenue),
      icon: DollarSign,
      color: "emerald" as const,
    },
    {
      label: "Doanh thu hôm nay",
      value: formatVND(overview.revenueToday),
      sublabel: "Hôm nay",
      icon: TrendingUp,
      color: "green" as const,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-muted/30 space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tổng quan hoạt động hệ thống Laundry Locker
        </p>
      </div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {heroCards.map((card) => (
          <OverviewCard key={card.label} {...card} />
        ))}
      </div>

      {/* Chart + Side Stats */}
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

      {/* Recommendations */}
      <RecommendationsSection
        recommendations={recommendations}
        onRecommendationClick={handleRecommendationClick}
      />
    </div>
  );
}
