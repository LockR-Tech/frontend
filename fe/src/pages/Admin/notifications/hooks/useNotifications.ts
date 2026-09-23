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
import type {
  AdminNotificationResponse,
  NotificationStatsResponse,
} from "~/types/admin/notification";
import { parseBackendDateTime } from "~/lib/datetime";
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

  // `GET /api/admin/notifications` chỉ nhận `userId`, mọi tham số status/type/
  // channel gửi lên đều bị bỏ qua — nên phải lọc tại client, nếu không ba bộ
  // lọc trên giao diện không có tác dụng gì.
  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allNotifications.filter((n) => {
      if (statusFilter !== "ALL" && n.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && n.type !== typeFilter) return false;
      if (channelFilter !== "ALL" && n.channel !== channelFilter) return false;
      if (!query) return true;
      return (
        n.title.toLowerCase().includes(query) ||
        (n.recipientName ?? "").toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        (n.recipientEmail ?? "").toLowerCase().includes(query) ||
        String(n.id).includes(query)
      );
    });
  }, [allNotifications, searchQuery, statusFilter, typeFilter, channelFilter]);

  // `GET /api/admin/notifications` trả cả danh sách (không phân trang), nên
  // thống kê tính được ngay tại client. Trước đây hook trả `stats: undefined`
  // khiến toàn bộ thẻ số liệu hiện 0.
  const stats: NotificationStatsResponse = useMemo(() => {
    const byStatus = (s: NotificationStatus) =>
      allNotifications.filter((n) => n.status === s).length;

    const notificationsByType: Record<string, number> = {};
    const notificationsByChannel: Record<string, number> = {};
    let readTimeSum = 0;
    let readTimeCount = 0;

    for (const n of allNotifications) {
      notificationsByType[n.type] = (notificationsByType[n.type] ?? 0) + 1;
      if (n.channel) {
        notificationsByChannel[n.channel] =
          (notificationsByChannel[n.channel] ?? 0) + 1;
      }
      const created = parseBackendDateTime(n.createdAt);
      const read = parseBackendDateTime(n.readAt ?? null);
      if (created && read && read >= created) {
        readTimeSum += (read.getTime() - created.getTime()) / 60000;
        readTimeCount += 1;
      }
    }

    const total = allNotifications.length;
    const sent = allNotifications.filter((n) => n.sentAt).length;

    return {
      totalNotifications: total,
      unreadCount: byStatus(NotificationStatus.UNREAD),
      readCount: byStatus(NotificationStatus.READ),
      archivedCount: byStatus(NotificationStatus.ARCHIVED),
      notificationsByType,
      notificationsByChannel,
      deliveryRate: total > 0 ? sent / total : 0,
      averageReadTime:
        readTimeCount > 0 ? Math.round(readTimeSum / readTimeCount) : 0,
    };
  }, [allNotifications]);

  // Backend không phân trang nên cắt trang ở client; trước đây `totalPages`
  // cứng bằng 1 làm thanh phân trang vô dụng và số tổng chỉ đếm 1 trang.
  const totalElements = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const pagedNotifications = useMemo(
    () => filteredNotifications.slice(page * pageSize, (page + 1) * pageSize),
    [filteredNotifications, page, pageSize],
  );

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
    notifications: pagedNotifications,
    totalElements,
    totalPages,
    stats,
    isLoading,
    isLoadingStats: isLoading,
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
