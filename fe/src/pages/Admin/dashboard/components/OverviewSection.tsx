import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import {
  Users,
  Store,
  Boxes,
  Power,
  Clock,
  Archive,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import type { DashboardOverviewResponse } from "~/types/admin/dashboard";

interface OverviewSectionProps {
  data: DashboardOverviewResponse;
  /** Số tủ đang ACTIVE (đếm từ danh sách tủ); null khi chưa tải được. */
  activeLockers: number | null;
}

export function OverviewSection({ data, activeLockers }: OverviewSectionProps) {
  const { t } = useTranslation();
  const totalBoxes = data.availableBoxes + data.occupiedBoxes;
  const utilization =
    totalBoxes > 0 ? Math.round((data.occupiedBoxes / totalBoxes) * 100) : 0;

  const metrics = [
    {
      label: t("admin.sidebar.users"),
      value: data.totalUsers,
      icon: Users,
    },
    {
      label: t("admin.sidebar.stores"),
      value: data.totalStores,
      icon: Store,
    },
    {
      label: t("admin.dashboard.overview.totalKiosks"),
      value: data.totalLockers,
      icon: Boxes,
    },
    {
      label: t("admin.dashboard.overview.activeKiosks"),
      value: activeLockers ?? "—",
      icon: Power,
    },
  ];

  return (
    <Card className="card-hover border border-border bg-card h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
          {t("admin.dashboard.overview.title")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {t("admin.dashboard.overview.description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
        {/* Capacity Bar */}
        <div className="p-3.5 rounded-lg bg-secondary/60 border border-border/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Archive size={14} className="text-muted-foreground" />
              {t("admin.dashboard.overview.occupancyRate")}
            </span>
            <span className="text-xs font-bold text-foreground">
              {utilization}%
            </span>
          </div>

          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${utilization}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
            <span>
              <Trans
                i18nKey="admin.dashboard.overview.available"
                values={{ value: data.availableBoxes }}
                components={{ b: <strong className="text-foreground font-semibold" /> }}
              />
            </span>
            <span>
              <Trans
                i18nKey="admin.dashboard.overview.inUse"
                values={{ value: data.occupiedBoxes }}
                components={{ b: <strong className="text-foreground font-semibold" /> }}
              />
            </span>
            <span>
              <Trans
                i18nKey="admin.dashboard.overview.total"
                values={{ value: totalBoxes }}
                components={{ b: <strong className="text-foreground font-semibold" /> }}
              />
            </span>
          </div>
        </div>

        {/* 2x2 Grid Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="p-3 rounded-lg border border-border/60 bg-card hover:bg-secondary/40 transition-colors flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground truncate">
                    {item.label}
                  </span>
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                </div>
                <p className="text-lg font-bold text-foreground tracking-tight">
                  {typeof item.value === "number"
                    ? item.value.toLocaleString("vi-VN")
                    : item.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Pending orders alert */}
        <div className="pt-1">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border/50 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Clock size={14} className="text-muted-foreground" />
              {t("admin.dashboard.overview.pendingOrders")}
            </span>
            <span className="font-semibold text-foreground px-2 py-0.5 rounded bg-card border border-border text-[11px]">
              {t("admin.dashboard.chart.ordersValue", { value: data.pendingOrders })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
