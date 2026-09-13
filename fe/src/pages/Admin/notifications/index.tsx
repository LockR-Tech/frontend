import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Megaphone } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { TableToolbar } from "~/components/shared/data-table";
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
import { useNotifications } from "./hooks/useNotifications";
import {
  NotificationStatus,
  NotificationType,
  NotificationChannel,
} from "~/types/admin/enums";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    notifications,
    totalElements,
    isLoading,
    isLoadingStats,
    stats,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    channelFilter,
    setChannelFilter,
    searchQuery,
    setSearchQuery,
    refetch,
    clearFilters,
    hasActiveFilters,
    handleDelete,
    handleUpdateStatus,
    handleResend,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
  } = useNotifications();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t("admin.notifications.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.notifications.description")} • {totalElements}{" "}
            {t("admin.notifications.title").toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBroadcastModal(true)}
            className="gap-1.5"
          >
            <Megaphone size={14} />
            {t("admin.notifications.broadcastBtn")}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5"
          >
            <Plus size={14} />
            {t("admin.notifications.createBtn")}
          </Button>
        </div>
      </div>

      <NotificationStats stats={stats} isLoading={isLoadingStats} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
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
                  <SelectItem value={NotificationStatus.ARCHIVED}>
                    {t("admin.notifications.status.archived")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
              >
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue
                    placeholder={t("admin.notifications.filter.type")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("admin.notifications.filter.allTypes")}
                  </SelectItem>
                  <SelectItem value={NotificationType.ORDER_CREATED}>
                    {t("admin.notifications.type.orderCreated")}
                  </SelectItem>
                  <SelectItem value={NotificationType.ORDER_CONFIRMED}>
                    {t("admin.notifications.type.orderConfirmed")}
                  </SelectItem>
                  <SelectItem value={NotificationType.ORDER_READY}>
                    {t("admin.notifications.type.orderReady")}
                  </SelectItem>
                  <SelectItem value={NotificationType.ORDER_COMPLETED}>
                    {t("admin.notifications.type.orderCompleted")}
                  </SelectItem>
                  <SelectItem value={NotificationType.ORDER_CANCELLED}>
                    {t("admin.notifications.type.orderCancelled")}
                  </SelectItem>
                  <SelectItem value={NotificationType.PAYMENT_SUCCESSFUL}>
                    {t("admin.notifications.type.paymentSuccessful")}
                  </SelectItem>
                  <SelectItem value={NotificationType.PAYMENT_FAILED}>
                    {t("admin.notifications.type.paymentFailed")}
                  </SelectItem>
                  <SelectItem value={NotificationType.PROMOTION}>
                    {t("admin.notifications.type.promotion")}
                  </SelectItem>
                  <SelectItem value={NotificationType.SYSTEM_ALERT}>
                    {t("admin.notifications.type.systemAlert")}
                  </SelectItem>
                  <SelectItem value={NotificationType.LOYALTY_POINTS_EARNED}>
                    {t("admin.notifications.type.loyaltyPointsEarned")}
                  </SelectItem>
                  <SelectItem value={NotificationType.LOYALTY_REWARD_UNLOCKED}>
                    {t("admin.notifications.type.loyaltyRewardUnlocked")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={channelFilter}
                onValueChange={(v) =>
                  setChannelFilter(v as typeof channelFilter)
                }
              >
                <SelectTrigger className="h-9 w-32 text-sm">
                  <SelectValue
                    placeholder={t("admin.notifications.filter.channel")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("admin.notifications.filter.allChannels")}
                  </SelectItem>
                  <SelectItem value={NotificationChannel.IN_APP}>
                    {t("admin.notifications.channel.inApp")}
                  </SelectItem>
                  <SelectItem value={NotificationChannel.EMAIL}>
                    {t("admin.notifications.channel.email")}
                  </SelectItem>
                  <SelectItem value={NotificationChannel.PUSH}>
                    {t("admin.notifications.channel.push")}
                  </SelectItem>
                  <SelectItem value={NotificationChannel.SMS}>
                    {t("admin.notifications.channel.sms")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TableToolbar
              onRefresh={refetch}
              onClearFilters={clearFilters}
              canClearFilters={hasActiveFilters}
            />
          </div>

          <NotificationTable
            notifications={notifications}
            isLoading={isLoading}
            onDelete={handleDelete}
            onUpdateStatus={handleUpdateStatus}
            onResend={handleResend}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => {
          setShowBroadcastModal(false);
          refetch();
        }}
      />

      <CreateNotificationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />
    </div>
  );
}
