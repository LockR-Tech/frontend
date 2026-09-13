import type { MonthlyDataPoint } from "~/types/admin/dashboard";
import type { Recommendation } from "~/types/dashboard.types";

export const monthlyChartData: MonthlyDataPoint[] = [
  { month: "T1", orders: 234, revenue: 125000000 },
  { month: "T2", orders: 312, revenue: 182000000 },
  { month: "T3", orders: 289, revenue: 160000000 },
  { month: "T4", orders: 421, revenue: 243000000 },
  { month: "T5", orders: 398, revenue: 228000000 },
  { month: "T6", orders: 512, revenue: 298000000 },
  { month: "T7", orders: 478, revenue: 271000000 },
  { month: "T8", orders: 634, revenue: 367000000 },
  { month: "T9", orders: 589, revenue: 341000000 },
  { month: "T10", orders: 712, revenue: 415000000 },
  { month: "T11", orders: 698, revenue: 401000000 },
  { month: "T12", orders: 845, revenue: 492000000 },
];

export const dashboardRecommendations: Recommendation[] = [
  {
    id: "manage-tenant",
    title: "Quản lý đối tác",
    description: "Xem và quản lý các đối tác trong hệ thống",
  },
  {
    id: "view-analysis",
    title: "Phân tích",
    description: "Xem báo cáo phân tích chi tiết về hệ thống",
  },
  {
    id: "loyalty",
    title: "Khách hàng thân thiết",
    description: "Quản lý chương trình khách hàng thân thiết",
  },
  {
    id: "campaign",
    title: "Chiến dịch",
    description: "Tạo và quản lý các chiến dịch marketing",
  },
];
