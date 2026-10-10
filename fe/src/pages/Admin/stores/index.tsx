import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { TableToolbar } from "~/components/shared/data-table";
import { ConfirmActionDialog } from "~/pages/Admin/knowledge/ConfirmActionDialog";
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
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    isDeleting,
    handleToggleStatus,
    statusPendingIds,
    storeRevenue,
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

  const deleteStats = deleteTarget ? storeRevenue.byStoreId.get(deleteTarget.id) : undefined;

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

          {storeRevenue.error && (
            <p className="text-xs text-muted-foreground mb-3">
              Không tải được số tủ/số đơn theo cửa hàng: {storeRevenue.error.message}
            </p>
          )}

          <StoreTable
            stores={stores}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
            onToggleStatus={handleToggleStatus}
            statusPendingIds={statusPendingIds}
            revenueByStoreId={storeRevenue.byStoreId}
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

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xoá cửa hàng?"
        description={
          <>
            <p>
              Cửa hàng{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span> sẽ bị
              xoá vĩnh viễn.
            </p>
            <p>
              Các tủ (Kiosk) đang gắn với cửa hàng này phải được chuyển sang cửa hàng khác
              trước khi xoá
              {deleteStats && deleteStats.lockerCount > 0
                ? ` — hiện còn ${deleteStats.lockerCount} tủ đang gắn.`
                : "."}
            </p>
          </>
        }
        actionLabel="Xoá cửa hàng"
        destructive
        loading={isDeleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
