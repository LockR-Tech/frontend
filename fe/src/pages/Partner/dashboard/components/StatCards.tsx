import { Package, DollarSign, Boxes, Clock } from "lucide-react";
import { Card } from "~/components/ui";
import type { DashboardStats } from "../hooks/useDashboard";

interface StatCardsProps {
  stats: DashboardStats;
}

function fmt(v: number | null) {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("vi-VN");
}

export function StatCards({ stats }: StatCardsProps) {
  const cards = [
    {
      icon: Package,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      label: "Tổng đơn hàng",
      value: stats.totalOrders.toString(),
      sub: `${stats.completedOrders} hoàn thành · ${stats.canceledOrders} huỷ`,
      border: "border-blue-200",
      gradient: "from-blue-50 to-white",
    },
    {
      icon: Clock,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      label: "Đơn đang xử lý",
      value: stats.pendingOrders.toString(),
      sub: `${stats.processingOrders} đang giặt`,
      border: "border-orange-200",
      gradient: "from-orange-50 to-white",
    },
    {
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      label: "Doanh thu của bạn",
      value: fmt(stats.partnerRevenue),
      sub: `Tổng GTV: ${fmt(stats.totalRevenue)}`,
      border: "border-green-200",
      gradient: "from-green-50 to-white",
    },
    {
      icon: Boxes,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      label: "Cửa hàng",
      value: `${stats.activeStores}/${stats.totalStores}`,
      sub: `${stats.totalStaff} nhân viên`,
      border: "border-purple-200",
      gradient: "from-purple-50 to-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.label}
            className={`bg-gradient-to-br ${c.gradient} border ${c.border} rounded-2xl p-5`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${c.iconBg}`}>
                <Icon className={c.iconColor} size={20} />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {c.label}
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
          </Card>
        );
      })}
    </div>
  );
}
