import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useSearchAdminOrdersQuery } from "@/stores/apis/admin/orders";
import type { AdminOrder, AdminOrderSearchParams } from "~/types/admin/reporting";

// Mọi bộ lọc nằm trên URL: người dùng chia sẻ được đường dẫn và F5 không mất bộ lọc.
// Lọc và phân trang do backend làm (`GET /api/admin/orders/search`), web không tự cắt trang.

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT = "createdAt,desc";

export interface OrderFilterState {
  status: string[];
  type: string[];
  paymentStatus: string[];
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

export function useOrders() {
  const [urlParams, setUrlParams] = useSearchParams();

  const page = Math.max(0, Number(urlParams.get("page") ?? "0") || 0);
  const pageSize = Number(urlParams.get("size") ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

  const filters: OrderFilterState = useMemo(
    () => ({
      status: readList(urlParams, "status"),
      type: readList(urlParams, "type"),
      paymentStatus: readList(urlParams, "paymentStatus"),
      from: urlParams.get("from") ?? "",
      to: urlParams.get("to") ?? "",
      q: urlParams.get("q") ?? "",
      sort: urlParams.get("sort") ?? DEFAULT_SORT,
    }),
    [urlParams],
  );

  /** Ghi bộ lọc lên URL; mọi thay đổi bộ lọc đưa về trang đầu. */
  const patchParams = useCallback(
    (patch: Record<string, string | string[] | number | undefined>, resetPage = true) => {
      setUrlParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            const text = Array.isArray(value) ? value.join(",") : value?.toString() ?? "";
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
    <K extends keyof OrderFilterState>(key: K, value: OrderFilterState[K]) =>
      patchParams({ [key]: value }),
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

  const setDateRange = useCallback(
    (range: { from: string; to: string }) =>
      patchParams({ from: range.from, to: range.to }),
    [patchParams],
  );

  const queryArgs: AdminOrderSearchParams = useMemo(
    () => ({
      page,
      size: pageSize,
      sort: filters.sort,
      ...(filters.status.length ? { status: filters.status } : {}),
      ...(filters.type.length ? { type: filters.type } : {}),
      ...(filters.paymentStatus.length
        ? { paymentStatus: filters.paymentStatus }
        : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
    }),
    [page, pageSize, filters],
  );

  const { data, isLoading, isFetching, error, refetch } =
    useSearchAdminOrdersQuery(queryArgs);

  const pageData = data?.data;
  const orders: AdminOrder[] = pageData?.content ?? [];

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.type.length > 0 ||
    filters.paymentStatus.length > 0 ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.q !== "" ||
    filters.sort !== DEFAULT_SORT;

  const clearFilters = useCallback(() => {
    setUrlParams(new URLSearchParams(), { replace: true });
  }, [setUrlParams]);

  return {
    orders,
    isLoading,
    isFetching,
    error,
    refetch,
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
