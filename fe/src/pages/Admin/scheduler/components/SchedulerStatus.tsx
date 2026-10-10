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
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetSchedulerStatusQuery } from "~/stores/apis/admin/scheduler";
import { SCHEDULER_JOBS, jobI18nKey } from "../jobs";

export function SchedulerStatus() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useGetSchedulerStatusQuery();
  // Backend trả {enabled, owner} (OrderController.schedulerStatus).
  const status = data?.data as { enabled?: boolean; owner?: string } | undefined;
  const enabled = status?.enabled === true;

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
          <div>
            <span className="font-medium">{t("admin.scheduler.systemStatus")}</span>
            {status?.owner && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("admin.scheduler.ownerLabel")}{" "}
                <span className="font-mono">{status.owner}</span>
              </p>
            )}
          </div>
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
          ) : enabled ? (
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

        {/* Job list — dựng từ OrderScheduler.java, không lấy từ API */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            {t("admin.scheduler.autoJobs")}
          </h4>
          <div className="space-y-2">
            {SCHEDULER_JOBS.map((job) => {
              const Icon = job.icon;
              const active = !isLoading && !isError && enabled;
              return (
                <div
                  key={job.key}
                  className={`flex items-center justify-between gap-3 p-3 bg-card border border-border/50 rounded-lg${active ? "" : " opacity-60"}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={16} className={`${job.color} shrink-0`} />
                    <span className="text-sm font-medium truncate">
                      {t(jobI18nKey(job.key, "title"))}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 ${active ? "text-green-700 border-green-300 bg-green-50" : ""}`}
                  >
                    {active ? "● " : ""}
                    {t(jobI18nKey(job.key, "frequency"))}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
