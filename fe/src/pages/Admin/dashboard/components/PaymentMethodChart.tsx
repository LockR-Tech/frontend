import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { paymentMethodMeta } from "~/components/shared/reporting";
import { formatPercent } from "~/lib/report-format";
import type { RevenueByMethodItem } from "~/types/admin/reporting";
import { ChartPlaceholder } from "./ChartPlaceholder";

interface PaymentMethodChartProps {
  items?: RevenueByMethodItem[];
  year: string;
  isLoading?: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onRetry?: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  WALLET: "#10B981",
  VNPAY: "#2563EB",
  MOMO: "#EC4899",
  CASH: "#F59E0B",
  VNPAY_TOPUP: "#8B5CF6",
};
const FALLBACK_COLORS = ["#0EA5E9", "#64748B", "#A855F7", "#F97316"];

function formatVND(val: number) {
  return val.toLocaleString("vi-VN") + " đ";
}

// /api/admin/revenue/by-method — tiền thực thu theo phương thức trong năm đang chọn.
export function PaymentMethodChart({ items, year, isLoading, error, onRetry }: PaymentMethodChartProps) {
  const chartData = (items ?? [])
    .filter((item) => Number(item.revenue) > 0)
    .map((item, index) => ({
      name: paymentMethodMeta(item.method).label,
      value: Number(item.revenue) || 0,
      sharePct: item.sharePct,
      color: METHOD_COLORS[item.method] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    }));

  const total = chartData.reduce((acc, cur) => acc + cur.value, 0);
  const placeholder = (
    <ChartPlaceholder
      isLoading={isLoading}
      error={error}
      isEmpty={chartData.length === 0}
      onRetry={onRetry}
    />
  );

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
          Cơ cấu thanh toán
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Tiền thực thu theo phương thức — năm {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || error || chartData.length === 0 ? (
          placeholder
        ) : (
          <>
            <div className="h-52 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={55}
                    outerRadius={78}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatVND(Number(value)), "Thực thu"]}
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
                <span className="text-[11px] text-muted-foreground font-medium">Tổng cộng</span>
                <span className="text-sm font-bold text-foreground">
                  {total >= 1_000_000 ? `${(total / 1_000_000).toFixed(1)} tr` : formatVND(total)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/60">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground shrink-0">
                    {item.sharePct != null
                      ? formatPercent(item.sharePct)
                      : total > 0
                        ? formatPercent((item.value / total) * 100)
                        : "—"}
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
