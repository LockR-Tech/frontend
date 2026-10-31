import { FileCheck2, MailCheck, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ReportStatCard } from "~/components/shared/reporting";
import { formatNumber, formatPercent } from "~/lib/report-format";
import type { computeUserStats } from "../hooks/useUsers";

interface UserStatsProps {
  stats: ReturnType<typeof computeUserStats>;
  isLoading: boolean;
}

export function UserStats({ stats, isLoading }: UserStatsProps) {
  const { t } = useTranslation();
  const ofTotal = (count: number) =>
    t("admin.users.stats.ofTotal", {
      percent: formatPercent(stats.total > 0 ? (count * 100) / stats.total : 0),
    });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <ReportStatCard
        label={t("admin.users.stats.total")}
        value={formatNumber(stats.total)}
        hint={t("admin.users.stats.totalHint", {
          customers: formatNumber(stats.customers),
          staff: formatNumber(stats.staff),
        })}
        icon={Users}
        isLoading={isLoading}
      />
      <ReportStatCard
        label={t("admin.users.stats.active")}
        value={formatNumber(stats.active)}
        hint={ofTotal(stats.active)}
        icon={UserCheck}
        isLoading={isLoading}
      />
      <ReportStatCard
        label={t("admin.users.stats.inactive")}
        value={formatNumber(stats.inactive)}
        hint={ofTotal(stats.inactive)}
        icon={UserX}
        isLoading={isLoading}
      />
      <ReportStatCard
        label={t("admin.users.stats.newThisMonth")}
        value={formatNumber(stats.newThisMonth)}
        hint={t("admin.users.stats.newThisMonthHint")}
        icon={UserPlus}
        isLoading={isLoading}
      />
      <ReportStatCard
        label={t("admin.users.stats.emailVerified")}
        value={formatNumber(stats.emailVerified)}
        hint={ofTotal(stats.emailVerified)}
        icon={MailCheck}
        isLoading={isLoading}
      />
      <ReportStatCard
        label={t("admin.users.stats.termsAccepted")}
        value={formatNumber(stats.termsAccepted)}
        hint={ofTotal(stats.termsAccepted)}
        icon={FileCheck2}
        isLoading={isLoading}
      />
    </div>
  );
}
