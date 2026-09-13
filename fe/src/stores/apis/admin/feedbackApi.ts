import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type { ApiResponse, Page } from "../../../types";
import type {
  FeedbackDTO,
  FeedbackDetailDTO,
  UpdateFeedbackStatusRequest,
  ReplyFeedbackRequest,
  ReportDTO,
  ResolveReportRequest,
  FeedbackAnalyticsDTO,
  SatisfactionMetricsDTO,
} from "../../../types/admin/feedback";

export const feedbackManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── FEEDBACK ───────────────────────────────────────────────────────────

    // 1. GET /api/admin/feedback
    getAllFeedback: builder.query<
      ApiResponse<Page<FeedbackDTO>>,
      {
        page?: number;
        size?: number;
        minRating?: number;
        maxRating?: number;
        isResolved?: boolean;
      }
    >({
      query: ({
        page = 0,
        size = 20,
        minRating,
        maxRating,
        isResolved,
      } = {}) => ({
        url: ADMIN_ENDPOINTS.FEEDBACK,
        params: {
          page,
          size,
          ...(minRating !== undefined && { minRating }),
          ...(maxRating !== undefined && { maxRating }),
          ...(isResolved !== undefined && { isResolved }),
        },
      }),
      providesTags: ["Notifications"],
    }),

    // 2. GET /api/admin/feedback/{id}
    getFeedbackById: builder.query<ApiResponse<FeedbackDetailDTO>, number>({
      query: (id) => ADMIN_ENDPOINTS.FEEDBACK_BY_ID(id),
      providesTags: (_, __, id) => [{ type: "Notifications", id }],
    }),

    // 3. PATCH /api/admin/feedback/{id}/status
    updateFeedbackStatus: builder.mutation<
      ApiResponse<FeedbackDTO>,
      { id: number; data: UpdateFeedbackStatusRequest }
    >({
      query: ({ id, data }) => ({
        url: ADMIN_ENDPOINTS.FEEDBACK_STATUS(id),
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Notifications"],
    }),

    // 4. POST /api/admin/feedback/{id}/reply
    replyToFeedback: builder.mutation<
      ApiResponse<FeedbackDetailDTO>,
      { id: number; data: ReplyFeedbackRequest }
    >({
      query: ({ id, data }) => ({
        url: ADMIN_ENDPOINTS.FEEDBACK_REPLY(id),
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "Notifications", id },
        "Notifications",
      ],
    }),

    // ── LOCKER REPORTS ─────────────────────────────────────────────────────
    // BE: GET /api/admin/lockers/reports  |  PUT /api/admin/lockers/reports/{id}/resolve

    // 5. GET /api/admin/lockers/reports
    getAllReports: builder.query<
      ApiResponse<Page<ReportDTO>>,
      { page?: number; size?: number; status?: string }
    >({
      query: ({ page = 0, size = 20, status } = {}) => ({
        url: ADMIN_ENDPOINTS.REPORTS,
        params: {
          page,
          size,
          ...(status && { status }),
        },
      }),
      providesTags: ["NotificationStats"],
    }),

    // 6. PUT /api/admin/lockers/reports/{id}/resolve
    resolveReport: builder.mutation<
      ApiResponse<ReportDTO>,
      { id: number; data: ResolveReportRequest }
    >({
      query: ({ id, data }) => ({
        url: ADMIN_ENDPOINTS.REPORT_RESOLVE(id),
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["NotificationStats"],
    }),

    // ── ANALYTICS ──────────────────────────────────────────────────────────

    // 7. GET /api/admin/analytics/feedback
    getFeedbackAnalytics: builder.query<
      ApiResponse<FeedbackAnalyticsDTO>,
      { period?: "day" | "week" | "month" }
    >({
      query: ({ period } = {}) => ({
        url: ADMIN_ENDPOINTS.ANALYTICS_FEEDBACK,
        params: { ...(period && { period }) },
      }),
      providesTags: ["Notifications"],
    }),

    // 8. GET /api/admin/analytics/satisfaction
    getSatisfactionMetrics: builder.query<
      ApiResponse<SatisfactionMetricsDTO>,
      void
    >({
      query: () => ADMIN_ENDPOINTS.ANALYTICS_SATISFACTION,
      providesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetAllFeedbackQuery,
  useGetFeedbackByIdQuery,
  useUpdateFeedbackStatusMutation,
  useReplyToFeedbackMutation,
  useGetAllReportsQuery,
  useResolveReportMutation,
  useGetFeedbackAnalyticsQuery,
  useGetSatisfactionMetricsQuery,
} = feedbackManagementApi;
