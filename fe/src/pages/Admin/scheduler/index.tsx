import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { ConfirmActionDialog } from "~/pages/Admin/knowledge/ConfirmActionDialog";
import { useScheduler } from "./hooks/useScheduler";
import { SchedulerStatus } from "./components/SchedulerStatus";
import { JobCard } from "./components/JobCard";
import { JobResults } from "./components/JobResults";
import { SCHEDULER_JOBS, jobI18nKey, type SchedulerJobKey } from "./jobs";
import { Info } from "lucide-react";

export default function SchedulerPage() {
  const { t } = useTranslation();
  const { runJob, loading, jobResults } = useScheduler();
  const [confirmKey, setConfirmKey] = useState<SchedulerJobKey | null>(null);

  const handleTrigger = (key: SchedulerJobKey, needsConfirm: boolean) => {
    if (needsConfirm) {
      setConfirmKey(key);
      return;
    }
    void runJob(key);
  };

  const handleConfirm = async () => {
    if (!confirmKey) return;
    await runJob(confirmKey);
    setConfirmKey(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.scheduler.title")}
        description={t("admin.scheduler.description")}
      />

      <SchedulerStatus />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {SCHEDULER_JOBS.map((job) => {
          const Icon = job.icon;
          return (
            <JobCard
              key={job.key}
              title={t(jobI18nKey(job.key, "title"))}
              description={t(jobI18nKey(job.key, "description"))}
              frequency={t(jobI18nKey(job.key, "frequency"))}
              icon={<Icon size={20} className={job.color} />}
              onTrigger={() => handleTrigger(job.key, job.needsConfirm)}
              isLoading={loading[job.key]}
            />
          );
        })}
      </div>

      <JobResults results={jobResults} />

      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Info size={16} className="text-primary" />
            {t("admin.scheduler.infoTitle")}
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>{t("admin.scheduler.info1")}</li>
            <li>{t("admin.scheduler.info2")}</li>
            <li>{t("admin.scheduler.info3")}</li>
          </ul>
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={confirmKey !== null}
        onOpenChange={(open) => !open && setConfirmKey(null)}
        title={t("admin.scheduler.confirmTitle", {
          job: confirmKey ? t(jobI18nKey(confirmKey, "title")) : "",
        })}
        description={confirmKey ? <p>{t(jobI18nKey(confirmKey, "confirm"))}</p> : null}
        actionLabel={t("admin.scheduler.runNow")}
        destructive
        loading={confirmKey ? loading[confirmKey] : false}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}
