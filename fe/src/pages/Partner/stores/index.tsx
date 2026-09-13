import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { TableToolbar } from "~/components/shared/data-table";
import { StoreTable } from "./components/StoreTable";
import { StoreFilters } from "./components/StoreFilters";
import { usePartnerStores } from "./hooks/usePartnerStores";

export default function PartnerStoresPage() {
  const {
    stores,
    isLoading,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    statusCounts,
    handleViewDetail,
    refetch,
    clearFilters,
    hasActiveFilters,
  } = usePartnerStores();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý cửa hàng"
        description="Danh sách các cửa hàng và tủ locker của bạn"
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {/* Toolbar - 1 hàng */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <StoreFilters
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

          <StoreTable
            stores={stores}
            isLoading={isLoading}
            onViewDetail={handleViewDetail}
          />
        </CardContent>
      </Card>
    </div>
  );
}
