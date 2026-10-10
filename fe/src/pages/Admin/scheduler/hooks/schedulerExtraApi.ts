import { baseApi } from "~/stores/baseAPi";
import { ADMIN_ENDPOINTS } from "~/constants";
import type { ApiResponse } from "~/types";

// Hai job OrderController có sẵn nhưng slice scheduler chưa khai báo:
// POST /api/admin/scheduler/release-overdue và /reconcile-boxes.
const SCHEDULER_ROOT = ADMIN_ENDPOINTS.SCHEDULER_STATUS.replace(/\/status$/, "");

export const schedulerExtraApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    triggerReleaseOverdue: builder.mutation<ApiResponse<Record<string, unknown>>, void>({
      query: () => ({ url: `${SCHEDULER_ROOT}/release-overdue`, method: "POST" }),
      invalidatesTags: ["Orders", "Lockers"],
    }),
    triggerReconcileBoxes: builder.mutation<ApiResponse<Record<string, unknown>>, void>({
      query: () => ({ url: `${SCHEDULER_ROOT}/reconcile-boxes`, method: "POST" }),
      invalidatesTags: ["Lockers"],
    }),
  }),
});

export const { useTriggerReleaseOverdueMutation, useTriggerReconcileBoxesMutation } =
  schedulerExtraApi;
