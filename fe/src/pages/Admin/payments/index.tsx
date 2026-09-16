import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
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
import { RefundTab } from "./components/RefundTab";
import { WalletTransactionTab } from "./components/WalletTransactionTab";
import { usePayments } from "./hooks/usePayments";
import { formatNumber } from "~/lib/report-format";

export default function PaymentsPage() {
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

  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Quản lý thanh toán"
          description="Giao dịch, hoàn tiền và biến động ví — số liệu lấy trực tiếp từ payment-service"
        />
        <Link to="/admin/revenue">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Xem phân tích doanh thu
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <PaymentStats
        stats={stats}
        isLoading={isStatsFetching && !stats}
        error={statsError}
        range={statsRange}
        onRangeChange={setStatsRange}
        onRetry={refetch}
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <Tabs defaultValue="payments">
            <TabsList className="mb-4">
              <TabsTrigger value="payments" className="text-xs px-4">
                Giao dịch
              </TabsTrigger>
              <TabsTrigger value="refunds" className="text-xs px-4">
                Hoàn tiền
              </TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs px-4">
                Biến động ví
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
                  ? "Đang tải…"
                  : `${formatNumber(totalElements)} giao dịch khớp bộ lọc`}
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

            <TabsContent value="refunds" className="mt-0">
              <RefundTab />
            </TabsContent>

            <TabsContent value="wallet" className="mt-0">
              <WalletTransactionTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <PaymentDetailModal
        paymentId={selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
        onUpdated={refetch}
      />
    </div>
  );
}
