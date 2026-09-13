import { useMemo } from "react";
import { useGetPartnerDashboardQuery } from "@/stores/apis/partnerApi";

export interface Transaction {
  id: number;
  code: string;
  type: "ORDER_PAYMENT" | "REFUND" | "WITHDRAWAL";
  amount: number;
  status: "COMPLETED" | "PENDING" | "FAILED";
  createdAt: string;
}

export interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  thisMonthRevenue: number;
}

export function useRevenue() {
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useGetPartnerDashboardQuery();

  const stats: RevenueStats = useMemo(() => {
    if (!dashboardData) {
      return { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, thisMonthRevenue: 0 };
    }
    return {
      totalRevenue: dashboardData.partnerRevenue || 0,
      totalOrders: dashboardData.totalOrders || 0,
      avgOrderValue:
        dashboardData.totalOrders > 0
          ? (dashboardData.partnerRevenue || 0) / dashboardData.totalOrders
          : 0,
      thisMonthRevenue: dashboardData.monthRevenue || 0,
    };
  }, [dashboardData]);

  // Mock transactions
  const transactions: Transaction[] = useMemo(() => {
    return [];
  }, []);

  return { stats, transactions, isLoading, error, refetch };
}
