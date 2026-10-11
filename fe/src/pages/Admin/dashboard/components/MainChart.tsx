import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
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
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { MonthlyDataPoint } from "~/types/admin/dashboard";
import { monthName } from "~/lib/report-format";
import i18n, { currentLanguage } from "~/utils/i18n";
import { ChartPlaceholder } from "./ChartPlaceholder";

interface MainChartProps {
  data: MonthlyDataPoint[];
  selectedYear: string;
  yearOptions: string[];
  onYearChange: (year: string) => void;
  isLoading?: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onRetry?: () => void;
}

function formatRevenueTick(value: number) {
  if (value >= 1_000_000_000)
    return i18n.t("admin.dashboard.format.billionShort", { value: (value / 1_000_000_000).toFixed(1) });
  if (value >= 1_000_000)
    return i18n.t("admin.dashboard.format.millionShort", { value: (value / 1_000_000).toFixed(0) });
  return `${value}`;
}

/** Nhãn tháng từ dữ liệu `T3`: tiếng Việt giữ `T3` / `Tháng 3`, ngôn ngữ khác dùng tên tháng. */
function monthText(label: string | undefined, t: TFunction, style: "short" | "long"): string {
  const month = Number(label?.replace(/^T/, ""));
  if (!month) return label ?? "";
  const lang = currentLanguage(i18n);
  const value = lang === "vi" ? String(month) : monthName(month, lang, style);
  return style === "short"
    ? t("admin.dashboard.mainChart.monthTick", { month: value })
    : t("admin.dashboard.mainChart.monthTitle", { month: value });
}

interface TooltipEntry {
  dataKey?: string | number;
  value?: number;
}

// Custom clean Tooltip matching Theme
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  const { t } = useTranslation();
  if (!active || !payload || !payload.length) return null;

  const orders = payload.find((p) => p.dataKey === "orders")?.value ?? 0;
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs space-y-1.5 min-w-35">
      <p className="font-semibold text-foreground border-b border-border pb-1">
        {monthText(label, t, "long")}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">{t("admin.dashboard.mainChart.ordersCreatedLabel")}</span>
        <span className="font-medium text-foreground">
          {t("admin.dashboard.chart.ordersValue", { value: orders.toLocaleString("vi-VN") })}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">{t("admin.dashboard.mainChart.collectedLabel")}</span>
        <span className="font-medium text-foreground">{revenue.toLocaleString("vi-VN")} đ</span>
      </div>
    </div>
  );
}

export function MainChart({
  data,
  selectedYear,
  yearOptions,
  onYearChange,
  isLoading,
  error,
  onRetry,
}: MainChartProps) {
  const { t } = useTranslation();
  const hasData = data.some((d) => d.orders > 0 || d.revenue > 0);
  const placeholder = (
    <ChartPlaceholder
      isLoading={isLoading}
      error={error}
      isEmpty={!hasData}
      onRetry={onRetry}
      className="h-80"
    />
  );

  return (
    <Card className="card-hover border border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-foreground tracking-tight">
            {t("admin.dashboard.mainChart.title")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {t("admin.dashboard.mainChart.description", { year: selectedYear })}
          </CardDescription>
        </div>
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="w-28 h-8 text-xs font-medium">
            <SelectValue placeholder={t("admin.dashboard.mainChart.selectYear")} />
          </SelectTrigger>
          <SelectContent align="end">
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year} className="text-xs">
                {t("admin.dashboard.mainChart.yearOption", { year })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading || error || !hasData ? (
          placeholder
        ) : (
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
                  tickFormatter={(value: string) => monthText(value, t, "short")}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="left"
                  allowDecimals={false}
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
                      {value === "orders"
                        ? t("admin.dashboard.chart.ordersCreated")
                        : t("admin.dashboard.chart.collected")}
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
        )}
      </CardContent>
    </Card>
  );
}
