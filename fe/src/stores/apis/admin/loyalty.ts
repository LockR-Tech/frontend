import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type { ApiResponse, Page } from "../../../types";
import type {
  LoyaltyStatisticsDTO,
  LoyaltyUserSummaryDTO,
  AdjustPointsRequest,
  AdjustPointsResponseDTO,
  PointsHistoryItemDTO,
} from "../../../types/admin/loyalty";

const TAG = "Loyalty" as const;

export const loyaltyManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/admin/loyalty/statistics
    getLoyaltyStatistics: builder.query<
      ApiResponse<LoyaltyStatisticsDTO>,
      void
    >({
      query: () => ADMIN_ENDPOINTS.LOYALTY_STATISTICS,
      providesTags: [TAG],
    }),

    // GET /api/admin/loyalty/users/{userId}
    getUserLoyaltySummary: builder.query<
      ApiResponse<LoyaltyUserSummaryDTO>,
      number
    >({
      query: (userId) => ADMIN_ENDPOINTS.LOYALTY_USER_SUMMARY(userId),
      providesTags: (_, __, userId) => [{ type: TAG, id: userId }],
    }),

    // POST /api/admin/loyalty/users/{userId}/adjust-points
    adjustUserPoints: builder.mutation<
      ApiResponse<AdjustPointsResponseDTO>,
      { userId: number; data: AdjustPointsRequest }
    >({
      query: ({ userId, data }) => ({
        url: ADMIN_ENDPOINTS.LOYALTY_USER_ADJUST_POINTS(userId),
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_, __, { userId }) => [
        { type: TAG, id: userId },
        TAG,
      ],
    }),

    // GET /api/admin/loyalty/users/{userId}/history
    getUserLoyaltyHistory: builder.query<
      ApiResponse<Page<PointsHistoryItemDTO>>,
      { userId: number; page?: number; size?: number }
    >({
      query: ({ userId, page = 0, size = 10 }) => ({
        url: ADMIN_ENDPOINTS.LOYALTY_USER_HISTORY(userId),
        params: { page, size, sort: "transactionDate,desc" },
      }),
      providesTags: (_, __, { userId }) => [{ type: TAG, id: userId }],
    }),
  }),
});

export const {
  useGetLoyaltyStatisticsQuery,
  useGetUserLoyaltySummaryQuery,
  useAdjustUserPointsMutation,
  useGetUserLoyaltyHistoryQuery,
} = loyaltyManagementApi;
