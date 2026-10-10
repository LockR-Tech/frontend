import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { revenueServiceMeta } from "~/components/shared/reporting";
import type { RevenueByServiceItem } from "~/types/admin/reporting";
import { ChartPlaceholder } from "./ChartPlaceholder";

interface ServiceRevenueChartProps {
  items?: RevenueByServiceItem[];
  year: string;
  isLoading?: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onRetry?: () => void;
}

const SERVICE_COLORS: Record<string, string> = {
  SEND: "#6366F1",
  RENTAL: "#10B981",
  DRONE_DELIVERY: "#0284C7",
  OVERTIME_FEE: "#F59E0B",
};

function formatVND(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} tr đ`;
  return `${val.toLocaleString("vi-VN")} đ`;
}

// /api/admin/revenue/by-service — gồm dòng OVERTIME_FEE (phí quá hạn đã thu).
export function ServiceRevenueChart({ items, year, isLoading, error, onRetry }: ServiceRevenueChartProps) {
  const data = (items ?? [])
    .filter((item) => Number(item.revenue) > 0)
    .map((item) => ({
      service: revenueServiceMeta(item.serviceType).label,
      revenue: Number(item.revenue) || 0,
      paidOrders: item.paidOrderCount,
      color: SERVICE_COLORS[item.serviceType] ?? "#64748B",
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
          Doanh thu theo dịch vụ Kiosk
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Tiền thực thu theo loại dịch vụ và phí quá hạn — năm {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || error || data.length === 0 ? (
          <ChartPlaceholder
            isLoading={isLoading}
            error={error}
            isEmpty={data.length === 0}
            onRetry={onRetry}
            className="h-60"
          />
        ) : (
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
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
                  width={110}
                />
                <Tooltip
                  formatter={(val, _name, item) => [
                    `${Number(val).toLocaleString("vi-VN")} đ (${(item?.payload as { paidOrders?: number } | undefined)?.paidOrders ?? 0} đơn có thu)`,
                    "Thực thu",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
