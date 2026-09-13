import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}tr`;
  return `${value}`;
}

export function MainChart({
  data,
  selectedYear,
  onYearChange,
}: MainChartProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Xu hướng đơn hàng & doanh thu
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Dữ liệu theo tháng</p>
        </div>
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="w-25 h-8 text-sm">
            <SelectValue placeholder="Chọn năm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-75 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="orders"
                orientation="left"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Đơn",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  fill: "#9ca3af",
                  fontSize: 11,
                }}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatRevenueTick}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [
                  name === "orders"
                    ? `${value.toLocaleString("vi-VN")} đơn`
                    : `${formatRevenueTick(value)}đ`,
                  name === "orders" ? "Đơn hàng" : "Doanh thu",
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === "orders" ? "Đơn hàng" : "Doanh thu"
                }
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar
                yAxisId="orders"
                dataKey="orders"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                opacity={0.85}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: "#10b981", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
