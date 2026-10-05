import { useEffect } from "react";
import { useGetAdminOrderDetailQuery } from "@/stores/apis/admin/orders";
import { useWebSocket } from "@/hooks/useWebSocket";
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

  const { subscribe } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    if (!subscribe || !validId) return;

    const subSpecific = subscribe<any>(`/topic/orders/${validId}`, (msg) => {
      console.log(`[Admin OrderDetail ${validId}] Specific update:`, msg);
      refetch();
    });

    const subGeneral = subscribe<any>("/topic/orders", (msg) => {
      if (msg?.orderId && Number(msg.orderId) === validId) {
        console.log(`[Admin OrderDetail ${validId}] General order update:`, msg);
        refetch();
      }
    });

    return () => {
      subSpecific?.unsubscribe();
      subGeneral?.unsubscribe();
    };
  }, [subscribe, validId, refetch]);

  const order: AdminOrder | null = data?.data ?? null;

  return { order, isLoading, isFetching, error, refetch, isValidId: !!validId };
}
