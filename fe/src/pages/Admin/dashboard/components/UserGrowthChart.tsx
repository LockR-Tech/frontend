import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { UserGrowthPoint } from "../hooks/dashboardExtraApi";
import { ChartPlaceholder } from "./ChartPlaceholder";

interface UserGrowthChartProps {
  points?: UserGrowthPoint[];
  isLoading?: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onRetry?: () => void;
}

/** "2026-03" → "T3/26" */
const monthLabel = (month: string) => {
  const [year, m] = month.split("-");
  return m ? `T${Number(m)}/${year.slice(2)}` : month;
};

// GET /api/admin/users/growth?months=12 — số tài khoản đăng ký mới mỗi tháng.
export function UserGrowthChart({ points, isLoading, error, onRetry }: UserGrowthChartProps) {
  const data = [...(points ?? [])]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((p) => ({ month: monthLabel(p.month), newUsers: Number(p.newUsers) || 0 }));
  const total = data.reduce((sum, d) => sum + d.newUsers, 0);
  const hasData = data.length > 0 && total > 0;

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-foreground tracking-tight">
            Tăng trưởng khách hàng mới
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Số tài khoản đăng ký mới mỗi tháng (12 tháng gần nhất)
          </CardDescription>
        </div>
        {hasData && (
          <div className="text-right text-xs">
            <p className="text-muted-foreground">Tổng 12 tháng</p>
            <p className="font-semibold text-foreground">{total.toLocaleString("vi-VN")} người</p>
          </div>
        )}
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
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="text-border/60" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-[11px] fill-muted-foreground" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-[11px] fill-muted-foreground" />
                <Tooltip
                  formatter={(val) => [`${Number(val).toLocaleString("vi-VN")} người`, "Đăng ký mới"]}
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#userGrowthGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
