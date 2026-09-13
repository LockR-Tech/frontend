import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PaymentStatus } from "~/types/admin/enums";
import { useGetAllPaymentsQuery } from "@/stores/apis/admin/payments";
import { useGetAllUsersQuery } from "@/stores/apis/admin/users";
import type { PaymentResponse } from "~/types/admin/payment";
import { extractList } from "~/lib/extract-list";

export type PaymentStatusFilter = "ALL" | PaymentStatus;

export function usePayments() {
  const [status, setStatus] = useState<PaymentStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Number(urlParams.get("page") ?? "0");
  const pageSize = Number(urlParams.get("size") ?? "10");
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });

  const { data, isLoading, refetch } = useGetAllPaymentsQuery({
    page,
    size: pageSize,
    ...(status !== "ALL" ? { status } : {}),
  });

  // Join customer names from the users list (backend payments only carry userId).
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const userNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of extractList<{ id: number; fullName?: string; email?: string }>(
      usersData?.data,
    )) {
      m.set(u.id, u.fullName || u.email || `#${u.id}`);
    }
    return m;
  }, [usersData]);

  const allPayments: PaymentResponse[] = useMemo(
    () =>
      extractList<PaymentResponse>(data?.data).map((p) => ({
        ...p,
        customerName:
          p.customerName || userNameById.get((p.userId ?? p.customerId) as number),
      })),
    [data, userNameById],
  );

  const filteredPayments = useMemo(() => {
    if (!searchQuery) return allPayments;
    const query = searchQuery.toLowerCase();
    return allPayments.filter(
      (p) =>
        String(p.id).includes(query) ||
        String(p.orderId).includes(query) ||
        p.customerName?.toLowerCase().includes(query),
    );
  }, [allPayments, searchQuery]);

  const statusCounts = useMemo(
    () => ({
      ALL: allPayments.length,
      [PaymentStatus.COMPLETED]: allPayments.filter(
        (p) => p.status === PaymentStatus.COMPLETED,
      ).length,
      [PaymentStatus.PENDING]: allPayments.filter(
        (p) => p.status === PaymentStatus.PENDING,
      ).length,
      [PaymentStatus.PROCESSING]: allPayments.filter(
        (p) => p.status === PaymentStatus.PROCESSING,
      ).length,
      [PaymentStatus.FAILED]: allPayments.filter(
        (p) => p.status === PaymentStatus.FAILED,
      ).length,
      [PaymentStatus.REFUNDED]: allPayments.filter(
        (p) => p.status === PaymentStatus.REFUNDED,
      ).length,
    }),
    [allPayments, data],
  );

  const statistics = useMemo(
    () => ({
      total: allPayments.length,
      completed: allPayments.filter((p) => p.status === PaymentStatus.COMPLETED)
        .length,
      pending: allPayments.filter((p) => p.status === PaymentStatus.PENDING)
        .length,
      processing: allPayments.filter(
        (p) => p.status === PaymentStatus.PROCESSING,
      ).length,
      failed: allPayments.filter((p) => p.status === PaymentStatus.FAILED)
        .length,
      refunded: allPayments.filter((p) => p.status === PaymentStatus.REFUNDED)
        .length,
      totalAmount: allPayments
        .filter((p) => p.status === PaymentStatus.COMPLETED)
        .reduce((sum, p) => sum + (p.amount ?? 0), 0),
    }),
    [allPayments, data],
  );

  const clearFilters = () => {
    setStatus("ALL");
    setSearchQuery("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  return {
    payments: filteredPayments,
    totalElements: filteredPayments.length,
    totalPages: 1,
    statistics,
    isLoading,
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
