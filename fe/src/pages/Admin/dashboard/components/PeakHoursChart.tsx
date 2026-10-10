import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatDayLabel } from "~/lib/report-format";
import type { PeakHourPoint } from "../hooks/dashboardExtraApi";
import { ChartPlaceholder } from "./ChartPlaceholder";

interface PeakHoursChartProps {
  points?: PeakHourPoint[];
  range: { from: string; to: string };
  isLoading?: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onRetry?: () => void;
}

// GET /api/admin/dashboard/peak-hours — 24 mốc giờ (giờ Việt Nam), số đơn tạo mới.
export function PeakHoursChart({ points, range, isLoading, error, onRetry }: PeakHoursChartProps) {
  const byHour = new Map((points ?? []).map((p) => [Number(p.hour), Number(p.orders) || 0]));
  const data = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, "0")}h`,
    orders: byHour.get(hour) ?? 0,
  }));
  const hasData = data.some((d) => d.orders > 0);

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
          Khung giờ cao điểm sử dụng Kiosk
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Số đơn tạo theo giờ trong ngày, từ {formatDayLabel(range.from)} đến{" "}
          {formatDayLabel(range.to)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || error || !hasData ? (
          <ChartPlaceholder
            isLoading={isLoading}
            error={error}
            isEmpty={!hasData}
            onRetry={onRetry}
            className="h-60"
          />
        ) : (
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="text-border/60" />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                  className="text-[11px] fill-muted-foreground"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  className="text-[11px] fill-muted-foreground"
                />
                <Tooltip
                  formatter={(val) => [`${Number(val).toLocaleString("vi-VN")} đơn`, "Đơn tạo"]}
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
