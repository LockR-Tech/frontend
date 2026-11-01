import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, RotateCcw, TrendingUp } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TableToolbar } from "~/components/shared/data-table";
import { ReportErrorState } from "~/components/shared/reporting";
import { PaymentTable } from "./components/PaymentTable";
import { PaymentFilters } from "./components/PaymentFilters";
import { PaymentStats } from "./components/PaymentStats";
import { PaymentDetailModal } from "./components/PaymentDetailModal";
import { WalletTransactionTab } from "./components/WalletTransactionTab";
import { WithdrawalTab } from "./components/WithdrawalTab";
import {
  RevenueEntriesModal,
  type RevenueEntriesTarget,
} from "../revenue/components/RevenueEntriesModal";
import { usePayments } from "./hooks/usePayments";
import { formatNumber } from "~/lib/report-format";

export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "payments";
  const {
    payments,
    isLoading,
    isFetching,
    error,
    refetch,
    stats,
    isStatsFetching,
    statsError,
    statsRange,
    setStatsRange,
    showInTable,
    filters,
    setFilter,
    setDateRange,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalElements,
    hasActiveFilters,
    clearFilters,
  } = usePayments();
  const { t } = useTranslation();

  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [entriesTarget, setEntriesTarget] = useState<RevenueEntriesTarget | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Tô sáng thẻ khi bảng đang lọc đúng khoảng ngày và đúng một giá trị của thẻ đó.
  const matchesStatsRange = filters.from === statsRange.from && filters.to === statsRange.to;
  const selectedStat =
    tab === "payments" && matchesStatsRange && filters.status.length <= 1 && filters.method.length <= 1
      ? { status: filters.status[0], method: filters.method[0] }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={t("admin.payments.title")}
          description={t("admin.payments.description")}
        />
        <div className="flex items-center gap-2">
          <Link to="/admin/refunds">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              {t("admin.sidebar.refunds", "Hoàn tiền")}
            </Button>
          </Link>
          <Link to="/admin/revenue">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              {t("admin.payments.viewRevenue")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <PaymentStats
        stats={stats}
        isLoading={isStatsFetching && !stats}
        error={statsError}
        range={statsRange}
        onRangeChange={setStatsRange}
        onRetry={refetch}
        selected={selectedStat}
        onSelect={(filter) => {
          showInTable(filter);
          tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onShowEntries={(kind, label) => setEntriesTarget({ kind, label, range: statsRange })}
      />

      <Card ref={tableRef} className="scroll-mt-20 border-0 shadow-sm">
        <CardContent className="p-6">
          <Tabs value={tab} onValueChange={value => {
            const next = new URLSearchParams(searchParams);
            next.set("tab", value);
            setSearchParams(next);
          }}>
            <TabsList className="mb-4">
              <TabsTrigger value="payments" className="text-xs px-4">
                {t("admin.payments.tabs.transactions")}
              </TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs px-4">
                {t("admin.payments.tabs.wallet")}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="text-xs px-4">
                {t("admin.payments.tabs.withdrawals")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="mt-0 space-y-4">
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                <PaymentFilters
                  filters={filters}
                  onFilterChange={setFilter}
                  onDateRangeChange={setDateRange}
                />
                <TableToolbar
                  onRefresh={refetch}
                  onClearFilters={clearFilters}
                  canClearFilters={hasActiveFilters}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {isFetching
                  ? t("common.loadingEllipsis")
                  : t("admin.payments.matchCount", {
                      total: formatNumber(totalElements),
                    })}
              </p>

              {error && <ReportErrorState error={error} onRetry={refetch} />}

              <PaymentTable
                payments={payments}
                isLoading={isLoading}
                onViewDetail={setSelectedPaymentId}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                totalElements={totalElements}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </TabsContent>

            <TabsContent value="wallet" className="mt-0">
              <WalletTransactionTab />
            </TabsContent>

            <TabsContent value="withdrawals" className="mt-0">
              <WithdrawalTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <RevenueEntriesModal target={entriesTarget} onClose={() => setEntriesTarget(null)} />

      <PaymentDetailModal
        paymentId={selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
        onUpdated={refetch}
      />
    </div>
  );
}
