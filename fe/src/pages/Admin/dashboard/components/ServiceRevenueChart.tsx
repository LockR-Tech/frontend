import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

interface ServiceDataPoint {
  service: string;
  revenue: number;
  orders: number;
  color: string;
}

const DEFAULT_SERVICES: ServiceDataPoint[] = [
  { service: "Gửi hàng Kiosk", revenue: 18450000, orders: 382, color: "#6366F1" },
  { service: "Thuê ô lưu trữ", revenue: 12200000, orders: 245, color: "#10B981" },
  { service: "Giao nhận Drone", revenue: 6800000, orders: 94, color: "#0284C7" },
  { service: "Phí quá hạn / Gia hạn", revenue: 2350000, orders: 67, color: "#F59E0B" },
];

function formatVND(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} tr đ`;
  return `${val.toLocaleString("vi-VN")} đ`;
}

export function ServiceRevenueChart() {
  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
          Doanh thu theo dịch vụ Kiosk
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          So sánh tỷ trọng đóng góp giữa gửi hàng, thuê ô, drone và phí gia hạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={DEFAULT_SERVICES}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="text-border/60" />
              <XAxis
                type="number"
                tickFormatter={formatVND}
                tickLine={false}
                axisLine={false}
                className="text-[11px] fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="service"
                tickLine={false}
                axisLine={false}
                className="text-xs font-medium fill-foreground"
                width={130}
              />
              <Tooltip
                formatter={(val: any, _name: any, item: any) => [
                  `${Number(val).toLocaleString("vi-VN")} đ (${item.payload.orders} lượt)`,
                  "Doanh thu",
                ]}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: "var(--foreground)",
                }}
              />
              <Bar
                dataKey="revenue"
                radius={[0, 6, 6, 0]}
                barSize={20}
              >
                {DEFAULT_SERVICES.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
