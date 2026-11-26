import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Megaphone } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { BatchDeleteBar, DeleteReasonDialog, TableToolbar, useRowSelection } from "~/components/shared/data-table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { NotificationTable } from "./components/NotificationTable";
import { NotificationStats } from "./components/NotificationStats";
import { BroadcastModal } from "./components/BroadcastModal";
import { CreateNotificationModal } from "./components/CreateNotificationModal";
import { useNotifications, type NotificationRow } from "./hooks/useNotifications";
import { NotificationStatus } from "~/types/admin/enums";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationRow | null>(null);

  const {
    notifications,
    totalElements,
    isLoading,
    isStatsLoading,
    isDeleting,
    pendingIds,
    stats,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    typeOptions,
    searchQuery,
    setSearchQuery,
    refetch,
    clearFilters,
    hasActiveFilters,
    handleDelete,
    handleMarkRead,
    handleResend,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    deleteSelected,
    deleteAllMatching,
  } = useNotifications();

  const selection = useRowSelection(notifications);
  const deleteSelectedRows = async (reason: string) => {
    const result = await deleteSelected(selection.selectedIds, reason);
    selection.remove(result.deleted);
    return result;
  };
  const deleteAllRows = async (reason: string) => {
    const result = await deleteAllMatching(reason);
    selection.clear();
    return result;
  };

  const confirmDelete = async (reason: string) => {
    if (!deleteTarget) return;
    if (await handleDelete(deleteTarget.id, reason)) setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t("admin.notifications.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.notifications.description")} •{" "}
            {t("admin.notifications.countLabel", { count: totalElements })}
          </p>
        </div>
        <div data-tour="notifications-actions" className="flex items-center gap-2">
          <Button
            data-tour="notifications-broadcast-btn"
            variant="outline"
            size="sm"
            onClick={() => setShowBroadcastModal(true)}
            className="gap-1.5"
          >
            <Megaphone size={14} />
            {t("admin.notifications.broadcastBtn")}
          </Button>
          <Button
            data-tour="notifications-create-btn"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5"
          >
            <Plus size={14} />
            {t("admin.notifications.createBtn")}
          </Button>
        </div>
      </div>

      <div data-tour="notifications-stats">
        <NotificationStats stats={stats} isLoading={isStatsLoading} />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div data-tour="notifications-filters" className="flex flex-wrap items-center gap-3">
              <Input
                placeholder={t("admin.notifications.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-56 text-sm"
              />

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="h-9 w-36 text-sm">
                  <SelectValue
                    placeholder={t("admin.notifications.filter.status")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("admin.notifications.filter.allStatus")}
                  </SelectItem>
                  <SelectItem value={NotificationStatus.UNREAD}>
                    {t("admin.notifications.status.unread")}
                  </SelectItem>
                  <SelectItem value={NotificationStatus.READ}>
                    {t("admin.notifications.status.read")}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Loại lọc lấy từ thống kê của mọi thông báo */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-48 text-sm">
                  <SelectValue
                    placeholder={t("admin.notifications.filter.type")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("admin.notifications.filter.allTypes")}
                  </SelectItem>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} ({opt.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div data-tour="notifications-toolbar">
              <TableToolbar
                onRefresh={refetch}
                onClearFilters={clearFilters}
                canClearFilters={hasActiveFilters}
              />
            </div>
          </div>

          <div data-tour="notifications-batch">
            <BatchDeleteBar
              noun={t("admin.notifications.batchNoun")}
              selectedCount={selection.selectedIds.length}
              onClearSelection={selection.clear}
              onDeleteSelected={deleteSelectedRows}
              allCount={totalElements}
              onDeleteAll={deleteAllRows}
              requireReason
            />
          </div>

          <div data-tour="notifications-table">
            <NotificationTable
              selectColumn={selection.selectColumn}
              notifications={notifications}
              isLoading={isLoading}
              pendingIds={pendingIds}
              onDelete={setDeleteTarget}
              onMarkRead={(id) => void handleMarkRead(id)}
              onResend={(id) => void handleResend(id)}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              totalElements={totalElements}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
      />

      <CreateNotificationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <DeleteReasonDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("admin.notifications.deleteDialog.title")}
        description={
          <p>
            {t("admin.notifications.deleteDialog.desc", {
              id: deleteTarget?.id,
              title: deleteTarget?.title,
            })}
          </p>
        }
        actionLabel={t("common.delete")}
        loading={isDeleting}
        onConfirm={(reason) => void confirmDelete(reason)}
      />
    </div>
  );
}
