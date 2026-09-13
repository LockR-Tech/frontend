import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Users,
  Store,
  Lock,
  Wrench,
  Package,
  BoxSelect,
  Clock,
} from "lucide-react";
import type { DashboardOverviewResponse } from "~/types/admin/dashboard";

interface OverviewSectionProps {
  data: DashboardOverviewResponse;
}

function StatRow({
  icon: Icon,
  label,
  value,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={`p-1.5 rounded-lg ${iconBg} shrink-0`}>
        <Icon size={15} className={iconColor} />
      </div>
      <p className="text-sm text-muted-foreground flex-1 truncate">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </p>
    </div>
  );
}

export function OverviewSection({ data }: OverviewSectionProps) {
  const totalBoxes = data.availableBoxes + data.occupiedBoxes;
  const utilization =
    totalBoxes > 0 ? Math.round((data.occupiedBoxes / totalBoxes) * 100) : 0;

  return (
    <Card className="border border-border/50 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Tổng quan hệ thống
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        <StatRow
          icon={Users}
          label="Người dùng"
          value={data.totalUsers}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatRow
          icon={Store}
          label="Cửa hàng"
          value={data.totalStores}
          iconColor="text-violet-500"
          iconBg="bg-violet-500/10"
        />
        <StatRow
          icon={Lock}
          label="Locker"
          value={data.totalLockers}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatRow
          icon={Wrench}
          label="Dịch vụ hoạt động"
          value={data.activeServices}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />

        <div className="border-t border-border/50 my-2" />

        <StatRow
          icon={Package}
          label="Box khả dụng"
          value={data.availableBoxes}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />
        <StatRow
          icon={BoxSelect}
          label="Box đang sử dụng"
          value={data.occupiedBoxes}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
        />

        <div className="flex items-center gap-3 p-2.5">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Tỷ lệ sử dụng box</span>
              <span className="font-bold text-foreground">{utilization}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  utilization > 80
                    ? "bg-red-500"
                    : utilization > 50
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${utilization}%` }}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 my-2" />

        <StatRow
          icon={Clock}
          label="Đơn đang chờ xử lý"
          value={data.pendingOrders}
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
        />
      </CardContent>
    </Card>
  );
}
