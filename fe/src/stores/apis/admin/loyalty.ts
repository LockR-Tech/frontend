import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type { ApiResponse } from "../../../types";
import type {
  LoyaltyStatisticsDTO,
  LoyaltyAccountDTO,
  AdjustPointsRequest,
  PointTransactionDTO,
  LoyaltyMemberDTO,
  LoyaltyPeriodSummaryDTO,
  LoyaltyTransactionsDTO,
  LoyaltyTransactionsParams,
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

    // GET /api/admin/loyalty/period-summary — điểm cộng/trừ so với kỳ trước
    getLoyaltyPeriodSummary: builder.query<
      ApiResponse<LoyaltyPeriodSummaryDTO>,
      { from: string; to: string }
    >({
      query: (params) => ({ url: ADMIN_ENDPOINTS.LOYALTY_PERIOD_SUMMARY, params }),
      providesTags: [TAG],
    }),

    // GET /api/admin/loyalty/members — List, điểm nhiều xếp trước
    getLoyaltyMembers: builder.query<ApiResponse<LoyaltyMemberDTO[]>, void>({
      query: () => ADMIN_ENDPOINTS.LOYALTY_MEMBERS,
      providesTags: [TAG],
    }),

    // GET /api/admin/loyalty/transactions — giao dịch tạo nên một con số thống kê
    getLoyaltyTransactions: builder.query<ApiResponse<LoyaltyTransactionsDTO>, LoyaltyTransactionsParams>({
      query: (params) => ({ url: ADMIN_ENDPOINTS.LOYALTY_TRANSACTIONS, params }),
      providesTags: [TAG],
    }),

    // GET /api/admin/loyalty/users/{userId}
    getUserLoyaltySummary: builder.query<
      ApiResponse<LoyaltyAccountDTO>,
      number
    >({
      query: (userId) => ADMIN_ENDPOINTS.LOYALTY_USER_SUMMARY(userId),
      providesTags: (_, __, userId) => [{ type: TAG, id: userId }],
    }),

    // POST /api/admin/loyalty/users/{userId}/points — body {userId, points (có dấu), type}
    adjustUserPoints: builder.mutation<
      ApiResponse<LoyaltyAccountDTO>,
      AdjustPointsRequest
    >({
      query: (data) => ({
        url: `${ADMIN_ENDPOINTS.LOYALTY_USER_SUMMARY(data.userId)}/points`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_, __, { userId }) => [
        { type: TAG, id: userId },
        TAG,
      ],
    }),

    // GET /api/admin/loyalty/users/{userId}/history — List, không phân trang
    getUserLoyaltyHistory: builder.query<
      ApiResponse<PointTransactionDTO[]>,
      number
    >({
      query: (userId) => ADMIN_ENDPOINTS.LOYALTY_USER_HISTORY(userId),
      providesTags: (_, __, userId) => [{ type: TAG, id: userId }],
    }),
  }),
});

export const {
  useGetLoyaltyStatisticsQuery,
  useGetLoyaltyMembersQuery,
  useGetLoyaltyPeriodSummaryQuery,
  useGetLoyaltyTransactionsQuery,
  useGetUserLoyaltySummaryQuery,
  useAdjustUserPointsMutation,
  useGetUserLoyaltyHistoryQuery,
} = loyaltyManagementApi;
