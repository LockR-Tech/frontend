import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonthlyDataPoint } from "~/types/admin/dashboard";

interface MainChartProps {
  data: MonthlyDataPoint[];
  selectedYear: string;
  onYearChange: (year: string) => void;
}

function formatRevenueTick(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} tr`;
  return `${value}`;
}

// Custom clean Tooltip matching Theme
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const orders = payload.find((p: any) => p.dataKey === "orders")?.value ?? 0;
  const revenue = payload.find((p: any) => p.dataKey === "revenue")?.value ?? 0;

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs space-y-1.5 min-w-[140px]">
      <p className="font-semibold text-foreground border-b border-border pb-1">
        Tháng {label}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Đơn hàng:</span>
        <span className="font-medium text-foreground">{orders.toLocaleString("vi-VN")} đơn</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Doanh thu:</span>
        <span className="font-medium text-foreground">{revenue.toLocaleString("vi-VN")} đ</span>
      </div>
    </div>
  );
}

export function MainChart({
  data,
  selectedYear,
  onYearChange,
}: MainChartProps) {
  return (
    <Card className="card-hover border border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-foreground tracking-tight">
            Xu hướng đơn hàng & doanh thu
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Dữ liệu tổng hợp theo từng tháng trong năm {selectedYear}
          </CardDescription>
        </div>
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="w-28 h-8 text-xs font-medium">
            <SelectValue placeholder="Chọn năm" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="2024" className="text-xs">Năm 2024</SelectItem>
            <SelectItem value="2025" className="text-xs">Năm 2025</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-border/60"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                yAxisId="orders"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatRevenueTick}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground mr-3">
                    {value === "orders" ? "Đơn hàng" : "Doanh thu"}
                  </span>
                )}
              />
              <defs>
                <linearGradient id="colorOrdersBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <Bar
                yAxisId="orders"
                dataKey="orders"
                fill="url(#colorOrdersBar)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#10B981", strokeWidth: 2, stroke: "#FFFFFF" }}
                activeDot={{ r: 6, fill: "#059669", strokeWidth: 2, stroke: "#FFFFFF" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
