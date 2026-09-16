import { useState } from "react";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { TableToolbar } from "~/components/shared/data-table";
import { ReportErrorState } from "~/components/shared/reporting";
import { OrderTable } from "./components/OrderTable";
import { OrderFilters } from "./components/OrderFilters";
import { OrderStatusUpdateModal } from "./components/OrderStatusUpdateModal";
import { useOrders } from "./hooks/useOrders";
import { formatNumber } from "~/lib/report-format";
import type { AdminOrder } from "~/types/admin/reporting";

export default function OrdersPage() {
  const {
    orders,
    isLoading,
    isFetching,
    error,
    refetch,
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
  } = useOrders();

  const [editingOrder, setEditingOrder] = useState<AdminOrder | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý đơn hàng"
        description="Toàn bộ đơn gửi hàng, thuê ô và giao bằng drone — dữ liệu đồng bộ với app khách"
      />

      {error && <ReportErrorState error={error} onRetry={refetch} />}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
            <OrderFilters
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
              : `${formatNumber(totalElements)} đơn khớp bộ lọc`}
          </p>

          <OrderTable
            orders={orders}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onUpdateStatus={setEditingOrder}
          />
        </CardContent>
      </Card>

      <OrderStatusUpdateModal
        order={editingOrder}
        onClose={() => setEditingOrder(null)}
        onUpdated={refetch}
      />
    </div>
  );
}
