import { PageLoading, ErrorState } from "~/components/ui";
import { useTranslation } from "react-i18next";
import { useRevenue } from "./hooks/useRevenue";
import { RevenueStats } from "./components/RevenueStats";
import { TransactionList } from "./components/TransactionList";

export default function PartnerRevenue() {
  const { stats, transactions, isLoading, error, refetch } = useRevenue();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">
          {t("partner.revenue.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("partner.revenue.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <PageLoading message={t("partner.revenue.loadingTitle")} />
      ) : error ? (
        <ErrorState
          variant="server"
          title={t("partner.revenue.errorTitle")}
          error={error}
          onRetry={refetch}
        />
      ) : (
        <>
          <div className="mb-8">
            <RevenueStats
              totalRevenue={stats.totalRevenue}
              totalOrders={stats.totalOrders}
              avgOrderValue={stats.avgOrderValue}
              thisMonthRevenue={stats.thisMonthRevenue}
            />
          </div>
          <TransactionList transactions={transactions} />
        </>
      )}
    </div>
  );
}
