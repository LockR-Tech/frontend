import { Bell, BellOff, CheckCheck, Archive, TrendingUp, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "~/components/ui/card";
import type { NotificationStatsResponse } from "~/types/admin/notification";

interface NotificationStatsProps {
  stats?: NotificationStatsResponse;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading: boolean;
  description?: string;
}

function StatCard({ title, value, icon: Icon, isLoading, description }: StatCardProps) {
  return (
    <Card className="border border-border/50 shadow-sm bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Icon size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
            {isLoading ? (
              <div className="h-5 w-12 bg-muted rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-bold text-foreground">{value}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotificationStats({ stats, isLoading }: NotificationStatsProps) {
  const { t } = useTranslation();
  const deliveryRate =
    stats?.deliveryRate != null
      ? `${(stats.deliveryRate * 100).toFixed(1)}%`
      : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <StatCard
        title={t("admin.notifications.stats.total")}
        value={stats?.totalNotifications ?? 0}
        icon={Bell}
        isLoading={isLoading}
      />
      <StatCard
        title={t("admin.notifications.stats.unread")}
        value={stats?.unreadCount ?? 0}
        icon={BellOff}
        isLoading={isLoading}
      />
      <StatCard
        title={t("admin.notifications.stats.read")}
        value={stats?.readCount ?? 0}
        icon={CheckCheck}
        isLoading={isLoading}
      />
      <StatCard
        title={t("admin.notifications.stats.archived")}
        value={stats?.archivedCount ?? 0}
        icon={Archive}
        isLoading={isLoading}
      />
      <StatCard
        title={t("admin.notifications.stats.deliveryRate")}
        value={deliveryRate}
        icon={TrendingUp}
        isLoading={isLoading}
      />
      <StatCard
        title={t("admin.notifications.stats.avgReadTime")}
        value={stats?.averageReadTime != null ? `${stats.averageReadTime}m` : "—"}
        icon={Clock}
        isLoading={isLoading}
        description={t("admin.notifications.stats.minutes")}
      />
    </div>
  );
}
