import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type { ApiResponse, AdminNotificationResponse } from "../../../types";
import type { AdminPage } from "~/types/admin/feedback";

const TAGS = {
  NOTIFICATIONS: "Notifications",
  NOTIFICATION_STATS: "NotificationStats",
} as const;

/** GET /api/admin/notifications?userId= — thông báo của một người dùng (List, không phân trang). */
export interface GetNotificationsParams {
  userId: number;
}

/**
 * GET /api/admin/notifications/search — bảng trang Thông báo, lọc + phân trang ở backend.
 * `search` tìm trong tiêu đề/nội dung/mã thông báo; `recipientIds` = người nhận có tên/email khớp `search`.
 */
export interface SearchNotificationsParams {
  page: number;
  size: number;
  status?: string;
  type?: string;
  search?: string;
  recipientIds?: number[];
}

/** GET /api/admin/notifications/stats — thẻ số liệu và danh sách loại (mọi thông báo). */
export interface AdminNotificationStats {
  total: number;
  unread: number;
  read: number;
  /** Phút trung bình từ lúc tạo tới lúc đọc; null khi chưa có thông báo nào được đọc. */
  averageReadMinutes: number | null;
  types: { type: string; count: number }[];
}

/**
 * POST /api/admin/notifications/bulk-delete — xoá mềm theo `ids` đã tích, hoặc `all` = mọi thông báo
 * khớp bộ lọc (cùng tham số với bảng). Trả mã các thông báo đã xoá.
 */
export interface BulkDeleteNotificationsBody {
  ids?: number[];
  all?: boolean;
  status?: string;
  type?: string;
  search?: string;
  recipientIds?: number[];
  reason: string;
}

/** NotificationRequest (common-lib) — body của POST /api/admin/notifications/send. */
export interface SendNotificationRequest {
  userId: number;
  title: string;
  message: string;
  type: string;
  referenceId?: number;
  referenceType?: string;
}

/** POST /api/admin/notifications/broadcast — có `userIds` thì chỉ gửi những người đó. */
export interface BroadcastNotificationBody {
  title: string;
  message: string;
  type: string;
  userIds?: number[];
}

export const notificationManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllNotifications: builder.query<
      ApiResponse<AdminNotificationResponse[]>,
      GetNotificationsParams
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.NOTIFICATIONS,
        params,
      }),
      providesTags: [TAGS.NOTIFICATIONS],
    }),

    searchNotifications: builder.query<
      ApiResponse<AdminPage<AdminNotificationResponse>>,
      SearchNotificationsParams
    >({
      query: ({ recipientIds, ...params }) => ({
        url: ADMIN_ENDPOINTS.NOTIFICATION_SEARCH,
        params: recipientIds?.length ? { ...params, recipientIds: recipientIds.join(",") } : params,
      }),
      providesTags: [TAGS.NOTIFICATIONS],
    }),

    getNotificationStats: builder.query<ApiResponse<AdminNotificationStats>, void>({
      query: () => ADMIN_ENDPOINTS.NOTIFICATION_STATS,
      providesTags: [TAGS.NOTIFICATIONS, TAGS.NOTIFICATION_STATS],
    }),

    bulkDeleteNotifications: builder.mutation<ApiResponse<number[]>, BulkDeleteNotificationsBody>({
      query: (body) => ({
        url: ADMIN_ENDPOINTS.NOTIFICATION_BULK_DELETE,
        method: "POST",
        body,
      }),
      invalidatesTags: [TAGS.NOTIFICATIONS],
    }),

    sendNotification: builder.mutation<
      ApiResponse<AdminNotificationResponse>,
      SendNotificationRequest
    >({
      query: (data) => ({
        url: `${ADMIN_ENDPOINTS.NOTIFICATIONS}/send`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [TAGS.NOTIFICATIONS],
    }),

    // Xoá mềm: backend bắt buộc lý do (DELETE_REASON_REQUIRED), lưu vào deleted_reason.
    deleteNotification: builder.mutation<ApiResponse<void>, { id: number; reason: string }>({
      query: ({ id, reason }) => ({
        url: ADMIN_ENDPOINTS.NOTIFICATION_BY_ID(id),
        method: "DELETE",
        params: { reason },
      }),
      invalidatesTags: [TAGS.NOTIFICATIONS],
    }),

    // PATCH /api/admin/notifications/{id}/read
    markAdminNotificationRead: builder.mutation<
      ApiResponse<AdminNotificationResponse>,
      number
    >({
      query: (id) => ({
        url: `${ADMIN_ENDPOINTS.NOTIFICATION_BY_ID(id)}/read`,
        method: "PATCH",
      }),
      invalidatesTags: [TAGS.NOTIFICATIONS],
    }),

    // POST /api/admin/notifications/{id}/resend — trả về thông báo mới
    resendNotification: builder.mutation<
      ApiResponse<AdminNotificationResponse>,
      number
    >({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.NOTIFICATION_RESEND(id),
        method: "POST",
      }),
      invalidatesTags: [TAGS.NOTIFICATIONS],
    }),

    // Trả List các thông báo đã tạo — số người nhận = độ dài danh sách.
    broadcastNotification: builder.mutation<
      ApiResponse<AdminNotificationResponse[]>,
      BroadcastNotificationBody
    >({
      query: (data) => ({
        url: ADMIN_ENDPOINTS.NOTIFICATION_BROADCAST,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [TAGS.NOTIFICATIONS],
    }),
  }),
});

export const {
  useGetAllNotificationsQuery,
  useSearchNotificationsQuery,
  useGetNotificationStatsQuery,
  useBulkDeleteNotificationsMutation,
  useSendNotificationMutation,
  useDeleteNotificationMutation,
  useMarkAdminNotificationReadMutation,
  useResendNotificationMutation,
  useBroadcastNotificationMutation,
} = notificationManagementApi;
