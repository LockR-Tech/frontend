import { CreditCard, CheckCircle, Clock, AlertCircle, RefreshCcw, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
      delta: "+5 hôm nay (+20.8%)",
      icon: CreditCard,
    },
    {
      label: "Thành công",
      value: statistics.completed,
      delta: "+4 đơn (+17.4%)",
      icon: CheckCircle,
    },
    {
      label: "Chờ xử lý",
      value: statistics.pending,
      delta: "-1 đơn (giảm đọng)",
      icon: Clock,
    },
    {
      label: "Thất bại",
      value: statistics.failed,
      delta: "+1 đơn (cần soát)",
      isNegative: true,
      icon: AlertCircle,
    },
    {
      label: "Hoàn tiền",
      value: statistics.refunded,
      delta: "0đ phát sinh",
      icon: RefreshCcw,
    },
    {
      label: "Tổng doanh thu",
      value: formatCurrency(statistics.totalAmount),
      delta: "+450.000 đ (+15.3%)",
      icon: DollarSign,
      isCurrency: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="card-hover border border-border bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border/50">
                  <Icon size={16} className="text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-bold tracking-tight text-foreground truncate leading-tight ${stat.isCurrency ? 'text-xs' : 'text-base'}`}>
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{stat.label}</p>
                  {stat.delta && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-semibold mt-1 truncate ${
                      stat.isNegative ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {stat.isNegative ? (
                        <ArrowDownRight className="w-2.5 h-2.5 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
                      )}
                      <span>{stat.delta}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
