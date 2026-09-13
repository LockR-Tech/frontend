import { baseApi } from "../baseAPi";
import { LOYALTY_ENDPOINTS } from "../../constants";
import type { ApiResponse, Page, PageableRequest } from "../../types";
import type {
  LoyaltyProfileResponse,
  LoyaltyRewardResponse,
  RedeemPointsRequest,
  RedeemPointsResponse,
  LoyaltyTransactionResponse,
} from "../../types/loyalty";

const TAGS = {
  LOYALTY: "Loyalty",
} as const;

export const loyaltyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/loyalty/profile
    getLoyaltyProfile: builder.query<ApiResponse<LoyaltyProfileResponse>, void>(
      {
        query: () => LOYALTY_ENDPOINTS.PROFILE,
        providesTags: [TAGS.LOYALTY],
      },
    ),

    // GET /api/loyalty/rewards
    getLoyaltyRewards: builder.query<
      ApiResponse<LoyaltyRewardResponse[]>,
      void
    >({
      query: () => LOYALTY_ENDPOINTS.REWARDS,
      providesTags: [TAGS.LOYALTY],
    }),

    // POST /api/loyalty/redeem
    redeemPoints: builder.mutation<
      ApiResponse<RedeemPointsResponse>,
      RedeemPointsRequest
    >({
      query: (body) => ({
        url: LOYALTY_ENDPOINTS.REDEEM,
        method: "POST",
        body,
      }),
      invalidatesTags: [TAGS.LOYALTY],
    }),

    // GET /api/loyalty/transactions?page=0&size=10
    getLoyaltyTransactions: builder.query<
      ApiResponse<Page<LoyaltyTransactionResponse>>,
      PageableRequest
    >({
      query: ({ page = 0, size = 10, sort }) => ({
        url: LOYALTY_ENDPOINTS.TRANSACTIONS,
        params: { page, size, ...(sort && { sort }) },
      }),
      providesTags: [TAGS.LOYALTY],
    }),
  }),
});

export const {
  useGetLoyaltyProfileQuery,
  useGetLoyaltyRewardsQuery,
  useRedeemPointsMutation,
  useGetLoyaltyTransactionsQuery,
} = loyaltyApi;
