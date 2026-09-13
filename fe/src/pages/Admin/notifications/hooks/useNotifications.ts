import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  NotificationStatus,
  NotificationType,
  NotificationChannel,
} from "~/types/admin/enums";
import {
  useGetAllNotificationsQuery,
  useDeleteNotificationMutation,
} from "@/stores/apis/admin/notifications";
import { useGetAllUsersQuery } from "@/stores/apis/admin/users";
import type { AdminNotificationResponse } from "~/types/admin/notification";
import { extractList } from "~/lib/extract-list";

export type NotificationStatusFilter = "ALL" | NotificationStatus;
export type NotificationTypeFilter = "ALL" | NotificationType;
export type NotificationChannelFilter = "ALL" | NotificationChannel;

export function useNotifications() {
  const [statusFilter, setStatusFilter] =
    useState<NotificationStatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>("ALL");
  const [channelFilter, setChannelFilter] =
    useState<NotificationChannelFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Number(urlParams.get("page") ?? "0");
  const pageSize = Number(urlParams.get("size") ?? "10");
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });

  const { data, isLoading, refetch } = useGetAllNotificationsQuery({
    page,
    size: pageSize,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
    ...(channelFilter !== "ALL" ? { channel: channelFilter } : {}),
  });

  const [deleteNotification, { isLoading: isDeleting }] =
    useDeleteNotificationMutation();

  // Join recipient names from the users list (notification-service only carries
  // `userId`, no name/email).
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const userById = useMemo(() => {
    const m = new Map<number, { name: string; email?: string }>();
    for (const u of extractList<{
      id: number;
      fullName?: string;
      email?: string;
    }>(usersData?.data)) {
      m.set(u.id, { name: u.fullName || u.email || `#${u.id}`, email: u.email });
    }
    return m;
  }, [usersData]);

  const allNotifications: AdminNotificationResponse[] = useMemo(
    () =>
      extractList<AdminNotificationResponse>(data?.data).map((n) => {
        const recipientId = n.recipientId ?? n.userId;
        const matched =
          recipientId != null ? userById.get(recipientId) : undefined;
        return {
          ...n,
          recipientId,
          recipientName: n.recipientName ?? matched?.name,
          recipientEmail: n.recipientEmail ?? matched?.email,
        };
      }),
    [data, userById],
  );

  const filteredNotifications = useMemo(() => {
    if (!searchQuery) return allNotifications;
    const query = searchQuery.toLowerCase();
    return allNotifications.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        (n.recipientName ?? "").toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.recipientEmail?.toLowerCase().includes(query) ||
        String(n.id).includes(query),
    );
  }, [allNotifications, searchQuery]);

  const clearFilters = () => {
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setChannelFilter("ALL");
    setSearchQuery("");
    setPage(0);
  };

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    channelFilter !== "ALL" ||
    searchQuery !== "";

  const handleDelete = async (id: number) => {
    await deleteNotification(id).unwrap();
  };

  return {
    notifications: filteredNotifications,
    totalElements: filteredNotifications.length,
    totalPages: 1,
    stats: undefined,
    isLoading,
    isLoadingStats: false,
    isDeleting,
    isBulkDeleting: false,
    isUpdatingStatus: false,
    isResending: false,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    channelFilter,
    setChannelFilter,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetch,
    clearFilters,
    hasActiveFilters,
    handleDelete,
    handleBulkDelete: async (_ids: number[]) => {},
    handleUpdateStatus: async (_id: number, _status: NotificationStatus) => {},
    handleResend: async (_id: number) => {},
  };
}
