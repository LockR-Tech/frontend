import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { MapPin, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "~/lib/report-format";
import type { RevenueByStoreItem } from "~/types/admin/reporting";
import { ChartPlaceholder } from "./ChartPlaceholder";

interface TopLocationsTableProps {
  items?: RevenueByStoreItem[];
  year: string;
  isLoading?: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onRetry?: () => void;
}

const TOP_N = 5;

// /api/admin/revenue/by-store — xếp theo tiền thực thu trong năm đang chọn.
export function TopLocationsTable({ items, year, isLoading, error, onRetry }: TopLocationsTableProps) {
  const top = [...(items ?? [])]
    .filter((item) => Number(item.revenue) > 0 || item.orderCount > 0)
    .sort((a, b) => Number(b.revenue) - Number(a.revenue) || b.orderCount - a.orderCount)
    .slice(0, TOP_N);

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-foreground tracking-tight">
            Top địa điểm hiệu quả nhất
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Xếp hạng theo tiền thực thu và số đơn — năm {year}
          </CardDescription>
        </div>
        <Link
          to="/admin/revenue"
          className="text-xs font-medium text-foreground hover:text-muted-foreground inline-flex items-center gap-1 transition-colors"
        >
          Báo cáo chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading || error || top.length === 0 ? (
          <ChartPlaceholder
            isLoading={isLoading}
            error={error}
            isEmpty={top.length === 0}
            onRetry={onRetry}
            className="h-40"
          />
        ) : (
          <div className="divide-y divide-border/60">
            {top.map((loc, idx) => {
              const name = loc.storeId == null ? "Chưa gán cửa hàng" : loc.name || `Cửa hàng #${loc.storeId}`;
              return (
                <div
                  key={loc.storeId ?? "unassigned"}
                  className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-secondary text-foreground text-xs font-bold flex items-center justify-center shrink-0 border border-border/60">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      {loc.storeId != null ? (
                        <Link
                          to={`/admin/stores/${loc.storeId}`}
                          className="text-sm font-semibold text-foreground truncate block hover:underline"
                        >
                          {name}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                      )}
                      {loc.address && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {loc.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <p className="hidden sm:block text-xs text-muted-foreground">
                      {loc.lockerCount} Kiosk • {loc.orderCount.toLocaleString("vi-VN")} đơn
                    </p>
                    <div>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(loc.revenue)}</p>
                      <p className="text-[11px] text-muted-foreground sm:hidden">
                        {loc.orderCount.toLocaleString("vi-VN")} đơn
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
