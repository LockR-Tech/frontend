import { useState, useMemo } from "react";
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} from "@/stores/apis/notificationApi";

export interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useGetNotificationsQuery({ page: 0, size: 20 });

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const [markAsReadMutation] = useMarkNotificationAsReadMutation();
  const [markAllAsReadMutation] = useMarkAllNotificationsAsReadMutation();

  // Extract notifications from paginated response
  const notifications: Notification[] = useMemo(() => {
    if (!response) return [];
    // Handle both array and paginated response
    const list = Array.isArray(response) ? response : response.content || [];
    return list.map((n: any) => ({
      id: n.id,
      title: n.title || "Thông báo",
      message: n.message || n.content || "",
      isRead: n.isRead || false,
      createdAt: n.createdAt || new Date().toISOString(),
    }));
  }, [response]);

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsReadMutation(id).unwrap();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation().unwrap();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return {
    notifications: filteredNotifications,
    unreadCount,
    filter,
    setFilter,
    isLoading,
    error,
    refetch,
    handleMarkAsRead,
    handleMarkAllAsRead,
  };
}
