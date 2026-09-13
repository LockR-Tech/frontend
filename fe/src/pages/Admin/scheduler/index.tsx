import { useTranslation } from "react-i18next";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { useScheduler } from "./hooks/useScheduler";
import { SchedulerStatus } from "./components/SchedulerStatus";
import { JobCard } from "./components/JobCard";
import { JobResults } from "./components/JobResults";
import { Timer, Package, Bell, Info } from "lucide-react";

export default function SchedulerPage() {
  const { t } = useTranslation();
  const {
    handleTriggerAutoCancel,
    handleTriggerBoxRelease,
    handleTriggerPickupReminders,
    isTriggeringCancel,
    isTriggeringRelease,
    isTriggeringReminders,
    jobResults,
  } = useScheduler();

  const jobs = [
    {
      title: t("admin.scheduler.jobs.autoCancel.title"),
      description: t("admin.scheduler.jobs.autoCancel.description"),
      frequency: t("admin.scheduler.jobs.autoCancel.frequency"),
      icon: <Timer size={20} className="text-orange-600" />,
      onTrigger: handleTriggerAutoCancel,
      isLoading: isTriggeringCancel,
    },
    {
      title: t("admin.scheduler.jobs.releaseBoxes.title"),
      description: t("admin.scheduler.jobs.releaseBoxes.description"),
      frequency: t("admin.scheduler.jobs.releaseBoxes.frequency"),
      icon: <Package size={20} className="text-primary" />,
      onTrigger: handleTriggerBoxRelease,
      isLoading: isTriggeringRelease,
    },
    {
      title: t("admin.scheduler.jobs.pickupReminders.title"),
      description: t("admin.scheduler.jobs.pickupReminders.description"),
      frequency: t("admin.scheduler.jobs.pickupReminders.frequency"),
      icon: <Bell size={20} className="text-violet-500" />,
      onTrigger: handleTriggerPickupReminders,
      isLoading: isTriggeringReminders,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.scheduler.title")}
        description={t("admin.scheduler.description")}
      />

      <SchedulerStatus />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <JobCard
            key={job.title}
            title={job.title}
            description={job.description}
            frequency={job.frequency}
            icon={job.icon}
            onTrigger={job.onTrigger}
            isLoading={job.isLoading}
          />
        ))}
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
    </div>
  );
}
