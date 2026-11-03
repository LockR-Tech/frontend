import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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
import { DashboardOrdersModal, type DashboardOrdersTarget } from "./components/DashboardOrdersModal";
import {
  DashboardLockersModal,
  DashboardUsersModal,
  type DashboardLockersTarget,
  type DashboardUsersTarget,
} from "./components/DashboardListModals";
import type { OverviewTarget } from "./components/OverviewSection";
import {
  RevenueEntriesModal,
  type RevenueEntriesTarget,
} from "../revenue/components/RevenueEntriesModal";
import {
  RevenueOrdersModal,
  type RevenueOrdersTarget,
} from "../revenue/components/RevenueOrdersModal";
import { LockerStatus } from "~/types/admin/enums";
import {
  Package,
  CalendarCheck,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { changeDirection, formatDayLabel, formatPercentChange } from "~/lib/report-format";
import { toReportError } from "~/lib/report-error";

function formatVND(amount: number, t: TFunction): string {
  if (amount >= 1_000_000_000)
    return t("admin.dashboard.format.billionVnd", { value: (amount / 1_000_000_000).toFixed(1) });
  if (amount >= 1_000_000)
    return t("admin.dashboard.format.millionVnd", { value: (amount / 1_000_000).toFixed(2) });
  return `${amount.toLocaleString("vi-VN")} đ`;
}

/** Ngày đầu và cuối của tháng `month` (1–12) năm `year`, dạng yyyy-MM-dd. */
function monthRange(year: string, month: number) {
  const mm = String(month).padStart(2, "0");
  const last = new Date(Date.UTC(Number(year), month, 0)).getUTCDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

/** Trạng thái đã xong — "Đơn chờ xử lý" của overview là mọi trạng thái còn lại. */
const FINISHED_STATUSES = new Set(["COMPLETED", "CANCELED", "CANCELLED"]);

/** Mức thay đổi theo % (null = kỳ trước bằng 0 → không so sánh được). `key` nhận `{{value}}`. */
function deltaOf(pct: number | null | undefined, t: TFunction, key: string) {
  if (pct === undefined) return undefined;
  return {
    text:
      pct === null
        ? t("admin.dashboard.hero.noPreviousData")
        : t(key, { value: formatPercentChange(pct) }),
    direction: changeDirection(pct),
  };
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ordersTarget, setOrdersTarget] = useState<DashboardOrdersTarget | null>(null);
  const [entriesTarget, setEntriesTarget] = useState<RevenueEntriesTarget | null>(null);
  const [revenueOrders, setRevenueOrders] = useState<RevenueOrdersTarget | null>(null);
  const [lockersTarget, setLockersTarget] = useState<DashboardLockersTarget | null>(null);
  const [usersTarget, setUsersTarget] = useState<DashboardUsersTarget | null>(null);
  const {
    overview,
    byStatus,
    activeLockers,
    lockers,
    users,
    lockersLoaded,
    chartData,
    dailyQuery,
    yearOptions,
    byMethod,
    byService,
    byStore,
    peakHours,
    peakRange,
    yearRange,
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

  const openOverview = (what: OverviewTarget) => {
    switch (what) {
      case "users":
        navigate("/admin/users");
        break;
      case "stores":
        navigate("/admin/stores");
        break;
      case "lockers":
        setLockersTarget({ title: t("admin.dashboard.overview.totalKiosks") });
        break;
      case "occupancy":
        setLockersTarget({ title: t("admin.dashboard.overview.occupancyRate") });
        break;
      case "activeLockers":
        setLockersTarget({ title: t("admin.dashboard.overview.activeKiosks"), status: LockerStatus.ACTIVE });
        break;
      case "pending":
        setOrdersTarget({
          title: t("admin.dashboard.overview.pendingOrders"),
          status: Object.keys(byStatus ?? {}).filter((s) => !FINISHED_STATUSES.has(s.toUpperCase())),
        });
        break;
    }
  };

  const heroCards = [
    {
      label: t("admin.dashboard.hero.totalOrders"),
      value: overview.totalOrders.toLocaleString("vi-VN"),
      icon: Package,
      sublabel: month
        ? t("admin.dashboard.hero.ordersThisMonth", {
            value: month.current.orderCount.toLocaleString("vi-VN"),
          })
        : t("admin.dashboard.hero.wholeNetwork"),
      delta: month
        ? deltaOf(month.changes.orderCountPct, t, "admin.dashboard.hero.ordersVsPrevious")
        : undefined,
      onClick: () => setOrdersTarget({ title: t("admin.dashboard.hero.totalOrders") }),
      onSublabelClick: month
        ? () =>
            setOrdersTarget({
              title: t("admin.dashboard.drilldown.ordersThisMonth"),
              from: month.from,
              to: month.to,
            })
        : undefined,
    },
    {
      label: t("admin.dashboard.hero.ordersToday"),
      // Ngày theo giờ Việt Nam từ báo cáo; overview (giờ máy chủ) chỉ là dự phòng.
      value: (day ? day.current.orderCount : overview.ordersToday).toLocaleString("vi-VN"),
      icon: CalendarCheck,
      sublabel: t("admin.dashboard.hero.ordersCreatedToday"),
      delta: day
        ? deltaOf(day.changes.orderCountPct, t, "admin.dashboard.hero.vsYesterday")
        : undefined,
      onClick: day
        ? () => setOrdersTarget({ title: t("admin.dashboard.hero.ordersToday"), from: day.from, to: day.to })
        : undefined,
    },
    {
      label: t("admin.dashboard.monthlyRevenue"),
      value: month
        ? formatVND(month.current.totalRevenue, t)
        : monthSummary.isLoading
          ? pending
          : "—",
      icon: CreditCard,
      sublabel: monthError
        ? monthError.message
        : month
          ? t("admin.dashboard.hero.collectedSince", { date: formatDayLabel(month.from) })
          : undefined,
      delta: month
        ? deltaOf(month.changes.totalRevenuePct, t, "admin.dashboard.hero.vsPrevious")
        : undefined,
      onClick: month
        ? () =>
            setEntriesTarget({
              kind: "PAYMENTS",
              label: t("admin.dashboard.monthlyRevenue"),
              range: { from: month.from, to: month.to },
            })
        : undefined,
    },
    {
      label: t("admin.dashboard.hero.revenueToday"),
      value: day
        ? formatVND(day.current.totalRevenue, t)
        : todaySummary.isLoading
          ? pending
          : "—",
      icon: TrendingUp,
      sublabel: dayError ? dayError.message : t("admin.dashboard.hero.collectedToday"),
      delta: day
        ? deltaOf(day.changes.totalRevenuePct, t, "admin.dashboard.hero.vsYesterday")
        : undefined,
      onClick: day
        ? () =>
            setEntriesTarget({
              kind: "PAYMENTS",
              label: t("admin.dashboard.hero.revenueToday"),
              range: { from: day.from, to: day.to },
            })
        : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("admin.sidebar.dashboard")}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t("admin.dashboard.subtitle")}
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
            onOpenMonth={(m, what) => {
              const range = monthRange(selectedYear, m);
              const period = t("admin.dashboard.drilldown.monthOfYear", { month: m, year: selectedYear });
              if (what === "orders") {
                setOrdersTarget({ title: t("admin.dashboard.drilldown.ordersCreatedIn", { period }), ...range });
              } else {
                setEntriesTarget({
                  kind: "PAYMENTS",
                  label: t("admin.dashboard.drilldown.collectedIn", { period }),
                  range,
                });
              }
            }}
          />
        </div>
        <div className="lg:col-span-1">
          <OverviewSection
            data={overview}
            activeLockers={lockersLoaded ? activeLockers : null}
            onOpen={openOverview}
          />
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
          onMethodClick={(item, label) =>
            setRevenueOrders({ type: "METHOD", method: item.method, label, paidOrderCount: item.paidOrderCount })
          }
        />
        <OrderStatusChart
          byStatus={byStatus}
          onStatusClick={(status, label) => setOrdersTarget({ title: label, status: [status] })}
        />
        <ServiceRevenueChart
          items={byService.data?.data?.items}
          year={selectedYear}
          isLoading={byService.isFetching}
          error={byService.error}
          onRetry={byService.refetch}
          onServiceClick={(item, label) =>
            setRevenueOrders({
              type: "SERVICE",
              serviceType: item.serviceType,
              label,
              paidOrderCount: item.paidOrderCount,
            })
          }
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
          onHourClick={(hour) =>
            setOrdersTarget({
              title: t("admin.dashboard.drilldown.ordersAtHour", { hour: String(hour).padStart(2, "0") }),
              from: peakRange.from,
              to: peakRange.to,
              hour,
            })
          }
        />
        <UserGrowthChart
          points={userGrowth.data?.data}
          isLoading={userGrowth.isLoading}
          error={userGrowth.error}
          onRetry={userGrowth.refetch}
          onMonthClick={(m, label) =>
            setUsersTarget({ title: t("admin.dashboard.drilldown.newUsersIn", { period: label }), month: m })
          }
        />
      </div>

      {/* Row 4: Top Performing Locations */}
      <TopLocationsTable
        items={byStore.data?.data?.items}
        year={selectedYear}
        isLoading={byStore.isFetching}
        error={byStore.error}
        onRetry={byStore.refetch}
        onStoreClick={(item, name) =>
          setRevenueOrders({ type: "STORE", storeId: item.storeId, label: name, paidOrderCount: item.paidOrderCount })
        }
      />

      {/* Row 5: Shortcuts to admin pages */}
      <RecommendationsSection
        recommendations={recommendations}
        onRecommendationClick={handleRecommendationClick}
      />

      <DashboardOrdersModal target={ordersTarget} onClose={() => setOrdersTarget(null)} />
      <RevenueEntriesModal target={entriesTarget} onClose={() => setEntriesTarget(null)} />
      <RevenueOrdersModal target={revenueOrders} range={yearRange} onClose={() => setRevenueOrders(null)} />
      <DashboardLockersModal target={lockersTarget} lockers={lockers} onClose={() => setLockersTarget(null)} />
      <DashboardUsersModal target={usersTarget} users={users} onClose={() => setUsersTarget(null)} />
    </div>
  );
}
