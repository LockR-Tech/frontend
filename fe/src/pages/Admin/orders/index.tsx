import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { TableToolbar } from "~/components/shared/data-table";
import { OrderTable } from "./components/OrderTable";
import { OrderFilters } from "./components/OrderFilters";
import { CreateOrderModal } from "./components/CreateOrderModal";
import { useOrders } from "./hooks/useOrders";
import { toast } from "sonner";

export default function OrdersPage() {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const {
    orders,
    isLoading,
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
  } = useOrders();

  const handleCreateOrder = (orderData: {
    customerName: string;
    customerPhone: string;
    type: string;
    items: { id: string; name: string; qty: number; price: number }[];
    notes: string;
  }) => {
    console.log("Create order:", orderData);
    toast.success(t("admin.orders.createSuccess"));
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.orders.title")}
        description={t("admin.orders.description")}
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {/* Toolbar - 1 hàng */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <OrderFilters
              status={status}
              onStatusChange={setStatus}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusCounts={statusCounts}
            />
            
            <TableToolbar
              createButton={{
                label: t("admin.orders.createOrder"),
                onClick: () => setIsCreateModalOpen(true),
                icon: Plus,
              }}
              onRefresh={refetch}
              onClearFilters={clearFilters}
              canClearFilters={hasActiveFilters}
            />
          </div>

          <OrderTable
            orders={orders}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateOrder}
      />
    </div>
  );
}
