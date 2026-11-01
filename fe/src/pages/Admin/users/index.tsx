import { useCallback, useRef, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "~/components/shared/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { BatchDeleteBar, TableToolbar, deleteMany, useRowSelection } from "~/components/shared/data-table";
import { useAuth } from "~/context/auth-context";
import { UserTable } from "./components/UserTable";
import { UserFilters } from "./components/UserFilters";
import { UserStats } from "./components/UserStats";
import { CreateUserModal } from "./components/CreateUserModal";
import { useUsers, type AdminUserRow, type UserSegment } from "./hooks/useUsers";

const SEGMENT_LABEL: Record<UserSegment, string> = {
  CUSTOMER: "admin.users.stats.segment.customer",
  STAFF: "admin.users.stats.segment.staff",
  ACTIVE: "admin.users.stats.active",
  INACTIVE: "admin.users.stats.inactive",
  NEW_THIS_MONTH: "admin.users.stats.newThisMonth",
  EMAIL_VERIFIED: "admin.users.stats.emailVerified",
  TERMS_ACCEPTED: "admin.users.stats.termsAccepted",
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const {
    users,
    isLoading,
    status,
    setStatus,
    segment,
    setSegment,
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

  const listRef = useRef<HTMLDivElement>(null);
  const showSegment = (value: UserSegment | null) => {
    setSegment(value);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.users.title")}
        description={t("admin.users.description")}
      />

      <UserStats stats={stats} isLoading={isLoading} segment={segment} onSelect={showSegment} />

      <Card ref={listRef} className="scroll-mt-20 border-0 shadow-sm">
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

          {segment && (
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {t("admin.users.stats.segment.showing", {
                  label: t(SEGMENT_LABEL[segment]),
                  count: totalElements,
                })}
              </span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => showSegment(null)}>
                <X className="mr-1 h-3.5 w-3.5" />
                {t("admin.users.stats.segment.clear")}
              </Button>
            </div>
          )}

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
