import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type {
  ApiResponse,
  Page,
  PageableRequest,
  AdminNotificationResponse,
  CreateNotificationRequest,
  BroadcastNotificationRequest,
  BroadcastResult,
} from "../../../types";
import type {
  NotificationStatus,
  NotificationType,
  NotificationChannel,
} from "../../../types/admin/enums";

const TAGS = {
  NOTIFICATIONS: "Notifications",
} as const;

export interface GetNotificationsParams extends PageableRequest {
  type?: NotificationType;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  recipientId?: number;
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

    getNotificationById: builder.query<
      ApiResponse<AdminNotificationResponse>,
      number
    >({
      query: (id) => ADMIN_ENDPOINTS.NOTIFICATION_BY_ID(id),
      providesTags: (_, __, id) => [{ type: TAGS.NOTIFICATIONS, id }],
    }),

    createNotification: builder.mutation<
      ApiResponse<AdminNotificationResponse>,
      CreateNotificationRequest
    >({
      query: (data) => ({
        url: ADMIN_ENDPOINTS.NOTIFICATIONS,
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

    broadcastNotification: builder.mutation<
      ApiResponse<BroadcastResult>,
      BroadcastNotificationRequest
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
  useGetNotificationByIdQuery,
  useCreateNotificationMutation,
  useDeleteNotificationMutation,
  useBroadcastNotificationMutation,
} = notificationManagementApi;
