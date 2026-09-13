import { Card, CardContent } from "~/components/ui";
import { DollarSign, ShoppingCart, TrendingUp, Calendar } from "lucide-react";

interface RevenueStatsProps {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  thisMonthRevenue: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

export function RevenueStats({
  totalRevenue,
  totalOrders,
  avgOrderValue,
  thisMonthRevenue,
}: RevenueStatsProps) {
  const items = [
    {
      label: "Tổng doanh thu",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Tháng này",
      value: formatCurrency(thisMonthRevenue),
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Tổng đơn hàng",
      value: totalOrders.toString(),
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      label: "Giá trị TB/đơn",
      value: formatCurrency(avgOrderValue),
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-3 ${item.bgColor} rounded-lg`}>
              <item.icon className={item.color} size={24} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="text-xl font-bold">{item.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
