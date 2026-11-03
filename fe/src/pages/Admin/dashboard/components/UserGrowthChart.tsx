import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { monthName } from "~/lib/report-format";
import { currentLanguage } from "~/utils/i18n";
import type { UserGrowthPoint } from "../hooks/dashboardExtraApi";
import { ChartPlaceholder } from "./ChartPlaceholder";

interface UserGrowthChartProps {
  points?: UserGrowthPoint[];
  isLoading?: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onRetry?: () => void;
}

/** "2026-03" → "T3/26" (tiếng Việt) / "Mar '26" (tiếng Anh) */
const monthLabel = (month: string, t: TFunction, lang: string) => {
  const [year, m] = month.split("-");
  if (!m) return month;
  return t("admin.dashboard.userGrowth.monthTick", {
    month: lang === "vi" ? String(Number(m)) : monthName(Number(m), lang),
    year: year.slice(2),
  });
};

// GET /api/admin/users/growth?months=12 — số tài khoản đăng ký mới mỗi tháng.
export function UserGrowthChart({ points, isLoading, error, onRetry }: UserGrowthChartProps) {
  const { t, i18n } = useTranslation();
  const lang = currentLanguage(i18n);
  const data = [...(points ?? [])]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((p) => ({ month: monthLabel(p.month, t, lang), newUsers: Number(p.newUsers) || 0 }));
  const total = data.reduce((sum, d) => sum + d.newUsers, 0);
  const hasData = data.length > 0 && total > 0;

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-foreground tracking-tight">
            {t("admin.dashboard.userGrowth.title")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("admin.dashboard.userGrowth.description")}
          </CardDescription>
        </div>
        {hasData && (
          <div className="text-right text-xs">
            <p className="text-muted-foreground">{t("admin.dashboard.userGrowth.total12Months")}</p>
            <p className="font-semibold text-foreground">
              {t("admin.dashboard.userGrowth.peopleValue", { value: total.toLocaleString("vi-VN") })}
            </p>
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
                  formatter={(val) => [
                    t("admin.dashboard.userGrowth.peopleValue", { value: Number(val).toLocaleString("vi-VN") }),
                    t("admin.dashboard.userGrowth.newSignups"),
                  ]}
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
