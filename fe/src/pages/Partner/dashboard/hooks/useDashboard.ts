import {
  useGetPartnerDashboardQuery,
  useGetPendingOrdersQuery,
  POLLING_INTERVAL,
} from "@/stores/apis/partnerApi";

export interface DashboardStats {
  // Orders
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  canceledOrders: number;
  processingOrders: number;
  // Revenue
  totalRevenue: number;
  partnerRevenue: number;
  platformFee: number;
  todayRevenue: number | null;
  monthRevenue: number | null;
  // Business
  totalStores: number;
  activeStores: number;
  totalStaff: number;
  businessName: string;
  // Computed
  completionRate: string | number;
  revenueSharePercent: number;
}

export function useDashboard() {
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useGetPartnerDashboardQuery(undefined, {
    pollingInterval: POLLING_INTERVAL,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const { data: pendingOrdersData } = useGetPendingOrdersQuery(
    { page: 0, size: 5 },
    {
      pollingInterval: POLLING_INTERVAL,
      refetchOnFocus: true,
    },
  );

  const pendingOrders = pendingOrdersData?.content || [];

  const stats: DashboardStats = {
    // Orders
    totalOrders: dashboardData?.totalOrders || 0,
    pendingOrders: dashboardData?.pendingOrders || 0,
    completedOrders: dashboardData?.completedOrders || 0,
    canceledOrders: dashboardData?.canceledOrders || 0,
    processingOrders:
      (dashboardData?.totalOrders || 0) -
      (dashboardData?.completedOrders || 0) -
      (dashboardData?.canceledOrders || 0),
    // Revenue
    totalRevenue: dashboardData?.totalRevenue || 0,
    partnerRevenue: dashboardData?.partnerRevenue || 0,
    platformFee: dashboardData?.platformFee || 0,
    todayRevenue: dashboardData?.todayRevenue ?? null,
    monthRevenue: dashboardData?.monthRevenue ?? null,
    // Business
    totalStores: dashboardData?.totalStores || 0,
    activeStores: dashboardData?.activeStores || 0,
    totalStaff: dashboardData?.totalStaff || 0,
    businessName: dashboardData?.businessName || "",
    // Computed
    completionRate:
      dashboardData && dashboardData.totalOrders > 0
        ? (
            (dashboardData.completedOrders / dashboardData.totalOrders) *
            100
          ).toFixed(1)
        : 0,
    revenueSharePercent:
      dashboardData && dashboardData.totalRevenue > 0
        ? Math.round(
            (dashboardData.partnerRevenue / dashboardData.totalRevenue) * 100,
          )
        : 0,
  };

  return {
    stats,
    pendingOrders,
    isLoading,
    error,
    refetch,
    hasData: !!dashboardData,
    rawData: dashboardData,
  };
}
