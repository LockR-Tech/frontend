import { FileCheck2, MailCheck, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ReportStatCard } from "~/components/shared/reporting";
import { formatNumber, formatPercent } from "~/lib/report-format";
import type { UserSegment, computeUserStats } from "../hooks/useUsers";

interface UserStatsProps {
  stats: ReturnType<typeof computeUserStats>;
  isLoading: boolean;
  segment: UserSegment | null;
  /// Bấm thẻ để xem những người tạo nên con số; null = tất cả.
  onSelect: (segment: UserSegment | null) => void;
}

const SELECTED_CARD = "ring-2 ring-primary";

export function UserStats({ stats, isLoading, segment, onSelect }: UserStatsProps) {
  const { t } = useTranslation();
  const selectable = (value: UserSegment) => ({
    onClick: () => onSelect(value),
    className: segment === value ? SELECTED_CARD : undefined,
  });
  const hintLink = (value: UserSegment, label: string) => (
    <button
      type="button"
      className={`hover:underline ${segment === value ? "font-semibold text-foreground" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(value);
      }}
    >
      {label}
    </button>
  );
  const ofTotal = (count: number) =>
    t("admin.users.stats.ofTotal", {
      percent: formatPercent(stats.total > 0 ? (count * 100) / stats.total : 0),
    });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <ReportStatCard
        label={t("admin.users.stats.total")}
        value={formatNumber(stats.total)}
        hint={
          <>
            {hintLink("CUSTOMER", t("admin.users.stats.customers", { count: stats.customers, value: formatNumber(stats.customers) }))}
            {" · "}
            {hintLink("STAFF", t("admin.users.stats.staff", { count: stats.staff, value: formatNumber(stats.staff) }))}
          </>
        }
        icon={Users}
        isLoading={isLoading}
        onClick={() => onSelect(null)}
      />
      <ReportStatCard
        label={t("admin.users.stats.active")}
        value={formatNumber(stats.active)}
        hint={ofTotal(stats.active)}
        icon={UserCheck}
        isLoading={isLoading}
        {...selectable("ACTIVE")}
      />
      <ReportStatCard
        label={t("admin.users.stats.inactive")}
        value={formatNumber(stats.inactive)}
        hint={ofTotal(stats.inactive)}
        icon={UserX}
        isLoading={isLoading}
        {...selectable("INACTIVE")}
      />
      <ReportStatCard
        label={t("admin.users.stats.newThisMonth")}
        value={formatNumber(stats.newThisMonth)}
        hint={t("admin.users.stats.newThisMonthHint")}
        icon={UserPlus}
        isLoading={isLoading}
        {...selectable("NEW_THIS_MONTH")}
      />
      <ReportStatCard
        label={t("admin.users.stats.emailVerified")}
        value={formatNumber(stats.emailVerified)}
        hint={ofTotal(stats.emailVerified)}
        icon={MailCheck}
        isLoading={isLoading}
        {...selectable("EMAIL_VERIFIED")}
      />
      <ReportStatCard
        label={t("admin.users.stats.termsAccepted")}
        value={formatNumber(stats.termsAccepted)}
        hint={ofTotal(stats.termsAccepted)}
        icon={FileCheck2}
        isLoading={isLoading}
        {...selectable("TERMS_ACCEPTED")}
      />
    </div>
  );
}
