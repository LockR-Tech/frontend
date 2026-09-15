import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface OrderStatusItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface OrderStatusChartProps {
  completed?: number;
  inProgress?: number;
  ready?: number;
  canceled?: number;
}

export function OrderStatusChart({
  completed = 450,
  inProgress = 85,
  ready = 42,
  canceled = 23,
}: OrderStatusChartProps) {
  const total = completed + inProgress + ready + canceled;

  const data: OrderStatusItem[] = [
    {
      name: "Hoàn tất nhận đồ",
      value: completed,
      color: "#10B981",
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    {
      name: "Đang lưu kho",
      value: inProgress,
      color: "#F59E0B",
      percentage: total > 0 ? Math.round((inProgress / total) * 100) : 0,
    },
    {
      name: "Chờ khách lấy",
      value: ready,
      color: "#0284C7",
      percentage: total > 0 ? Math.round((ready / total) * 100) : 0,
    },
    {
      name: "Quá hạn / Hủy",
      value: canceled,
      color: "#EF4444",
      percentage: total > 0 ? Math.round((canceled / total) * 100) : 0,
    },
  ];

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
          Trạng thái đơn hàng
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Tỷ lệ luồng gửi hàng và thuê ô Kiosk
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-52 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={55}
                outerRadius={78}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${value} đơn`, "Số lượng"]}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: "var(--foreground)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] text-muted-foreground font-medium">Tổng số đơn</span>
            <span className="text-sm font-bold text-foreground">
              {total.toLocaleString("vi-VN")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/60">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground truncate">{item.name}</span>
              </div>
              <span className="font-semibold text-foreground">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
