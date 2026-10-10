import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { orderStatusMeta } from "~/components/shared/reporting";
import { ChartPlaceholder } from "./ChartPlaceholder";

interface OrderStatusChartProps {
  /** `byStatus` của /api/admin/dashboard/overview — số đơn theo từng trạng thái. */
  byStatus?: Record<string, number>;
  isLoading?: boolean;
}

// Thứ tự hiển thị theo vòng đời đơn; trạng thái lạ xếp cuối.
const STATUS_ORDER = [
  "INITIALIZED",
  "AWAITING_DISPATCH",
  "STORING",
  "EXPIRED",
  "COMPLETED",
  "CANCELED",
  "RETURNED",
];

const STATUS_COLORS: Record<string, string> = {
  INITIALIZED: "#94A3B8",
  AWAITING_DISPATCH: "#8B5CF6",
  STORING: "#0284C7",
  EXPIRED: "#F59E0B",
  COMPLETED: "#10B981",
  CANCELED: "#EF4444",
  RETURNED: "#64748B",
};

export function OrderStatusChart({ byStatus, isLoading }: OrderStatusChartProps) {
  const entries = Object.entries(byStatus ?? {})
    .map(([status, count]) => ({ status, value: Number(count) || 0 }))
    .filter((e) => e.value > 0)
    .sort((a, b) => {
      const ia = STATUS_ORDER.indexOf(a.status);
      const ib = STATUS_ORDER.indexOf(b.status);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  const total = entries.reduce((sum, e) => sum + e.value, 0);

  const data = entries.map((e) => ({
    name: orderStatusMeta(e.status).label,
    value: e.value,
    color: STATUS_COLORS[e.status] ?? "#A3A3A3",
    percentage: total > 0 ? (e.value / total) * 100 : 0,
  }));

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
          Trạng thái đơn hàng
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Toàn bộ đơn trong hệ thống theo trạng thái hiện tại
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || data.length === 0 ? (
          <ChartPlaceholder isLoading={isLoading} isEmpty={data.length === 0} />
        ) : (
          <>
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
                    formatter={(value) => [`${Number(value).toLocaleString("vi-VN")} đơn`, "Số lượng"]}
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
                <div key={item.name} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground shrink-0">
                    {item.value.toLocaleString("vi-VN")} · {item.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
