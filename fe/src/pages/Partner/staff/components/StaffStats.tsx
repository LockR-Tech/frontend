import { Card, CardContent } from "~/components/ui";
import { Users, UserCheck } from "lucide-react";

interface StaffStatsProps {
  total: number;
  active: number;
}

export function StaffStats({ total, active }: StaffStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="text-blue-600" size={24} />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Tổng nhân viên</div>
            <div className="text-2xl font-bold">{total}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <UserCheck className="text-green-600" size={24} />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Đang hoạt động</div>
            <div className="text-2xl font-bold">{active}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
