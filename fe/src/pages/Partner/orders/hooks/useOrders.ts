import { useState, useEffect, useCallback } from "react";
import {
  useGetPartnerOrdersQuery,
  useAcceptOrderMutation,
  useUpdateOrderWeightMutation,
  useProcessOrderMutation,
  useMarkOrderReadyMutation,
  POLLING_INTERVAL,
} from "@/stores/apis/partnerApi";
import {
  usePartnerWebSocket,
  OrderUpdateNotification,
} from "@/hooks/useWebSocket";
import type { PartnerOrder, StaffAccessCode } from "@/types/partner.type";
import type { OrderStatus } from "@/types/partner.enum";
import { getErrorMessage } from "../utils/order-helpers";

export function useOrders() {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-hide error toast
  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  // RTK Query
  const {
    data: ordersData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetPartnerOrdersQuery(
    {
      status: activeTab === "ALL" ? undefined : (activeTab as OrderStatus),
      page,
      size,
      search: debouncedSearch || undefined,
    },
    {
      // WebSocket handles real-time updates — only use polling as a fallback
      pollingInterval: POLLING_INTERVAL * 6, // 60s fallback
      refetchOnFocus: false,
      refetchOnReconnect: true,
    },
  );

  // Mutations
  const [acceptOrder, { isLoading: isAccepting }] = useAcceptOrderMutation();
  const [updateWeight, { isLoading: isUpdatingWeight }] =
    useUpdateOrderWeightMutation();
  const [processOrder, { isLoading: isProcessing }] = useProcessOrderMutation();
  const [markReady, { isLoading: isMarkingReady }] =
    useMarkOrderReadyMutation();

  // WebSocket
  const handleOrderUpdate = useCallback(
    (update: OrderUpdateNotification) => {
      console.log("[Orders] Real-time update:", update);
      refetch();
    },
    [refetch],
  );

  const {
    connected: wsConnected,
    connect: wsConnect,
    error: wsError,
  } = usePartnerWebSocket({
    onOrderUpdate: handleOrderUpdate,
    debug: import.meta.env.DEV,
  });

  useEffect(() => {
    wsConnect();
  }, [wsConnect]);

  // Pagination
  const orders = ordersData?.content || [];
  const totalPages = ordersData?.totalPages || 0;
  const totalElements = ordersData?.totalElements || 0;
  const currentPage = ordersData?.number || 0;

  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    const pages: (number | "ellipsis")[] = [];
    pages.push(0);
    if (currentPage > 2) pages.push("ellipsis");
    for (
      let i = Math.max(1, currentPage - 1);
      i <= Math.min(totalPages - 2, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 3) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages - 1);
    return pages;
  };

  // Handlers
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(0);
  };

  const handleAcceptOrder = async (
    order: PartnerOrder,
  ): Promise<StaffAccessCode | null> => {
    try {
      const result = await acceptOrder(order.id).unwrap();
      return result.staffAccessCode;
    } catch (err: unknown) {
      setErrorToast(getErrorMessage(err));
      return null;
    }
  };

  const handleUpdateWeight = async (
    orderId: number,
    weight: number,
  ): Promise<boolean> => {
    try {
      await updateWeight({
        orderId,
        actualWeight: weight,
        weightUnit: "kg",
      }).unwrap();
      return true;
    } catch (err: unknown) {
      setErrorToast(getErrorMessage(err));
      return false;
    }
  };

  const handleProcessOrder = async (orderId: number): Promise<boolean> => {
    try {
      await processOrder(orderId).unwrap();
      return true;
    } catch (err: unknown) {
      setErrorToast(getErrorMessage(err));
      return false;
    }
  };

  const handleMarkReady = async (
    orderId: number,
  ): Promise<StaffAccessCode | null> => {
    try {
      const result = await markReady(orderId).unwrap();
      return result.staffAccessCode;
    } catch (err: unknown) {
      setErrorToast(getErrorMessage(err));
      return null;
    }
  };

  return {
    // State
    activeTab,
    page,
    size,
    searchQuery,
    errorToast,
    setSearchQuery,
    setErrorToast,
    handleTabChange,
    setPage,

    // Data
    orders,
    totalPages,
    totalElements,
    currentPage,
    isLoading,
    isFetching,
    error,
    refetch,
    getPageNumbers,

    // Mutations
    handleAcceptOrder,
    handleUpdateWeight,
    handleProcessOrder,
    handleMarkReady,
    isAccepting,
    isUpdatingWeight,
    isProcessing,
    isMarkingReady,

    // WebSocket
    wsConnected,
    wsError,
  };
}
