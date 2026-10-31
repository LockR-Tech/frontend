import { useCallback, useState } from "react";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { BatchDeleteBar, TableToolbar, deleteMany, useRowSelection } from "~/components/shared/data-table";
import { useAuth } from "~/context/auth-context";
import { UserTable } from "./components/UserTable";
import { UserFilters } from "./components/UserFilters";
import { UserStats } from "./components/UserStats";
import { CreateUserModal } from "./components/CreateUserModal";
import { useUsers, type AdminUserRow } from "./hooks/useUsers";

export default function UsersPage() {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const {
    users,
    isLoading,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    statusCounts,
    stats,
    refetch,
    clearFilters,
    hasActiveFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalElements,
    deleteOne,
  } = useUsers();

  // Không cho tích tài khoản của chính mình; admin khác xoá được.
  const { user: me } = useAuth();
  const canSelect = useCallback((row: AdminUserRow) => String(row.id) !== me?.id, [me?.id]);
  const selection = useRowSelection(users, canSelect);
  const deleteIds = async (ids: number[], reason: string) => {
    const result = await deleteMany(ids, (id) => deleteOne(id, reason));
    selection.remove(result.deleted);
    return result;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.users.title")}
        description={t("admin.users.description")}
      />

      <UserStats stats={stats} isLoading={isLoading} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {/* Toolbar - 1 hàng */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <UserFilters
              status={status}
              onStatusChange={setStatus}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusCounts={statusCounts}
            />

            <TableToolbar
              createButton={{
                label: t("admin.users.addUser"),
                onClick: () => setShowCreateModal(true),
                icon: UserPlus,
              }}
              onRefresh={refetch}
              onClearFilters={clearFilters}
              canClearFilters={hasActiveFilters}
            />
          </div>

          <BatchDeleteBar
            noun={t("admin.users.batchNoun")}
            selectedCount={selection.selectedIds.length}
            onClearSelection={selection.clear}
            onDeleteSelected={(reason) => deleteIds(selection.selectedIds, reason)}
            note={t("admin.users.batchNote")}
            requireReason
          />

          <UserTable
            selectColumn={selection.selectColumn}
            users={users}
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

      <CreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
