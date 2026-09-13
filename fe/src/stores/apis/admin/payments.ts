import { baseApi } from '../../baseAPi';
import { ADMIN_ENDPOINTS } from '../../../constants';
import type {
  ApiResponse,
  Page,
  PageableRequest,
  PaymentResponse,
  PaymentStatus,
} from '../../../types';
import { UpdatePaymentStatusRequestSchema, createValidator } from '../../../schemas';

const TAGS = {
  PAYMENTS: 'Payments',
} as const;

// Create validator
const updatePaymentStatusValidator = createValidator(UpdatePaymentStatusRequestSchema);

export const paymentManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllPayments: builder.query<
      ApiResponse<Page<PaymentResponse>>,
      PageableRequest & { status?: PaymentStatus }
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.PAYMENTS,
        params,
      }),
      providesTags: [TAGS.PAYMENTS],
    }),

    getPaymentById: builder.query<ApiResponse<PaymentResponse>, number>({
      query: (paymentId) => ADMIN_ENDPOINTS.PAYMENT_BY_ID(paymentId),
      providesTags: (result, error, id) => [{ type: TAGS.PAYMENTS, id }],
    }),

    updatePaymentStatus: builder.mutation<
      ApiResponse<PaymentResponse>,
      { paymentId: number; status: PaymentStatus }
    >({
      query: ({ paymentId, status }) => {
        // Validate with Zod before sending
        updatePaymentStatusValidator.validateRequestBody({ status });
        return {
          url: ADMIN_ENDPOINTS.PAYMENT_STATUS(paymentId),
          method: 'PUT',
          params: { status },
        };
      },
      invalidatesTags: (result, error, { paymentId }) => [
        { type: TAGS.PAYMENTS, id: paymentId },
        TAGS.PAYMENTS,
      ],
    }),
  }),
});

export const {
  useGetAllPaymentsQuery,
  useGetPaymentByIdQuery,
  useUpdatePaymentStatusMutation,
} = paymentManagementApi;
