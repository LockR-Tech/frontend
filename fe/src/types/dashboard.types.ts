export interface OverviewStat {
  count: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

export interface DashboardOverview {
  users: OverviewStat;
  partners: OverviewStat;
  stores: OverviewStat;
  revenue: OverviewStat;
  orders: OverviewStat;
  bookings: OverviewStat;
  lockers: OverviewStat;
  conversionRate: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  orders: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
}
