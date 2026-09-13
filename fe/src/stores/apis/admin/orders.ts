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
} from "../../../types";
import {
  UpdateOrderStatusRequestSchema,
  createValidator,
} from "../../../schemas";

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
} = orderManagementApi;
