import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "~/components/ui";
import {
  CheckCircle,
  XCircle,
  Activity,
  Timer,
  Package,
  Bell,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetSchedulerStatusQuery } from "~/stores/apis/admin/scheduler";

const JOB_KEYS: Record<
  string,
  { titleKey: string; icon: React.ElementType; color: string; freqKey: string }
> = {
  "auto-cancel-unconfirmed-orders": {
    titleKey: "admin.scheduler.jobs.autoCancel.title",
    freqKey: "admin.scheduler.jobs.autoCancel.frequency",
    icon: Timer,
    color: "text-orange-600",
  },
  "release-boxes-after-completion": {
    titleKey: "admin.scheduler.jobs.releaseBoxes.title",
    freqKey: "admin.scheduler.jobs.releaseBoxes.frequency",
    icon: Package,
    color: "text-blue-600",
  },
  "send-pickup-reminders": {
    titleKey: "admin.scheduler.jobs.pickupReminders.title",
    freqKey: "admin.scheduler.jobs.pickupReminders.frequency",
    icon: Bell,
    color: "text-purple-600",
  },
};

export function SchedulerStatus() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useGetSchedulerStatusQuery();
  const status = data?.data;

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity size={20} className="text-primary" />
          {t("admin.scheduler.statusTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System status row */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <span className="font-medium">{t("admin.scheduler.systemStatus")}</span>
          {isLoading ? (
            <Badge className="bg-muted/50 text-muted-foreground hover:bg-muted">
              <Loader2 size={14} className="mr-1 animate-spin" />
              {t("admin.scheduler.loading")}
            </Badge>
          ) : isError ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                <XCircle size={14} className="mr-1" />
                {t("admin.scheduler.cannotConnect")}
              </Badge>
              <button
                onClick={refetch}
                className="text-muted-foreground/70 hover:text-foreground/80"
                title={t("button.retry")}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          ) : status?.schedulerEnabled ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <CheckCircle size={14} className="mr-1" />
              {t("admin.scheduler.running")}
            </Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
              <XCircle size={14} className="mr-1" />
              {t("admin.scheduler.stopped")}
            </Badge>
          )}
        </div>

        {status?.message && (
          <p className="text-xs text-muted-foreground px-1">{status.message}</p>
        )}

        {/* Job list */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            {t("admin.scheduler.autoJobs")}
          </h4>
          <div className="space-y-2">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-card border border-border/50 rounded-lg animate-pulse"
                >
                  <div className="h-4 w-40 bg-muted rounded" />
                  <div className="h-5 w-20 bg-muted rounded" />
                </div>
              ))
            ) : (
              Object.entries(JOB_KEYS).map(([key, meta]) => {
                const Icon = meta.icon;
                const isActive = !isError && status?.jobs?.includes(key);
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-3 bg-card border border-border/50 rounded-lg${isError || !status?.jobs?.length ? " opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={meta.color} />
                      <span className="text-sm font-medium">{t(meta.titleKey)}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${isActive ? "text-green-700 border-green-300 bg-green-50" : ""}`}
                    >
                      {isActive ? "● " : ""}{t(meta.freqKey)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
