import { useCallback } from "react";
import { OrderStatus } from "~/types/admin/enums";
import {
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
} from "@/stores/apis/admin/orders";
import type { OrderResponse } from "~/types/admin/order";

export function useOrderDetail(orderId: string | undefined) {
  const numericId = orderId ? parseInt(orderId, 10) : undefined;
  const validId = numericId && !isNaN(numericId) ? numericId : undefined;

  const { data, isLoading, refetch } = useGetOrderByIdQuery(validId!, {
    skip: !validId,
  });
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const order: OrderResponse | null = data?.data ?? null;

  const cancelOrder = useCallback(async () => {
    if (!validId) return;
    await updateOrderStatus({ id: validId, status: OrderStatus.CANCELED });
    refetch();
  }, [validId, updateOrderStatus, refetch]);

  const updateStatus = useCallback(
    async (newStatus: OrderStatus) => {
      if (!validId) return;
      await updateOrderStatus({ id: validId, status: newStatus });
      refetch();
    },
    [validId, updateOrderStatus, refetch],
  );

  return {
    order,
    isLoading,
    cancelOrder,
    updateStatus,
  };
}
