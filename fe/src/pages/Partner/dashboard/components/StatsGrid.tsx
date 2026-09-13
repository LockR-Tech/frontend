import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "~/components/ui";
import type { DashboardStats } from "../hooks/useDashboard";

interface StatsGridProps {
  stats: DashboardStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const navigate = useNavigate();

  const completedPct =
    stats.totalOrders > 0
      ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
      : 0;
  const pendingPct =
    stats.totalOrders > 0
      ? Math.round((stats.pendingOrders / stats.totalOrders) * 100)
      : 0;
  const canceledPct =
    stats.totalOrders > 0
      ? Math.round((stats.canceledOrders / stats.totalOrders) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
      {/* Order Breakdown */}
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Phân bổ đơn hàng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Hoàn thành</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {stats.completedOrders}
              </span>
              <span className="text-xs text-muted-foreground/70 w-8 text-right">
                {completedPct}%
              </span>
            </div>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full"
              style={{ width: `${completedPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Đang xử lý</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {stats.pendingOrders}
              </span>
              <span className="text-xs text-muted-foreground/70 w-8 text-right">
                {pendingPct}%
              </span>
            </div>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1.5">
            <div
              className="bg-orange-500 h-1.5 rounded-full"
              style={{ width: `${pendingPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-muted-foreground">Đã hủy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {stats.canceledOrders}
              </span>
              <span className="text-xs text-muted-foreground/70 w-8 text-right">
                {canceledPct}%
              </span>
            </div>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1.5">
            <div
              className="bg-red-400 h-1.5 rounded-full"
              style={{ width: `${canceledPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Completion Rate */}
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Tỷ lệ hoàn thành
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-5xl font-bold text-green-600">
              {stats.completionRate}
            </span>
            <span className="text-2xl text-green-500 mb-1">%</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-2 mb-3">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.completedOrders} / {stats.totalOrders} đơn hoàn thành
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Hành động nhanh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            size="sm"
            className="w-full justify-between"
            variant="outline"
            onClick={() => navigate("/partner/orders?status=WAITING")}
          >
            <span>Đơn chờ chấp nhận</span>
            <div className="flex items-center gap-1">
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {stats.pendingOrders}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Button>
          <Button
            size="sm"
            className="w-full justify-between"
            variant="outline"
            onClick={() => navigate("/partner/orders?status=READY")}
          >
            <span>Đơn sẵn sàng trả</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="w-full justify-between"
            variant="outline"
            onClick={() => navigate("/partner/stores")}
          >
            <span>Quản lý cửa hàng</span>
            <div className="flex items-center gap-1">
              <span className="bg-purple-100 text-purple-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {stats.activeStores}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
