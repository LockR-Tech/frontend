import { useState } from "react";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { TableToolbar } from "~/components/shared/data-table";
import { PaymentTable } from "./components/PaymentTable";
import { PaymentFilters } from "./components/PaymentFilters";
import { PaymentStats } from "./components/PaymentStats";
import { PaymentDetailModal } from "./components/PaymentDetailModal";
import { usePayments } from "./hooks/usePayments";

export default function PaymentsPage() {
  const {
    payments,
    isLoading,
    statistics,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    statusCounts,
    refetch,
    clearFilters,
    hasActiveFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalElements,
  } = usePayments();

  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(
    null,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý thanh toán"
        description="Quản lý và theo dõi các giao dịch thanh toán"
      />

      <PaymentStats statistics={statistics} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {/* Toolbar - 1 hàng */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <PaymentFilters
              status={status}
              onStatusChange={setStatus}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusCounts={statusCounts}
            />

            <TableToolbar
              onRefresh={refetch}
              onClearFilters={clearFilters}
              canClearFilters={hasActiveFilters}
            />
          </div>

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
        </CardContent>
      </Card>

      <PaymentDetailModal
        paymentId={selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
      />
    </div>
  );
}
