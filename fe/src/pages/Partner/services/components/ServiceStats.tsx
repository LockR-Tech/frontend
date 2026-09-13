import { Card, CardContent } from "~/components/ui";
import { formatCurrency } from "../utils/service-helpers";
import type { ServiceStats } from "../hooks/useServices";

interface ServiceStatsProps {
  stats: ServiceStats;
}

export function ServiceStats({ stats }: ServiceStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Tổng dịch vụ</div>
          <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Đang hoạt động</div>
          <div className="text-3xl font-bold text-green-600">{stats.active}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Tạm ngưng</div>
          <div className="text-3xl font-bold text-muted-foreground">{stats.inactive}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Giá trung bình</div>
          <div className="text-3xl font-bold text-purple-600">
            {formatCurrency(stats.avgPrice)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
