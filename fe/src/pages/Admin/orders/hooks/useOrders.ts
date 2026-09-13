import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { OrderStatus } from "~/types/admin/enums";
import { useGetAllOrdersQuery } from "@/stores/apis/admin/orders";
import type { OrderResponse } from "~/types/admin/order";
import { extractList } from "~/lib/extract-list";

type OrderStatusFilter = "ALL" | OrderStatus;

export function useOrders() {
  const [status, setStatus] = useState<OrderStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Number(urlParams.get("page") ?? "0");
  const pageSize = Number(urlParams.get("size") ?? "10");
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });

  const { data, isLoading, refetch } = useGetAllOrdersQuery({
    page,
    size: pageSize,
    ...(status !== "ALL" ? { status } : {}),
  });

  const allOrders: OrderResponse[] = extractList<OrderResponse>(data?.data);

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return allOrders;
    const query = searchQuery.toLowerCase();
    return allOrders.filter(
      (order) =>
        String(order.id).includes(query) ||
        order.senderName?.toLowerCase().includes(query),
    );
  }, [allOrders, searchQuery]);

  const statusCounts = useMemo(
    () => ({
      ALL: allOrders.length,
      [OrderStatus.INITIALIZED]: allOrders.filter(
        (o) => o.status === OrderStatus.INITIALIZED,
      ).length,
      [OrderStatus.RESERVED]: allOrders.filter(
        (o) => o.status === OrderStatus.RESERVED,
      ).length,
      [OrderStatus.WAITING]: allOrders.filter(
        (o) => o.status === OrderStatus.WAITING,
      ).length,
      [OrderStatus.COLLECTED]: allOrders.filter(
        (o) => o.status === OrderStatus.COLLECTED,
      ).length,
      [OrderStatus.PROCESSING]: allOrders.filter(
        (o) => o.status === OrderStatus.PROCESSING,
      ).length,
      [OrderStatus.READY]: allOrders.filter(
        (o) => o.status === OrderStatus.READY,
      ).length,
      [OrderStatus.RETURNED]: allOrders.filter(
        (o) => o.status === OrderStatus.RETURNED,
      ).length,
      [OrderStatus.COMPLETED]: allOrders.filter(
        (o) => o.status === OrderStatus.COMPLETED,
      ).length,
      [OrderStatus.CANCELED]: allOrders.filter(
        (o) => o.status === OrderStatus.CANCELED,
      ).length,
    }),
    [allOrders, data],
  );

  const clearFilters = () => {
    setStatus("ALL");
    setSearchQuery("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  return {
    orders: filteredOrders,
    totalElements: filteredOrders.length,
    totalPages: 1,
    isLoading,
    error: null,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    statusCounts,
    refetch,
    clearFilters,
    hasActiveFilters,
  };
}
