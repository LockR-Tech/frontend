import { useState, useCallback } from "react";
import {
  useGetPartnerOrderByIdQuery,
  useAcceptOrderMutation,
  useUpdateOrderWeightMutation,
  useProcessOrderMutation,
  useMarkOrderReadyMutation,
} from "@/stores/apis/partnerApi";
import type { StaffAccessCode } from "@/types/partner.type";
import { getErrorMessage } from "../utils/order-helpers";

export function useOrderDetail(orderId: string | undefined) {
  const numericId = orderId ? parseInt(orderId, 10) : undefined;
  const validId = numericId && !isNaN(numericId) ? numericId : undefined;

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useGetPartnerOrderByIdQuery(validId!, {
    skip: !validId,
  });

  const [acceptOrder, { isLoading: isAccepting }] = useAcceptOrderMutation();
  const [updateWeight, { isLoading: isUpdatingWeight }] =
    useUpdateOrderWeightMutation();
  const [processOrder, { isLoading: isProcessing }] = useProcessOrderMutation();
  const [markReady, { isLoading: isMarkingReady }] =
    useMarkOrderReadyMutation();

  const [errorToast, setErrorToast] = useState<string | null>(null);

  const handleAcceptOrder =
    useCallback(async (): Promise<StaffAccessCode | null> => {
      if (!validId) return null;
      try {
        const result = await acceptOrder(validId).unwrap();
        refetch();
        return result.staffAccessCode;
      } catch (err) {
        setErrorToast(getErrorMessage(err));
        return null;
      }
    }, [validId, acceptOrder, refetch]);

  const handleUpdateWeight = useCallback(
    async (weight: number): Promise<boolean> => {
      if (!validId) return false;
      try {
        await updateWeight({
          orderId: validId,
          actualWeight: weight,
          weightUnit: "kg",
        }).unwrap();
        refetch();
        return true;
      } catch (err) {
        setErrorToast(getErrorMessage(err));
        return false;
      }
    },
    [validId, updateWeight, refetch],
  );

  const handleProcessOrder = useCallback(async (): Promise<boolean> => {
    if (!validId) return false;
    try {
      await processOrder(validId).unwrap();
      refetch();
      return true;
    } catch (err) {
      setErrorToast(getErrorMessage(err));
      return false;
    }
  }, [validId, processOrder, refetch]);

  const handleMarkReady =
    useCallback(async (): Promise<StaffAccessCode | null> => {
      if (!validId) return null;
      try {
        const result = await markReady(validId).unwrap();
        refetch();
        return result.staffAccessCode;
      } catch (err) {
        setErrorToast(getErrorMessage(err));
        return null;
      }
    }, [validId, markReady, refetch]);

  return {
    order: order ?? null,
    isLoading,
    error,
    refetch,
    errorToast,
    setErrorToast,
    handleAcceptOrder,
    handleUpdateWeight,
    handleProcessOrder,
    handleMarkReady,
    isAccepting,
    isUpdatingWeight,
    isProcessing,
    isMarkingReady,
  };
}
