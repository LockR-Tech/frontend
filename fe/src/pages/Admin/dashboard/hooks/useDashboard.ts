import { useState } from "react";
import { toast } from "sonner";
import { useGetDashboardOverviewQuery } from "~/stores/apis/admin/dashboard";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { useGetAllStoresQuery } from "~/stores/apis/admin/stores";
import { useGetAllLockersQuery } from "~/stores/apis/admin/lockers";
import { extractList } from "~/lib/extract-list";
import {
  monthlyChartData,
  dashboardRecommendations,
} from "~/constants/dashboard.constants";
import type { DashboardOverviewResponse } from "~/types/admin/dashboard";
import type { AdminLockerResponse } from "~/types";

// The backend overview endpoint (order-service) only owns a subset of these
// metrics; cross-service fields (users/stores/lockers/boxes/services) may be
// absent. Normalize to a complete object so the dashboard never crashes on a
// missing field (e.g. `overview.ordersToday.toString()`).
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

export function useDashboard() {
  const [selectedYear, setSelectedYear] = useState("2025");

  const { data, isLoading } = useGetDashboardOverviewQuery();

  // The order-service overview only owns order/revenue metrics. Fill the
  // cross-service KPIs (users/stores/lockers/boxes) from the list endpoints so
  // the dashboard shows real numbers instead of zeros.
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const { data: storesData } = useGetAllStoresQuery({ page: 0, size: 1000 });
  const { data: lockersData } = useGetAllLockersQuery({ page: 0, size: 1000 });

  const lockers = extractList<AdminLockerResponse>(lockersData?.data);
  const computedAvailableBoxes = lockers.reduce(
    (sum, l) => sum + (l.availableBoxes ?? 0),
    0,
  );
  const computedOccupiedBoxes = lockers.reduce(
    (sum, l) => sum + Math.max(0, (l.totalBoxes ?? 0) - (l.availableBoxes ?? 0)),
    0,
  );

  const base = normalizeOverview(data?.data);
  const overview: DashboardOverviewResponse = {
    ...base,
    totalUsers: base.totalUsers || extractList(usersData?.data).length,
    totalStores: base.totalStores || extractList(storesData?.data).length,
    totalLockers: base.totalLockers || lockers.length,
    availableBoxes: base.availableBoxes || computedAvailableBoxes,
    occupiedBoxes: base.occupiedBoxes || computedOccupiedBoxes,
  };

  const handleRecommendationClick = (id: string) => {
    toast.info(`Mở ${id}`, {
      description: `Đang chuyển đến ${id}...`,
    });
  };

  return {
    overview,
    chartData: monthlyChartData,
    recommendations: dashboardRecommendations,
    selectedYear,
    setSelectedYear,
    isLoading,
    handleRecommendationClick,
  };
}
