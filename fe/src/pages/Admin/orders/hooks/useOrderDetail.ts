import { useGetAdminOrderDetailQuery } from "@/stores/apis/admin/orders";
import type { AdminOrder } from "~/types/admin/reporting";

/**
 * Chi tiết đơn cho `/admin/orders/:orderId`, lấy từ `GET /api/admin/orders/{id}/detail`
 * — khác endpoint cũ ở chỗ có `timeline`, thông tin khách/tủ/cửa hàng/thanh toán/drone.
 * Việc đổi trạng thái nằm ở `OrderStatusUpdateModal` để một nơi gọi mutation duy nhất.
 */
export function useOrderDetail(orderId: string | undefined) {
  const numericId = Number(orderId);
  const validId = Number.isInteger(numericId) && numericId > 0 ? numericId : undefined;

  const { data, isLoading, isFetching, error, refetch } =
    useGetAdminOrderDetailQuery(validId!, { skip: !validId });

  const order: AdminOrder | null = data?.data ?? null;

  return { order, isLoading, isFetching, error, refetch, isValidId: !!validId };
}
