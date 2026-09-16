import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useGetAdminPaymentStatsQuery,
  useSearchAdminPaymentsQuery,
} from "@/stores/apis/admin/payments";
import { defaultReportRange } from "~/components/shared/reporting";
import type {
  AdminPayment,
  AdminPaymentKind,
  AdminPaymentSearchParams,
} from "~/types/admin/reporting";

// Bộ lọc nằm trên URL; lọc, phân trang và thống kê đều do backend làm.
//
// Hai khoảng ngày khác nhau và cố ý:
// - bảng giao dịch lọc theo `createdAt`, để trống = mọi thời điểm;
// - thẻ thống kê `/stats` luôn cần một khoảng `yyyy-MM-dd`, mặc định từ mùng 1 tới hôm nay.

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT = "createdAt,desc";

export type PaymentKindFilter = "ALL" | AdminPaymentKind;

export interface PaymentFilterState {
  status: string[];
  method: string[];
  kind: PaymentKindFilter;
  from: string;
  to: string;
  q: string;
  sort: string;
}

function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function usePayments() {
  const [urlParams, setUrlParams] = useSearchParams();

  const page = Math.max(0, Number(urlParams.get("page") ?? "0") || 0);
  const pageSize =
    Number(urlParams.get("size") ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

  const filters: PaymentFilterState = useMemo(
    () => ({
      status: readList(urlParams, "status"),
      method: readList(urlParams, "method"),
      kind: (urlParams.get("kind") as PaymentKindFilter) || "ALL",
      from: urlParams.get("from") ?? "",
      to: urlParams.get("to") ?? "",
      q: urlParams.get("q") ?? "",
      sort: urlParams.get("sort") ?? DEFAULT_SORT,
    }),
    [urlParams],
  );

  // Khoảng thống kê độc lập với bộ lọc bảng, để thẻ tổng quan luôn có số liệu.
  const statsRange = useMemo(() => {
    const fallback = defaultReportRange();
    return {
      from: urlParams.get("statsFrom") || fallback.from,
      to: urlParams.get("statsTo") || fallback.to,
    };
  }, [urlParams]);

  const patchParams = useCallback(
    (
      patch: Record<string, string | string[] | number | undefined>,
      resetPage = true,
    ) => {
      setUrlParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            const text = Array.isArray(value)
              ? value.join(",")
              : value?.toString() ?? "";
            if (text === "") next.delete(key);
            else next.set(key, text);
          }
          if (resetPage) next.set("page", "0");
          return next;
        },
        { replace: true },
      );
    },
    [setUrlParams],
  );

  const setFilter = useCallback(
    <K extends keyof PaymentFilterState>(key: K, value: PaymentFilterState[K]) =>
      patchParams({ [key]: value === "ALL" ? "" : value }),
    [patchParams],
  );

  const setDateRange = useCallback(
    (range: { from: string; to: string }) =>
      patchParams({ from: range.from, to: range.to }),
    [patchParams],
  );

  const setStatsRange = useCallback(
    (range: { from: string; to: string }) =>
      patchParams({ statsFrom: range.from, statsTo: range.to }, false),
    [patchParams],
  );

  const setPage = useCallback(
    (newPage: number) => patchParams({ page: newPage }, false),
    [patchParams],
  );

  const setPageSize = useCallback(
    (newSize: number) => patchParams({ size: newSize }),
    [patchParams],
  );

  const queryArgs: AdminPaymentSearchParams = useMemo(
    () => ({
      page,
      size: pageSize,
      sort: filters.sort,
      ...(filters.status.length ? { status: filters.status } : {}),
      ...(filters.method.length ? { method: filters.method } : {}),
      ...(filters.kind !== "ALL" ? { kind: filters.kind } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
    }),
    [page, pageSize, filters],
  );

  const {
    data: searchData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useSearchAdminPaymentsQuery(queryArgs);

  const {
    data: statsData,
    isFetching: isStatsFetching,
    error: statsError,
    refetch: refetchStats,
  } = useGetAdminPaymentStatsQuery(statsRange);

  const pageData = searchData?.data;
  const payments: AdminPayment[] = pageData?.content ?? [];

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.method.length > 0 ||
    filters.kind !== "ALL" ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.q !== "" ||
    filters.sort !== DEFAULT_SORT;

  const clearFilters = useCallback(() => {
    setUrlParams(new URLSearchParams(), { replace: true });
  }, [setUrlParams]);

  const refetchAll = useCallback(() => {
    refetch();
    refetchStats();
  }, [refetch, refetchStats]);

  return {
    payments,
    isLoading,
    isFetching,
    error,
    refetch: refetchAll,
    stats: statsData?.data,
    isStatsFetching,
    statsError,
    statsRange,
    setStatsRange,
    filters,
    setFilter,
    setDateRange,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages: pageData?.totalPages ?? 0,
    totalElements: pageData?.totalElements ?? 0,
    hasActiveFilters,
    clearFilters,
  };
}
