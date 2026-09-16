import { baseApi } from '../../baseAPi';
import { ADMIN_ENDPOINTS } from '../../../constants';
import type {
  ApiResponse,
  Page,
  PageableRequest,
  PaymentResponse,
  PaymentStatus,
  AdminPayment,
  AdminPaymentDetail,
  AdminPaymentSearchParams,
  AdminPaymentStatus,
  AdminRefund,
  AdminRefundSearchParams,
  AdminWalletTransaction,
  AdminWalletTransactionSearchParams,
  DateRange,
  PaymentStatsResponse,
  ReportEnvelope,
  ReportPage,
} from '../../../types';
import { UpdatePaymentStatusRequestSchema, createValidator } from '../../../schemas';
import { toQueryParams } from './reporting-params';

const TAGS = {
  PAYMENTS: 'Payments',
  REFUNDS: 'PaymentRefunds',
  WALLET_TX: 'WalletTransactions',
  STATS: 'PaymentStats',
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

    /**
     * Đổi trạng thái giao dịch bằng **body JSON**
     * (docs/01-overview/admin-reporting-api.md § 2.1). Mutation cũ gửi qua query param
     * nên backend trả 400 — dùng mutation này ở màn hình thanh toán.
     */
    updateAdminPaymentStatus: builder.mutation<
      ReportEnvelope<AdminPayment>,
      { paymentId: number; status: AdminPaymentStatus }
    >({
      query: ({ paymentId, status }) => ({
        url: ADMIN_ENDPOINTS.PAYMENT_STATUS(paymentId),
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { paymentId }) => [
        { type: TAGS.PAYMENTS, id: paymentId },
        TAGS.PAYMENTS,
        TAGS.REFUNDS,
        TAGS.WALLET_TX,
        TAGS.STATS,
      ],
    }),

    /** Tìm kiếm giao dịch có phân trang (§ 2.2). */
    searchAdminPayments: builder.query<
      ReportEnvelope<ReportPage<AdminPayment>>,
      AdminPaymentSearchParams
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.PAYMENTS_SEARCH,
        params: toQueryParams({ ...params }),
      }),
      providesTags: [TAGS.PAYMENTS],
    }),

    /** Chi tiết giao dịch kèm hoàn tiền, biến động ví và giao dịch khác cùng đơn (§ 2.3). */
    getAdminPaymentDetail: builder.query<
      ReportEnvelope<AdminPaymentDetail>,
      number
    >({
      query: (paymentId) => ADMIN_ENDPOINTS.PAYMENT_DETAIL(paymentId),
      providesTags: (_result, _error, paymentId) => [
        { type: TAGS.PAYMENTS, id: paymentId },
      ],
    }),

    /** Danh sách hoàn tiền (§ 2.4). */
    getAdminRefunds: builder.query<
      ReportEnvelope<ReportPage<AdminRefund>>,
      AdminRefundSearchParams
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.PAYMENT_REFUNDS,
        params: toQueryParams({ ...params }),
      }),
      providesTags: [TAGS.REFUNDS],
    }),

    /** Biến động ví của mọi khách (§ 2.5). */
    getAdminWalletTransactions: builder.query<
      ReportEnvelope<ReportPage<AdminWalletTransaction>>,
      AdminWalletTransactionSearchParams
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.PAYMENT_WALLET_TRANSACTIONS,
        params: toQueryParams({ ...params }),
      }),
      providesTags: [TAGS.WALLET_TX],
    }),

    /** Thống kê giao dịch có so sánh kỳ trước, cho các thẻ tổng quan (§ 2.6). */
    getAdminPaymentStats: builder.query<
      ReportEnvelope<PaymentStatsResponse>,
      Partial<DateRange>
    >({
      query: (range) => ({
        url: ADMIN_ENDPOINTS.PAYMENT_STATS,
        params: toQueryParams({ ...range }),
      }),
      providesTags: [TAGS.STATS],
    }),
  }),
});

export const {
  useGetAllPaymentsQuery,
  useGetPaymentByIdQuery,
  useUpdatePaymentStatusMutation,
  useUpdateAdminPaymentStatusMutation,
  useSearchAdminPaymentsQuery,
  useGetAdminPaymentDetailQuery,
  useGetAdminRefundsQuery,
  useGetAdminWalletTransactionsQuery,
  useGetAdminPaymentStatsQuery,
} = paymentManagementApi;
