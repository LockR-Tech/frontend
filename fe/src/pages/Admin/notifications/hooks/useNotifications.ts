import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { NotificationStatus } from "~/types/admin/enums";
import {
  useBulkDeleteNotificationsMutation,
  useDeleteNotificationMutation,
  useGetNotificationStatsQuery,
  useMarkAdminNotificationReadMutation,
  useResendNotificationMutation,
  useSearchNotificationsQuery,
  type BulkDeleteNotificationsBody,
  type SearchNotificationsParams,
} from "@/stores/apis/admin/notifications";
import { useGetAllUsersQuery } from "@/stores/apis/admin/users";
import type { AdminNotificationResponse } from "~/types/admin/notification";
import type { DeleteManyResult } from "~/components/shared/data-table";
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

/** Chờ người dùng ngừng gõ rồi mới tìm ở backend. */
const SEARCH_DELAY_MS = 300;
/** Số người nhận tối đa (khớp tên/email) gửi kèm khi tìm. */
const MAX_RECIPIENT_MATCHES = 200;

export function useNotifications() {
  const { t, i18n } = useTranslation();
  const [statusFilter, setStatusFilterState] = useState<NotificationStatusFilter>("ALL");
  const [typeFilter, setTypeFilterState] = useState<string>("ALL");
  const [searchQuery, setSearchQueryState] = useState("");
  const [search, setSearch] = useState("");
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

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchQuery.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(handle);
  }, [searchQuery]);

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

  // Tìm theo tên/email người nhận: tra mã người nhận ở đây rồi gửi kèm, backend gộp với tìm theo chữ.
  const recipientIds = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return [];
    const ids: number[] = [];
    for (const [id, u] of userById) {
      if (u.name.toLowerCase().includes(query) || (u.email ?? "").toLowerCase().includes(query)) {
        ids.push(id);
        if (ids.length >= MAX_RECIPIENT_MATCHES) break;
      }
    }
    return ids;
  }, [search, userById]);

  const filterArgs = useMemo(
    () => ({
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
      ...(search ? { search } : {}),
      ...(recipientIds.length ? { recipientIds } : {}),
    }),
    [statusFilter, typeFilter, search, recipientIds],
  );
  const queryArgs: SearchNotificationsParams = useMemo(
    () => ({ page, size: pageSize, ...filterArgs }),
    [page, pageSize, filterArgs],
  );

  const { data, isLoading, isFetching, refetch } = useSearchNotificationsQuery(queryArgs);
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useGetNotificationStatsQuery();

  const [deleteNotification, { isLoading: isDeleting }] = useDeleteNotificationMutation();
  const [bulkDelete] = useBulkDeleteNotificationsMutation();
  const [markRead] = useMarkAdminNotificationReadMutation();
  const [resendNotification] = useResendNotificationMutation();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const pageData = data?.data;
  const notifications: NotificationRow[] = useMemo(
    () =>
      (pageData?.content ?? []).map((n) => {
        const recipientId = n.recipientId ?? n.userId;
        const matched = recipientId != null ? userById.get(recipientId) : undefined;
        const raw = n as AdminNotificationResponse & { isRead?: boolean };
        const status =
          raw.status === NotificationStatus.READ || (!raw.status && raw.isRead)
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
    [pageData, userById],
  );

  // Loại lọc lấy từ thống kê của mọi thông báo (type là chuỗi tự do ở backend).
  const statsPayload = statsData?.data;
  const typeOptions = useMemo(
    () =>
      (statsPayload?.types ?? [])
        .filter((row) => row.type)
        .map((row) => ({ value: row.type, label: notificationTypeLabel(row.type), count: row.count }))
        .sort((a, b) => a.label.localeCompare(b.label, i18n.language)),
    // `t` đổi khi đổi ngôn ngữ → dựng lại nhãn.
    [statsPayload, t, i18n.language],
  );

  const stats: NotificationStats = {
    total: statsPayload?.total ?? 0,
    unread: statsPayload?.unread ?? 0,
    read: statsPayload?.read ?? 0,
    averageReadMinutes: statsPayload?.averageReadMinutes ?? null,
  };

  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = Math.max(1, pageData?.totalPages ?? 1);

  useEffect(() => {
    if (!isFetching && page > 0 && page >= totalPages) {
      setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(totalPages - 1)); return next; });
    }
  }, [isFetching, page, totalPages, setUrlParams]);

  const clearFilters = () => {
    setStatusFilterState("ALL");
    setTypeFilterState("ALL");
    setSearchQueryState("");
    setSearch("");
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
  const handleDelete = async (id: number, reason: string): Promise<boolean> => {
    try {
      await deleteNotification({ id, reason }).unwrap();
      toast.success(t("admin.notifications.toast.deleted"));
      return true;
    } catch (err) {
      toast.error(t("admin.notifications.toast.deleteFailed"), {
        description: notificationErrorMessage(err, t("common.pleaseRetry")),
      });
      return false;
    }
  };

  /// Xoá mềm hàng loạt bằng một lệnh. Lỗi cả lệnh ⇒ mọi mục coi là không xoá được, kèm lý do backend.
  const runBulkDelete = async (
    body: BulkDeleteNotificationsBody,
    requestedIds: number[] | null,
  ): Promise<DeleteManyResult> => {
    try {
      const res = await bulkDelete(body).unwrap();
      const deleted = res.data ?? [];
      const done = new Set(deleted);
      const failed = (requestedIds ?? [])
        .filter((id) => !done.has(id))
        .map((id) => ({ id, message: t("admin.notifications.toast.alreadyDeleted") }));
      return { deleted, failed };
    } catch (err) {
      const message = notificationErrorMessage(err, t("common.pleaseRetry"));
      const ids = requestedIds ?? [];
      return { deleted: [], failed: ids.length ? ids.map((id) => ({ id, message })) : [{ id: 0, message }] };
    }
  };

  const deleteSelected = (ids: number[], reason: string) => runBulkDelete({ ids, reason }, ids);
  const deleteAllMatching = (reason: string) => runBulkDelete({ all: true, ...filterArgs, reason }, null);

  const handleMarkRead = (id: number) =>
    withPending(id, async () => {
      try {
        await markRead(id).unwrap();
        toast.success(t("admin.notifications.toast.markedRead"));
      } catch (err) {
        toast.error(t("admin.notifications.toast.markReadFailed"), {
          description: notificationErrorMessage(err, t("common.pleaseRetry")),
        });
      }
    });

  const handleResend = (id: number) =>
    withPending(id, async () => {
      try {
        await resendNotification(id).unwrap();
        toast.success(t("admin.notifications.toast.resent"));
      } catch (err) {
        toast.error(t("admin.notifications.toast.resendFailed"), {
          description: notificationErrorMessage(err, t("common.pleaseRetry")),
        });
      }
    });

  return {
    notifications,
    deleteSelected,
    deleteAllMatching,
    totalElements,
    totalPages,
    stats,
    isLoading,
    isStatsLoading,
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
    refetch: () => {
      void refetch();
      void refetchStats();
    },
    clearFilters,
    hasActiveFilters,
    handleDelete,
    handleMarkRead,
    handleResend,
  };
}
