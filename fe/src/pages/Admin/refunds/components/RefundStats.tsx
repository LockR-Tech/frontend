import { Clock, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "~/components/ui/card";
import { formatNumber } from "~/lib/report-format";
import { cn } from "~/lib/utils";

interface RefundStatsProps {
  pendingCount: number;
  completedCount: number;
  rejectedCount: number;
  totalCount: number;
  isLoading?: boolean;
  activeStatus?: string;
  onStatusClick: (status: string) => void;
}

export function RefundStats({
  pendingCount,
  completedCount,
  rejectedCount,
  totalCount,
  isLoading,
  activeStatus = "ALL",
  onStatusClick,
}: RefundStatsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      key: "PENDING",
      title: t("admin.refunds.stats.pending", "Chờ xử lý"),
      count: pendingCount,
      description: t(
        "admin.refunds.stats.pendingSub",
        "Chờ admin duyệt & chuyển khoản",
      ),
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
      activeRing: "ring-2 ring-amber-500 border-amber-500/50",
      badgeClass:
        pendingCount > 0
          ? "bg-amber-500 text-white animate-pulse"
          : "bg-muted text-muted-foreground",
    },
    {
      key: "COMPLETED",
      title: t("admin.refunds.stats.completed", "Đã hoàn tiền"),
      count: completedCount,
      description: t(
        "admin.refunds.stats.completedSub",
        "Đã chuyển khoản thành công",
      ),
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
      activeRing: "ring-2 ring-emerald-500 border-emerald-500/50",
    },
    {
      key: "REJECTED",
      title: t("admin.refunds.stats.rejected", "Đã từ chối"),
      count: rejectedCount,
      description: t(
        "admin.refunds.stats.rejectedSub",
        "Yêu cầu bị từ chối",
      ),
      icon: XCircle,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10 dark:bg-rose-500/20",
      activeRing: "ring-2 ring-rose-500 border-rose-500/50",
    },
    {
      key: "ALL",
      title: t("admin.refunds.stats.total", "Tổng yêu cầu"),
      count: totalCount,
      description: t(
        "admin.refunds.stats.totalSub",
        "Tổng số lượt yêu cầu hoàn tiền",
      ),
      icon: RotateCcw,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
      activeRing: "ring-2 ring-blue-500 border-blue-500/50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeStatus === card.key;

        return (
          <Card
            key={card.key}
            onClick={() => onStatusClick(card.key)}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md border",
              isActive
                ? card.activeRing
                : "border-border/60 hover:border-border",
            )}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={cn("p-2 rounded-lg", card.bgColor)}>
                  <Icon className={cn("w-4 h-4", card.color)} />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {isLoading ? (
                    <span className="inline-block w-12 h-7 bg-muted animate-pulse rounded" />
                  ) : (
                    formatNumber(card.count)
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                  {card.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
