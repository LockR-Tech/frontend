import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { TableToolbar } from "~/components/shared/data-table";
import { StoreTable } from "./components/StoreTable";
import { StoreFilters } from "./components/StoreFilters";
import { StoreModal } from "./components/StoreModal";
import { useStores } from "./hooks/useStores";

export default function StoresPage() {
  const { t } = useTranslation();
  const {
    stores,
    isLoading,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    statusCounts,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    selectedStore,
    handleCreate,
    handleEdit,
    handleDelete,
    refetch,
    clearFilters,
    hasActiveFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalElements,
  } = useStores();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.stores.title")}
        description={t("admin.stores.description")}
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
              createButton={{
                label: t("admin.stores.addStore"),
                onClick: handleCreate,
                icon: Plus,
              }}
              onRefresh={refetch}
              onClearFilters={clearFilters}
              canClearFilters={hasActiveFilters}
            />
          </div>

          <StoreTable
            stores={stores}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <StoreModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="create"
      />

      <StoreModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        store={selectedStore}
        mode="edit"
      />
    </div>
  );
}
