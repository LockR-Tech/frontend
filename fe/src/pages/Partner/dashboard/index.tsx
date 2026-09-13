import { useTranslation } from "react-i18next";
import { PageLoading, ErrorState } from "~/components/ui";
import { useDashboard } from "./hooks/useDashboard";
import { AlertSection } from "./components/AlertSection";
import { StatCards } from "./components/StatCards";
import { StatsGrid } from "./components/StatsGrid";
import { ChartsSection } from "./components/ChartsSection";
import { RecentOrdersTable } from "./components/RecentOrdersTable";

export default function PartnerDashboard() {
  const { t } = useTranslation();
  const { stats, pendingOrders, isLoading, error, refetch, hasData } =
    useDashboard();

  if (isLoading) {
    return <PageLoading message={t("common.loading")} />;
  }

  if (error || !hasData) {
    return (
      <ErrorState
        variant="server"
        title={t("partner.dashboard.errorTitle")}
        error={error}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">
          {t("partner.dashboard.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("partner.dashboard.subtitle")}
        </p>
      </div>

      {/* Alert Section */}
      <AlertSection
        pendingCollections={stats.pendingOrders}
        overdueOrders={0}
      />

      {/* Overview Cards */}
      <StatCards stats={stats} />

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Revenue Breakdown */}
      <ChartsSection stats={stats} />

      {/* Pending Orders Table */}
      <RecentOrdersTable orders={pendingOrders} />
    </div>
  );
}
