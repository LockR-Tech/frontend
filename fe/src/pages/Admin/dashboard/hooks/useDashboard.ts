import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetDashboardOverviewQuery } from "~/stores/apis/admin/dashboard";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { useGetAllStoresQuery } from "~/stores/apis/admin/stores";
import { useGetAllLockersQuery } from "~/stores/apis/admin/lockers";
import {
  useGetRevenueByMethodQuery,
  useGetRevenueByServiceQuery,
  useGetRevenueByStoreQuery,
  useGetRevenueDailyQuery,
  useGetRevenueSummaryQuery,
} from "~/stores/apis/admin/revenue";
import { useWebSocket } from "@/hooks/useWebSocket";
import { extractList } from "~/lib/extract-list";
import { shiftDay, vietnamToday } from "~/lib/report-format";
import { dashboardRecommendations } from "~/constants/dashboard.constants";
import type { DashboardOverviewResponse, MonthlyDataPoint } from "~/types/admin/dashboard";
import type { AdminLockerResponse } from "~/types";
import { LockerStatus } from "~/types/admin/enums";
import {
  useGetDashboardPeakHoursQuery,
  useGetDashboardUserGrowthQuery,
} from "./dashboardExtraApi";

// Overview của order-service chỉ có số liệu đơn; chỉ số liên service
// (users/stores/lockers/boxes) có thể thiếu → chuẩn hoá để không vỡ trang.
function normalizeOverview(
  raw?: Partial<DashboardOverviewResponse>,
): DashboardOverviewResponse {
  return {
    totalUsers: raw?.totalUsers ?? 0,
    totalStores: raw?.totalStores ?? 0,
    totalLockers: raw?.totalLockers ?? 0,
    totalOrders: raw?.totalOrders ?? 0,
    ordersToday: raw?.ordersToday ?? 0,
    pendingOrders: raw?.pendingOrders ?? 0,
    totalRevenue: raw?.totalRevenue ?? 0,
    revenueToday: raw?.revenueToday ?? 0,
    activeServices: raw?.activeServices ?? 0,
    availableBoxes: raw?.availableBoxes ?? 0,
    occupiedBoxes: raw?.occupiedBoxes ?? 0,
  };
}

/** Năm có thể chọn cho biểu đồ tháng: năm nay và 2 năm trước. */
function yearOptions(currentYear: number): string[] {
  return [0, 1, 2].map((offset) => String(currentYear - offset));
}

export function useDashboard() {
  const navigate = useNavigate();
  const today = useMemo(() => vietnamToday(), []);
  const currentYear = Number(today.slice(0, 4));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const { data, isLoading, refetch: refetchOverview } = useGetDashboardOverviewQuery();

  const { subscribe } = useWebSocket({ autoConnect: true });

  // Bổ sung KPI liên service từ các API danh sách (số thật, không để 0).
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const { data: storesData } = useGetAllStoresQuery({ page: 0, size: 1000 });
  const { data: lockersData, refetch: refetchLockers } = useGetAllLockersQuery({ page: 0, size: 1000 });

  // Doanh thu thực thu (payment COMPLETED) — /api/admin/revenue/summary.
  // Kỳ tháng: mùng 1 → hôm nay (kỳ trước cùng độ dài); kỳ ngày: hôm nay so với hôm qua.
  const monthSummary = useGetRevenueSummaryQuery({});
  const todaySummary = useGetRevenueSummaryQuery({ from: today, to: today });

  // Biểu đồ theo năm đã chọn (≤ 366 ngày nên gọi được cả năm).
  const yearRange = useMemo(
    () => ({ from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31` }),
    [selectedYear],
  );
  const daily = useGetRevenueDailyQuery(yearRange);
  const byMethod = useGetRevenueByMethodQuery(yearRange);
  const byService = useGetRevenueByServiceQuery(yearRange);
  const byStore = useGetRevenueByStoreQuery(yearRange);

  // 30 ngày gần nhất cho khung giờ cao điểm; 12 tháng cho người dùng mới.
  const peakRange = useMemo(() => ({ from: shiftDay(today, -29), to: today }), [today]);
  const peakHours = useGetDashboardPeakHoursQuery(peakRange);
  const userGrowth = useGetDashboardUserGrowthQuery({ months: 12 });

  useEffect(() => {
    if (!subscribe) return;

    const subOrders = subscribe<unknown>("/topic/orders", () => {
      refetchOverview();
      refetchLockers();
    });

    const subNotifications = subscribe<unknown>("/topic/notifications", () => {
      refetchOverview();
      refetchLockers();
    });

    return () => {
      subOrders?.unsubscribe();
      subNotifications?.unsubscribe();
    };
  }, [subscribe, refetchOverview, refetchLockers]);

  const lockers = extractList<AdminLockerResponse>(lockersData?.data);
  const computedAvailableBoxes = lockers.reduce(
    (sum, l) => sum + (l.availableBoxes ?? 0),
    0,
  );
  const computedOccupiedBoxes = lockers.reduce(
    (sum, l) => sum + Math.max(0, (l.totalBoxes ?? 0) - (l.availableBoxes ?? 0)),
    0,
  );
  const activeLockers = lockers.filter((l) => l.status === LockerStatus.ACTIVE).length;

  const base = normalizeOverview(data?.data);
  const overview: DashboardOverviewResponse = {
    ...base,
    totalUsers: base.totalUsers || extractList(usersData?.data).length,
    totalStores: base.totalStores || extractList(storesData?.data).length,
    totalLockers: base.totalLockers || lockers.length,
    availableBoxes: base.availableBoxes || computedAvailableBoxes,
    occupiedBoxes: base.occupiedBoxes || computedOccupiedBoxes,
  };
  // `byStatus` có trong overview nhưng chưa khai báo ở DashboardOverviewResponse.
  const byStatus = (data?.data as { byStatus?: Record<string, number> } | undefined)?.byStatus;

  // Gộp chuỗi ngày thành 12 tháng; năm hiện tại chỉ hiện tới tháng này.
  const chartData: MonthlyDataPoint[] = useMemo(() => {
    const days = daily.data?.data?.days;
    if (!days) return [];
    const lastMonth = Number(selectedYear) === currentYear ? Number(today.slice(5, 7)) : 12;
    const months = Array.from({ length: lastMonth }, (_, i) => ({
      month: `T${i + 1}`,
      orders: 0,
      revenue: 0,
    }));
    for (const d of days) {
      const m = Number(d.date.slice(5, 7));
      if (m >= 1 && m <= lastMonth) {
        months[m - 1].orders += Number(d.orderCount) || 0;
        months[m - 1].revenue += Number(d.revenue) || 0;
      }
    }
    return months;
  }, [daily.data, selectedYear, currentYear, today]);

  const handleRecommendationClick = (id: string) => {
    const target = dashboardRecommendations.find((r) => r.id === id);
    if (target) navigate(target.href);
  };

  return {
    overview,
    byStatus,
    activeLockers,
    lockersLoaded: !!lockersData,
    chartData,
    dailyQuery: daily,
    yearOptions: yearOptions(currentYear),
    yearRange,
    byMethod,
    byService,
    byStore,
    peakHours,
    peakRange,
    userGrowth,
    monthSummary,
    todaySummary,
    recommendations: dashboardRecommendations,
    selectedYear,
    setSelectedYear,
    isLoading,
    handleRecommendationClick,
  };
}
