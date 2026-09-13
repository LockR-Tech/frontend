import { baseApi } from '../../baseAPi';
import { ADMIN_ENDPOINTS } from '../../../constants';
import type {
  ApiResponse,
  Page,
  PageableRequest,
  PartnerResponse,
  PartnerStatus,
  PartnerStatisticsResponse,
} from '../../../types';
import { RejectPartnerRequestSchema, createValidator } from '../../../schemas';

const TAGS = {
  PARTNERS: 'Partners',
  DASHBOARD: 'Dashboard',
} as const;

const rejectPartnerValidator = createValidator(RejectPartnerRequestSchema);

export const partnerManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all partners with optional status filter
    getAllPartners: builder.query<
      ApiResponse<Page<PartnerResponse>>,
      PageableRequest & { status?: PartnerStatus }
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.PARTNERS,
        params,
      }),
      providesTags: [TAGS.PARTNERS],
    }),

    // Get partner by ID
    getPartnerById: builder.query<ApiResponse<PartnerResponse>, number>({
      query: (partnerId) => ADMIN_ENDPOINTS.PARTNER_BY_ID(partnerId),
      providesTags: (result, error, partnerId) => [{ type: TAGS.PARTNERS, id: partnerId }],
    }),

    // Approve partner
    approvePartner: builder.mutation<ApiResponse<PartnerResponse>, number>({
      query: (partnerId) => ({
        url: ADMIN_ENDPOINTS.PARTNER_APPROVE(partnerId),
        method: 'POST',
      }),
      invalidatesTags: (result, error, partnerId) => [
        { type: TAGS.PARTNERS, id: partnerId },
        TAGS.PARTNERS,
      ],
    }),

    // Reject partner with reason
    rejectPartner: builder.mutation<
      ApiResponse<PartnerResponse>,
      { partnerId: number; reason: string }
    >({
      query: ({ partnerId, reason }) => {
        // Validate reason with Zod
        rejectPartnerValidator.validateRequestBody({ reason });
        return {
          url: ADMIN_ENDPOINTS.PARTNER_REJECT(partnerId),
          method: 'POST',
          params: { reason },
        };
      },
      invalidatesTags: (result, error, { partnerId }) => [
        { type: TAGS.PARTNERS, id: partnerId },
        TAGS.PARTNERS,
      ],
    }),

    // Suspend partner
    suspendPartner: builder.mutation<ApiResponse<PartnerResponse>, number>({
      query: (partnerId) => ({
        url: ADMIN_ENDPOINTS.PARTNER_SUSPEND(partnerId),
        method: 'POST',
      }),
      invalidatesTags: (result, error, partnerId) => [
        { type: TAGS.PARTNERS, id: partnerId },
        TAGS.PARTNERS,
      ],
    }),

    // Get partner statistics
    getPartnerStatistics: builder.query<ApiResponse<PartnerStatisticsResponse>, void>({
      query: () => ADMIN_ENDPOINTS.PARTNERS + '/statistics',
      providesTags: [TAGS.PARTNERS, TAGS.DASHBOARD],
    }),
  }),
});

export const {
  useGetAllPartnersQuery,
  useGetPartnerByIdQuery,
  useApprovePartnerMutation,
  useRejectPartnerMutation,
  useSuspendPartnerMutation,
  useGetPartnerStatisticsQuery,
} = partnerManagementApi;
