import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type { ApiResponse, SchedulerJobResponse } from "../../../types";
import type { SchedulerStatusResponse } from "../../../types/admin/scheduler";

const TAGS = {
  ORDERS: "Orders",
  LOCKERS: "Lockers",
  SCHEDULER: "Scheduler",
} as const;

export const schedulerManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSchedulerStatus: builder.query<
      ApiResponse<SchedulerStatusResponse>,
      void
    >({
      query: () => ({
        url: ADMIN_ENDPOINTS.SCHEDULER_STATUS,
        method: "GET",
      }),
      providesTags: [TAGS.SCHEDULER],
    }),

    triggerAutoCancel: builder.mutation<
      ApiResponse<SchedulerJobResponse>,
      void
    >({
      query: () => ({
        url: ADMIN_ENDPOINTS.SCHEDULER_AUTO_CANCEL,
        method: "POST",
      }),
      invalidatesTags: [TAGS.ORDERS, TAGS.SCHEDULER],
    }),

    triggerBoxRelease: builder.mutation<
      ApiResponse<SchedulerJobResponse>,
      void
    >({
      query: () => ({
        url: ADMIN_ENDPOINTS.SCHEDULER_RELEASE_BOXES,
        method: "POST",
      }),
      invalidatesTags: [TAGS.LOCKERS],
    }),

    triggerPickupReminders: builder.mutation<
      ApiResponse<SchedulerJobResponse>,
      void
    >({
      query: () => ({
        url: ADMIN_ENDPOINTS.SCHEDULER_PICKUP_REMINDERS,
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetSchedulerStatusQuery,
  useTriggerAutoCancelMutation,
  useTriggerBoxReleaseMutation,
  useTriggerPickupRemindersMutation,
} = schedulerManagementApi;
