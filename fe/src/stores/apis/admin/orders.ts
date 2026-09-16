import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type {
  ApiResponse,
  Page,
  PageableRequest,
  OrderResponse,
  OrderStatus,
  OrderStatisticsResponse,
  RevenueReportResponse,
  AdminOrder,
  AdminOrderSearchParams,
  ReportEnvelope,
  ReportPage,
  UpdateAdminOrderStatusRequest,
} from "../../../types";
import {
  UpdateOrderStatusRequestSchema,
  createValidator,
} from "../../../schemas";
import { toQueryParams } from "./reporting-params";

const TAGS = {
  ORDERS: "Orders",
  DASHBOARD: "Dashboard",
} as const;

// Create validator
const updateOrderStatusValidator = createValidator(
  UpdateOrderStatusRequestSchema,
);

export const orderManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllOrders: builder.query<
      ApiResponse<Page<OrderResponse>>,
      PageableRequest & { status?: OrderStatus }
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.ORDERS,
        params,
      }),
      keepUnusedDataFor: 0,
      providesTags: [TAGS.ORDERS],
    }),

    getOrderById: builder.query<ApiResponse<OrderResponse>, number>({
      query: (id) => ADMIN_ENDPOINTS.ORDER_BY_ID(id),
      providesTags: (result, error, id) => [{ type: TAGS.ORDERS, id }],
    }),

    updateOrderStatus: builder.mutation<
      ApiResponse<OrderResponse>,
      { id: number; status: OrderStatus }
    >({
      query: ({ id, status }) => {
        // Validate with Zod before sending
        updateOrderStatusValidator.validateRequestBody({ status });
        return {
          url: ADMIN_ENDPOINTS.ORDER_STATUS(id),
          method: "PUT",
          params: { status },
        };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: TAGS.ORDERS, id },
        TAGS.ORDERS,
        TAGS.DASHBOARD,
      ],
    }),

    /**
     * Tìm kiếm đơn có phân trang cho `/admin/orders`
     * (docs/01-overview/admin-reporting-api.md § 1.1). `timeline` luôn `null` ở danh sách.
     */
    searchAdminOrders: builder.query<
      ReportEnvelope<ReportPage<AdminOrder>>,
      AdminOrderSearchParams
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.ORDERS_SEARCH,
        params: toQueryParams({ ...params }),
      }),
      providesTags: [TAGS.ORDERS],
    }),

    /** Chi tiết đơn đầy đủ kèm `timeline` (§ 1.2). 404 khi id không tồn tại. */
    getAdminOrderDetail: builder.query<ReportEnvelope<AdminOrder>, number>({
      query: (id) => ADMIN_ENDPOINTS.ORDER_DETAIL(id),
      providesTags: (_result, _error, id) => [{ type: TAGS.ORDERS, id }],
    }),

    /**
     * Đổi trạng thái đơn bằng **body JSON** (§ 1.4). Endpoint cũ `updateOrderStatus`
     * gửi trạng thái qua query param nên backend trả 400 — dùng mutation này.
     */
    updateAdminOrderStatus: builder.mutation<
      ReportEnvelope<OrderResponse>,
      UpdateAdminOrderStatusRequest
    >({
      query: ({ id, status, staffId, receiveBoxId }) => ({
        url: ADMIN_ENDPOINTS.ORDER_STATUS(id),
        method: "PUT",
        body: {
          status,
          ...(staffId !== undefined ? { staffId } : {}),
          ...(receiveBoxId !== undefined ? { receiveBoxId } : {}),
        },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: TAGS.ORDERS, id },
        TAGS.ORDERS,
        TAGS.DASHBOARD,
      ],
    }),

    getOrderStatistics: builder.query<
      ApiResponse<OrderStatisticsResponse>,
      void
    >({
      query: () => ADMIN_ENDPOINTS.ORDER_STATISTICS,
      providesTags: [TAGS.ORDERS, TAGS.DASHBOARD],
    }),

    getRevenueReport: builder.query<ApiResponse<RevenueReportResponse>, void>({
      query: () => ADMIN_ENDPOINTS.ORDER_REVENUE,
      providesTags: [TAGS.ORDERS, TAGS.DASHBOARD],
    }),
  }),
});

export const {
  useGetAllOrdersQuery,
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useGetOrderStatisticsQuery,
  useGetRevenueReportQuery,
  useSearchAdminOrdersQuery,
  useGetAdminOrderDetailQuery,
  useUpdateAdminOrderStatusMutation,
} = orderManagementApi;
