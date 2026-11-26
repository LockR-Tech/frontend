import { baseApi } from '../../baseAPi';
import { ADMIN_ENDPOINTS } from '../../../constants';
import type {
  ApiResponse,
  AdminPayment,
  AdminPaymentDetail,
  AdminPaymentSearchParams,
  AdminPaymentStatus,
  AdminRefund,
  AdminRefundSearchParams,
  DateRange,
  PaymentStatsResponse,
  ReportEnvelope,
  ReportPage,
} from '../../../types';
import { toQueryParams } from './reporting-params';

const TAGS = {
  PAYMENTS: 'Payments',
  REFUNDS: 'PaymentRefunds',
  STATS: 'PaymentStats',
} as const;

export const paymentManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Đổi trạng thái giao dịch bằng **body JSON**
     * (docs/01-overview/admin-reporting-api.md § 2.1).
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

    /** Chi tiết giao dịch kèm hoàn tiền và giao dịch khác cùng đơn (§ 2.3). */
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

    /** Duyệt hoàn tiền sau khi Admin đã chuyển khoản ngân hàng thủ công. */
    approveRefund: builder.mutation<
      ApiResponse<void>,
      { refundId: number; bankTransferRef?: string; proofImageUrl?: string }
    >({
      query: ({ refundId, bankTransferRef, proofImageUrl }) => ({
        url: ADMIN_ENDPOINTS.REFUND_APPROVE(refundId),
        method: 'POST',
        body: { bankTransferRef, proofImageUrl },
      }),
      // Duyệt/từ chối hoàn tiền đổi paymentStatus của đơn ⇒ làm mới cả trang đơn hàng
      invalidatesTags: [TAGS.REFUNDS, TAGS.PAYMENTS, TAGS.STATS, "Orders"],
    }),

    /** Từ chối yêu cầu hoàn tiền kèm lý do. */
    rejectRefund: builder.mutation<
      ApiResponse<void>,
      { refundId: number; rejectionReason: string }
    >({
      query: ({ refundId, rejectionReason }) => ({
        url: ADMIN_ENDPOINTS.REFUND_REJECT(refundId),
        method: 'POST',
        body: { rejectionReason },
      }),
      // Duyệt/từ chối hoàn tiền đổi paymentStatus của đơn ⇒ làm mới cả trang đơn hàng
      invalidatesTags: [TAGS.REFUNDS, TAGS.PAYMENTS, TAGS.STATS, "Orders"],
    }),
  }),
});

export const {
  useUpdateAdminPaymentStatusMutation,
  useSearchAdminPaymentsQuery,
  useGetAdminPaymentDetailQuery,
  useGetAdminRefundsQuery,
  useGetAdminPaymentStatsQuery,
  useApproveRefundMutation,
  useRejectRefundMutation,
} = paymentManagementApi;
