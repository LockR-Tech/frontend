import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type {
  ApiResponse,
  Page,
  PageableRequest,
  AdminNotificationResponse,
} from "../../../types";

const TAGS = {
  NOTIFICATIONS: "Notifications",
} as const;

// GET /api/admin/notifications chỉ nhận `userId` (trả List, không phân trang);
// page/size giữ để tương thích chỗ gọi cũ, backend bỏ qua.
export interface GetNotificationsParams extends PageableRequest {
  userId?: number;
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
      ApiResponse<Page<AdminNotificationResponse>>,
      GetNotificationsParams
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.NOTIFICATIONS,
        params,
      }),
      providesTags: [TAGS.NOTIFICATIONS],
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

    deleteNotification: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.NOTIFICATION_BY_ID(id),
        method: "DELETE",
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
  useSendNotificationMutation,
  useDeleteNotificationMutation,
  useMarkAdminNotificationReadMutation,
  useResendNotificationMutation,
  useBroadcastNotificationMutation,
} = notificationManagementApi;
