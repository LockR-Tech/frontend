import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type {
  CustomerRevenue,
  CustomerRevenueDetail,
  DateRange,
  ReportEnvelope,
  ReportPage,
  RevenueByCustomerParams,
  RevenueByLockerResponse,
  RevenueByMethodResponse,
  RevenueByServiceResponse,
  RevenueByStoreResponse,
  RevenueDailyResponse,
  RevenueSummaryResponse,
} from "../../../types";
import { toQueryParams } from "./reporting-params";

// Báo cáo doanh thu theo TIỀN THỰC THU — docs/01-overview/admin-reporting-api.md § 3.
// Khác quy tắc cũ (`/api/admin/orders/revenue` cộng `totalPrice` của đơn COMPLETED):
// ở đây doanh thu = tổng thanh toán COMPLETED của đơn thật, nạp ví không tính.
//
// Mọi endpoint nhận `from`/`to` dạng `yyyy-MM-dd` (ngày Việt Nam, tính cả hai đầu),
// mặc định từ mùng 1 tháng này tới hôm nay, tối đa 366 ngày. Nếu payment-service
// không trả lời, backend trả 503 `PAYMENT_DATA_UNAVAILABLE` — màn hình phải báo lỗi,
// không được hiển thị số 0.

const TAGS = {
  REVENUE: "Revenue",
} as const;

export const revenueReportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** KPI kỳ hiện tại, kỳ trước, % thay đổi và các mốc hôm nay / tuần / tháng (§ 3.2). */
    getRevenueSummary: builder.query<
      ReportEnvelope<RevenueSummaryResponse>,
      Partial<DateRange>
    >({
      query: (range) => ({
        url: ADMIN_ENDPOINTS.REVENUE_SUMMARY,
        params: toQueryParams({ ...range }),
      }),
      providesTags: [TAGS.REVENUE],
    }),

    /** Chuỗi theo ngày; mọi ngày trong khoảng đều có mặt, ngày trống là số 0 (§ 3.3). */
    getRevenueDaily: builder.query<
      ReportEnvelope<RevenueDailyResponse>,
      Partial<DateRange>
    >({
      query: (range) => ({
        url: ADMIN_ENDPOINTS.REVENUE_DAILY,
        params: toQueryParams({ ...range }),
      }),
      providesTags: [TAGS.REVENUE],
    }),

    /** Theo loại dịch vụ, kèm dòng `OVERTIME_FEE` cho phí quá hạn đã thu (§ 3.4). */
    getRevenueByService: builder.query<
      ReportEnvelope<RevenueByServiceResponse>,
      Partial<DateRange>
    >({
      query: (range) => ({
        url: ADMIN_ENDPOINTS.REVENUE_BY_SERVICE,
        params: toQueryParams({ ...range }),
      }),
      providesTags: [TAGS.REVENUE],
    }),

    /** Theo phương thức thanh toán (§ 3.5). */
    getRevenueByMethod: builder.query<
      ReportEnvelope<RevenueByMethodResponse>,
      Partial<DateRange>
    >({
      query: (range) => ({
        url: ADMIN_ENDPOINTS.REVENUE_BY_METHOD,
        params: toQueryParams({ ...range }),
      }),
      providesTags: [TAGS.REVENUE],
    }),

    /** Theo tủ, gồm cả tủ doanh thu 0; `storeId` lọc theo cửa hàng (§ 3.6). */
    getRevenueByLocker: builder.query<
      ReportEnvelope<RevenueByLockerResponse>,
      Partial<DateRange> & { storeId?: number }
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.REVENUE_BY_LOCKER,
        params: toQueryParams({ ...params }),
      }),
      providesTags: [TAGS.REVENUE],
    }),

    /** Theo cửa hàng, kèm dòng "chưa gán cửa hàng" khi có phát sinh (§ 3.7). */
    getRevenueByStore: builder.query<
      ReportEnvelope<RevenueByStoreResponse>,
      Partial<DateRange>
    >({
      query: (range) => ({
        url: ADMIN_ENDPOINTS.REVENUE_BY_STORE,
        params: toQueryParams({ ...range }),
      }),
      providesTags: [TAGS.REVENUE],
    }),

    /** Bảng khách hàng có phân trang, sắp xếp và tìm kiếm (§ 3.8). */
    getRevenueByCustomer: builder.query<
      ReportEnvelope<ReportPage<CustomerRevenue>>,
      RevenueByCustomerParams
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.REVENUE_BY_CUSTOMER,
        params: toQueryParams({ ...params }),
      }),
      providesTags: [TAGS.REVENUE],
    }),

    /** Chi tiết một khách: thông tin, tổng trong kỳ và danh sách đơn (§ 3.9). */
    getCustomerRevenueDetail: builder.query<
      ReportEnvelope<CustomerRevenueDetail>,
      { userId: number } & Partial<DateRange>
    >({
      query: ({ userId, ...range }) => ({
        url: ADMIN_ENDPOINTS.REVENUE_CUSTOMER_DETAIL(userId),
        params: toQueryParams({ ...range }),
      }),
      providesTags: (_result, _error, { userId }) => [
        { type: TAGS.REVENUE, id: userId },
      ],
    }),
  }),
});

export const {
  useGetRevenueSummaryQuery,
  useGetRevenueDailyQuery,
  useGetRevenueByServiceQuery,
  useGetRevenueByMethodQuery,
  useGetRevenueByLockerQuery,
  useGetRevenueByStoreQuery,
  useGetRevenueByCustomerQuery,
  useGetCustomerRevenueDetailQuery,
} = revenueReportApi;
