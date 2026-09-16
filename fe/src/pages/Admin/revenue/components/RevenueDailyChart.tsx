import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table2, TrendingUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ReportErrorState } from "~/components/shared/reporting";
import {
  formatCurrency,
  formatDayLabel,
  formatDayShort,
  formatNumber,
} from "~/lib/report-format";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { RevenueDailyResponse } from "~/types/admin/reporting";

interface RevenueDailyChartProps {
  data: RevenueDailyResponse | undefined;
  isLoading: boolean;
  error: FetchBaseQueryError | SerializedError | undefined;
  onRetry: () => void;
}

// Hai chuỗi cùng đơn vị tiền nên chung một trục; màu lấy từ biến CSS đổi theo
// sáng/tối ở `src/index.css`.
const SERIES = [
  { key: "revenue", label: "Tiền thu được", color: "var(--report-series-1)" },
  { key: "netRevenue", label: "Thực thu sau hoàn", color: "var(--report-series-2)" },
] as const;

/** Rút gọn trục tiền: 1.500.000 → "1,5 tr". */
function axisMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} n`;
  }
  return value.toLocaleString("vi-VN");
}

export function RevenueDailyChart({
  data,
  isLoading,
  error,
  onRetry,
}: RevenueDailyChartProps) {
  const [showTable, setShowTable] = useState(false);

  const rows = useMemo(
    () =>
      (data?.days ?? []).map((day) => ({
        ...day,
        shortLabel: formatDayShort(day.date),
      })),
    [data],
  );

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Doanh thu theo ngày
          </CardTitle>
          <CardDescription className="text-xs">
            Tiền thu được trong ngày (theo lịch Việt Nam) và phần còn lại sau khi trừ
            hoàn tiền. Tổng kỳ: {formatCurrency(data?.totalRevenue)}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={() => setShowTable((value) => !value)}
        >
          <Table2 className="h-3.5 w-3.5 mr-1.5" />
          {showTable ? "Xem biểu đồ" : "Xem bảng"}
        </Button>
      </CardHeader>

      <CardContent>
        {error ? (
          <ReportErrorState
            error={error}
            onRetry={onRetry}
            title="Không tải được doanh thu theo ngày"
          />
        ) : isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Không có ngày nào trong khoảng đã chọn.
          </p>
        ) : (
          <>
            {/* Chú giải: hai chuỗi nên định danh không chỉ bằng màu. */}
            <div className="flex flex-wrap items-center gap-4 mb-3">
              {SERIES.map((series) => (
                <span
                  key={series.key}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className="h-0.5 w-4 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  {series.label}
                </span>
              ))}
            </div>

            {showTable ? (
              <div className="max-h-80 overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">Thu được</TableHead>
                      <TableHead className="text-right">Hoàn tiền</TableHead>
                      <TableHead className="text-right">Thực thu</TableHead>
                      <TableHead className="text-right">Đơn thu được</TableHead>
                      <TableHead className="text-right">Đơn tạo mới</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="font-mono text-xs">
                          {formatDayLabel(row.date)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.refundAmount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.netRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(row.paidOrderCount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(row.orderCount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={rows}
                    margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="revenueWash" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--report-series-1)"
                          stopOpacity={0.18}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--report-series-1)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={false}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <XAxis
                      dataKey="shortLabel"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={16}
                      className="text-[11px] fill-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={axisMoney}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      className="text-[11px] fill-muted-foreground"
                    />
                    <Tooltip
                      cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        borderColor: "var(--border)",
                        borderRadius: "0.5rem",
                        fontSize: "12px",
                        color: "var(--foreground)",
                      }}
                      labelFormatter={(_label, payload) =>
                        formatDayLabel(payload?.[0]?.payload?.date)
                      }
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        SERIES.find((series) => series.key === name)?.label ?? name,
                      ]}
                    />

                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--report-series-1)"
                      strokeWidth={2}
                      fill="url(#revenueWash)"
                      activeDot={{
                        r: 4,
                        strokeWidth: 2,
                        stroke: "var(--card)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="netRevenue"
                      stroke="var(--report-series-2)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        strokeWidth: 2,
                        stroke: "var(--card)",
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
