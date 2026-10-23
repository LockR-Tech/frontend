import { useTranslation } from "react-i18next";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { TableToolbar } from "~/components/shared/data-table";
import { LockerTable } from "./components/LockerTable";
import { LockerFilters } from "./components/LockerFilters";
import { useLockers } from "./hooks/useLockers";

export default function LockersPage() {
  const { t } = useTranslation();
  const {
    lockers,
    isLoading,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    storeFilter,
    setStoreFilter,
    storeOptions,
    technicianFilter,
    setTechnicianFilter,
    technicianOptions,
    unassignedCount,
    totalLockers,
    statusCounts,
    handleMaintenance,
    handleActivate,
    handleDeleteLocker,
    handleDeleteBatchLockers,
    handleDeleteAllLockers,
    isDeleting,
    refetch,
    clearFilters,
    hasActiveFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalElements,
  } = useLockers();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.lockers.title")}
        description={t("admin.lockers.description")}
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {/* Toolbar - 1 hàng */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <LockerFilters
              status={status}
              onStatusChange={setStatus}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusCounts={statusCounts}
              storeFilter={storeFilter}
              onStoreFilterChange={setStoreFilter}
              storeOptions={storeOptions}
              technicianFilter={technicianFilter}
              onTechnicianFilterChange={setTechnicianFilter}
              technicianOptions={technicianOptions}
              unassignedCount={unassignedCount}
              totalLockers={totalLockers}
            />

            <TableToolbar
              onRefresh={refetch}
              onClearFilters={clearFilters}
              canClearFilters={hasActiveFilters}
            />
          </div>

          <LockerTable
            lockers={lockers}
            isLoading={isLoading}
            onMaintenance={handleMaintenance}
            onActivate={handleActivate}
            onDelete={handleDeleteLocker}
            onDeleteBatch={handleDeleteBatchLockers}
            onDeleteAll={handleDeleteAllLockers}
            isDeleting={isDeleting}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}
