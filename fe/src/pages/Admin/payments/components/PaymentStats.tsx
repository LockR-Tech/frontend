import { CreditCard, CheckCircle, Clock, AlertCircle, RefreshCcw, DollarSign } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";

interface PaymentStatsProps {
  statistics: {
    total: number;
    completed: number;
    pending: number;
    processing: number;
    failed: number;
    refunded: number;
    totalAmount: number;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

export function PaymentStats({ statistics }: PaymentStatsProps) {
  const stats = [
    {
      label: "Tổng giao dịch",
      value: statistics.total,
      icon: CreditCard,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Thành công",
      value: statistics.completed,
      icon: CheckCircle,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Chờ xử lý",
      value: statistics.pending,
      icon: Clock,
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Thất bại",
      value: statistics.failed,
      icon: AlertCircle,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Hoàn tiền",
      value: statistics.refunded,
      icon: RefreshCcw,
      color: "bg-muted/300",
      textColor: "text-muted-foreground",
      bgColor: "bg-muted/30",
    },
    {
      label: "Tổng doanh thu",
      value: formatCurrency(statistics.totalAmount),
      icon: DollarSign,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
      isCurrency: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon size={20} className={stat.textColor} />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold text-foreground truncate ${stat.isCurrency ? 'text-sm' : ''}`}>
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground truncate">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
