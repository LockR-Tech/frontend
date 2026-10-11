import { Box, CheckCircle, Wrench, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "~/components/ui/card";

interface LockerStatsProps {
  statistics: {
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    disconnected: number;
    totalBoxes: number;
    availableBoxes: number;
    occupiedBoxes: number;
  };
}

export function LockerStats({ statistics }: LockerStatsProps) {
  const { t } = useTranslation();
  const stats = [
    {
      label: t("admin.lockers.stats.totalLockers"),
      value: statistics.total,
      icon: Box,
    },
    {
      label: t("admin.lockers.status.active"),
      value: statistics.active,
      icon: CheckCircle,
    },
    {
      label: t("admin.lockers.status.maintenance"),
      value: statistics.maintenance,
      icon: Wrench,
    },
    {
      label: t("admin.lockers.status.disconnected"),
      value: statistics.disconnected,
      icon: WifiOff,
    },
    {
      label: t("admin.lockers.stats.totalBoxes"),
      value: statistics.totalBoxes,
      icon: Box,
    },
    {
      label: t("admin.lockers.stats.availableBoxes"),
      value: statistics.availableBoxes,
      icon: CheckCircle,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="card-hover border border-border bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border/50">
                  <Icon size={16} className="text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold tracking-tight text-foreground truncate">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
