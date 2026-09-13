import { baseApi } from "../baseAPi";

// ============================================
// Types
// ============================================

export interface Notification {
  id: number;
  type: "ORDER" | "PAYMENT" | "SYSTEM" | "STAFF" | "INFO" | "WARNING";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  orderId?: number;
  userId?: number;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface UnreadCountResponse {
  count: number;
}

interface GetNotificationsParams {
  page?: number;
  size?: number;
}

// ============================================
// Polling Configuration
// ============================================

/** Polling interval: 30 seconds for notifications */
export const NOTIFICATION_POLLING_INTERVAL = 30_000;

// ============================================
// Notification API Endpoints
// ============================================

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============================================
    // Get All Notifications (Paginated)
    // ============================================
    getNotifications: builder.query<
      PaginatedResponse<Notification>,
      GetNotificationsParams
    >({
      query: ({ page = 0, size = 50 }) =>
        `/api/notifications?page=${page}&size=${size}`,
      transformResponse: (
        response: ApiResponse<PaginatedResponse<Notification>>,
      ) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.content.map(({ id }) => ({
                type: "Notifications" as const,
                id,
              })),
              { type: "Notifications", id: "LIST" },
            ]
          : [{ type: "Notifications", id: "LIST" }],
    }),

    // ============================================
    // Get All Notifications (No Pagination)
    // ============================================
    getAllNotifications: builder.query<Notification[], void>({
      query: () => "/api/notifications/all",
      transformResponse: (response: ApiResponse<Notification[]>) =>
        response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "Notifications" as const,
                id,
              })),
              { type: "Notifications", id: "LIST" },
            ]
          : [{ type: "Notifications", id: "LIST" }],
    }),

    // ============================================
    // Get Unread Notifications
    // ============================================
    getUnreadNotifications: builder.query<Notification[], void>({
      query: () => "/api/notifications/unread",
      transformResponse: (response: ApiResponse<Notification[]>) =>
        response.data,
      providesTags: [{ type: "Notifications", id: "UNREAD" }],
    }),

    // ============================================
    // Get Unread Count
    // ============================================
    getUnreadCount: builder.query<number, void>({
      query: () => "/api/notifications/unread/count",
      transformResponse: (response: ApiResponse<UnreadCountResponse>) =>
        response.data.count,
      providesTags: [{ type: "Notifications", id: "COUNT" }],
    }),

    // ============================================
    // Mark as Read (Single)
    // ============================================
    markNotificationAsRead: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/notifications/${id}/read`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Notifications", id },
        { type: "Notifications", id: "UNREAD" },
        { type: "Notifications", id: "COUNT" },
      ],
    }),

    // ============================================
    // Mark All as Read
    // ============================================
    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => ({
        url: "/api/notifications/read-all",
        method: "PUT",
      }),
      invalidatesTags: [
        { type: "Notifications", id: "LIST" },
        { type: "Notifications", id: "UNREAD" },
        { type: "Notifications", id: "COUNT" },
      ],
    }),

    // ============================================
    // Delete Notification
    // ============================================
    deleteNotification: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Notifications", id },
        { type: "Notifications", id: "LIST" },
        { type: "Notifications", id: "COUNT" },
      ],
    }),
  }),
});

// ============================================
// Export Hooks
// ============================================

export const {
  useGetNotificationsQuery,
  useGetAllNotificationsQuery,
  useGetUnreadNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
} = notificationApi;
