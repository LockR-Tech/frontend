import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { NotificationStatus } from "~/types/admin/enums";
import {
  useGetAllNotificationsQuery,
  useDeleteNotificationMutation,
  useMarkAdminNotificationReadMutation,
  useResendNotificationMutation,
} from "@/stores/apis/admin/notifications";
import { useGetAllUsersQuery } from "@/stores/apis/admin/users";
import type { AdminNotificationResponse } from "~/types/admin/notification";
import { parseBackendDateTime } from "~/lib/datetime";
import { extractList } from "~/lib/extract-list";
import { notificationErrorMessage, notificationTypeLabel } from "../notification-meta";

export type NotificationStatusFilter = "ALL" | NotificationStatus;

/** Dòng bảng: NotificationResponse + tên người nhận ghép từ danh sách người dùng. */
export type NotificationRow = Omit<AdminNotificationResponse, "type" | "status"> & {
  type: string;
  status: NotificationStatus;
};

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  /** Phút trung bình từ lúc tạo tới lúc đọc; null khi chưa có thông báo nào được đọc. */
  averageReadMinutes: number | null;
}

export function useNotifications() {
  const [statusFilter, setStatusFilterState] = useState<NotificationStatusFilter>("ALL");
  const [typeFilter, setTypeFilterState] = useState<string>("ALL");
  const [searchQuery, setSearchQueryState] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Math.max(0, Number(urlParams.get("page") ?? "0") || 0);
  const pageSize = Math.max(1, Number(urlParams.get("size") ?? "10") || 10);
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });
  const resetPage = () => {
    if (page !== 0) setPage(0);
  };
  const setStatusFilter = (v: NotificationStatusFilter) => {
    setStatusFilterState(v);
    resetPage();
  };
  const setTypeFilter = (v: string) => {
    setTypeFilterState(v);
    resetPage();
  };
  const setSearchQuery = (v: string) => {
    setSearchQueryState(v);
    resetPage();
  };

  // GET /api/admin/notifications trả toàn bộ (List) — lọc/phân trang tại client.
  const { data, isLoading, refetch } = useGetAllNotificationsQuery({});

  const [deleteNotification, { isLoading: isDeleting }] = useDeleteNotificationMutation();
  const [markRead] = useMarkAdminNotificationReadMutation();
  const [resendNotification] = useResendNotificationMutation();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  // notification-service chỉ có `userId` → ghép tên/email từ danh sách người dùng.
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

  const allNotifications: NotificationRow[] = useMemo(
    () =>
      extractList<AdminNotificationResponse & { isRead?: boolean }>(data?.data).map((n) => {
        const recipientId = n.recipientId ?? n.userId;
        const matched = recipientId != null ? userById.get(recipientId) : undefined;
        const status =
          n.status === NotificationStatus.READ || (!n.status && n.isRead)
            ? NotificationStatus.READ
            : NotificationStatus.UNREAD;
        return {
          ...n,
          type: n.type ?? "SYSTEM",
          status,
          recipientId,
          recipientName: n.recipientName ?? matched?.name,
          recipientEmail: n.recipientEmail ?? matched?.email,
        };
      }),
    [data, userById],
  );

  // Danh sách loại lọc dựng từ dữ liệu thật (type là chuỗi tự do ở backend).
  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of allNotifications) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: notificationTypeLabel(value), count }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [allNotifications]);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allNotifications.filter((n) => {
      if (statusFilter !== "ALL" && n.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && n.type !== typeFilter) return false;
      if (!query) return true;
      return (
        (n.title ?? "").toLowerCase().includes(query) ||
        (n.recipientName ?? "").toLowerCase().includes(query) ||
        (n.message ?? "").toLowerCase().includes(query) ||
        (n.recipientEmail ?? "").toLowerCase().includes(query) ||
        String(n.id).includes(query)
      );
    });
  }, [allNotifications, searchQuery, statusFilter, typeFilter]);

  const stats: NotificationStats = useMemo(() => {
    let read = 0;
    let readTimeSum = 0;
    let readTimeCount = 0;
    for (const n of allNotifications) {
      if (n.status === NotificationStatus.READ) read += 1;
      const created = parseBackendDateTime(n.createdAt);
      const readAt = parseBackendDateTime(n.readAt ?? null);
      if (created && readAt && readAt >= created) {
        readTimeSum += (readAt.getTime() - created.getTime()) / 60000;
        readTimeCount += 1;
      }
    }
    return {
      total: allNotifications.length,
      unread: allNotifications.length - read,
      read,
      averageReadMinutes: readTimeCount > 0 ? Math.round(readTimeSum / readTimeCount) : null,
    };
  }, [allNotifications]);

  const totalElements = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const pagedNotifications = useMemo(
    () => filteredNotifications.slice(page * pageSize, (page + 1) * pageSize),
    [filteredNotifications, page, pageSize],
  );

  useEffect(() => {
    if (!isLoading && page > 0 && page >= totalPages) {
      setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(totalPages - 1)); return next; });
    }
  }, [isLoading, page, totalPages, setUrlParams]);

  const clearFilters = () => {
    setStatusFilterState("ALL");
    setTypeFilterState("ALL");
    setSearchQueryState("");
    setPage(0);
  };

  const hasActiveFilters = statusFilter !== "ALL" || typeFilter !== "ALL" || searchQuery !== "";

  const withPending = async (id: number, action: () => Promise<void>) => {
    if (pendingIds.has(id)) return;
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      await action();
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  /** Trả true khi xoá được (để đóng hộp xác nhận). */
  const handleDelete = async (id: number): Promise<boolean> => {
    try {
      await deleteNotification(id).unwrap();
      toast.success("Đã xoá thông báo");
      return true;
    } catch (err) {
      toast.error("Không xoá được thông báo", {
        description: notificationErrorMessage(err, "Vui lòng thử lại."),
      });
      return false;
    }
  };

  const handleMarkRead = (id: number) =>
    withPending(id, async () => {
      try {
        await markRead(id).unwrap();
        toast.success("Đã đánh dấu đã đọc");
      } catch (err) {
        toast.error("Không đánh dấu được", {
          description: notificationErrorMessage(err, "Vui lòng thử lại."),
        });
      }
    });

  const handleResend = (id: number) =>
    withPending(id, async () => {
      try {
        await resendNotification(id).unwrap();
        toast.success("Đã gửi lại thông báo");
      } catch (err) {
        toast.error("Không gửi lại được thông báo", {
          description: notificationErrorMessage(err, "Vui lòng thử lại."),
        });
      }
    });

  return {
    notifications: pagedNotifications,
    totalElements,
    totalPages,
    stats,
    isLoading,
    isDeleting,
    pendingIds,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    typeOptions,
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
    handleMarkRead,
    handleResend,
  };
}
