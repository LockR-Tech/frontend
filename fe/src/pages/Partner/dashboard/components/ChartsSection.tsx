import { DollarSign, TrendingUp, Landmark, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui";
import type { DashboardStats } from "../hooks/useDashboard";

interface ChartsSectionProps {
  stats: DashboardStats;
}

function fmt(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(v);
}

export function ChartsSection({ stats }: ChartsSectionProps) {
  const partnerPct =
    stats.totalRevenue > 0
      ? Math.round((stats.partnerRevenue / stats.totalRevenue) * 100)
      : 0;
  const feePct = 100 - partnerPct;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
      {/* Revenue Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" /> Phân chia doanh thu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total GTV */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Tổng doanh thu (GTV)
              </span>
            </div>
            <span className="text-sm font-bold text-foreground">
              {fmt(stats.totalRevenue)}
            </span>
          </div>

          {/* Partner share */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">
                  Doanh thu của bạn ({partnerPct}%)
                </span>
              </div>
              <span className="text-sm font-bold text-green-600">
                {fmt(stats.partnerRevenue)}
              </span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${partnerPct}%` }}
              />
            </div>
          </div>

          {/* Platform fee */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <span className="text-sm text-muted-foreground">
                  Phí nền tảng ({feePct}%)
                </span>
              </div>
              <span className="text-sm font-bold text-blue-600">
                {fmt(stats.platformFee)}
              </span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2">
              <div
                className="bg-blue-400 h-2 rounded-full"
                style={{ width: `${feePct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Revenue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Doanh thu theo kỳ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <Landmark className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">Hôm nay</p>
              <p className="text-lg font-bold text-blue-600">
                {stats.todayRevenue != null ? fmt(stats.todayRevenue) : "—"}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">Tháng này</p>
              <p className="text-lg font-bold text-green-600">
                {stats.monthRevenue != null ? fmt(stats.monthRevenue) : "—"}
              </p>
            </div>
          </div>
          <div className="bg-muted/30 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Doanh thu trung bình / đơn
            </span>
            <span className="text-sm font-bold text-foreground/80">
              {stats.totalOrders > 0
                ? fmt(Math.round(stats.partnerRevenue / stats.totalOrders))
                : "—"}
            </span>
          </div>
          <div className="bg-muted/30 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tổng đơn hoàn thành</span>
            <span className="text-sm font-bold text-foreground/80">
              {stats.completedOrders}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
