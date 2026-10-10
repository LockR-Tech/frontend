import { baseApi } from "~/stores/baseAPi";
import type { ApiResponse } from "~/types";
import type { DroneOrderTracking } from "~/stores/apis/admin/droneOrders";

// Slice droneOrders.ts chưa nhận tham số cho danh sách. Backend (OrderController
// GET /api/admin/drone-orders) có `includeFinished`: false = chỉ nhiệm vụ đang chạy
// + đơn đã đóng còn chờ trả kiện — tránh kéo toàn bộ lịch sử mỗi 5 giây.
export const droneOrderListApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDroneOrderList: builder.query<
      ApiResponse<DroneOrderTracking[]>,
      { includeFinished: boolean }
    >({
      query: ({ includeFinished }) => ({
        url: "/api/admin/drone-orders",
        params: { includeFinished },
      }),
      providesTags: ["DroneOrders"],
    }),
  }),
});

export const { useGetAdminDroneOrderListQuery } = droneOrderListApi;
