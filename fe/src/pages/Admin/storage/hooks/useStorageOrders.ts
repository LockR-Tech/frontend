import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSearchAdminOrdersQuery } from "@/stores/apis/admin/orders";
import { useGetBusinessSettingsQuery } from "@/stores/apis/admin/businessSettings";
import { useWebSocket } from "@/hooks/useWebSocket";
import { OrderSettingsKeys } from "~/constants/order-settings-keys";
import { toReportError } from "~/lib/report-error";
import type { AdminOrder } from "~/types/admin/reporting";

// Đơn quá hạn lấy hàng bị hệ thống (hoặc admin) dời đồ vào kho đều ở trạng thái EXPIRED
// (OrderService.moveToStorage): ô đã nhả, PIN đã huỷ, khách phải tới quầy nhận lại.
export const STORED_STATUS = "EXPIRED";

const DEFAULT_PAGE_SIZE = 20;
/** Hạn lấy cũ nhất trước ≈ nằm kho lâu nhất trước. */
export const DEFAULT_STORAGE_SORT = "pickupDeadline,asc";

/** Bộ lọc thanh toán dựng sẵn cho các thẻ thống kê. */
export type StoragePaymentFilter = "ALL" | "UNPAID" | "PAID";

export interface StorageFilterState {
  q: string;
  type: string[];
  payment: StoragePaymentFilter;
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

function readPayment(value: string | null): StoragePaymentFilter {
  return value === "UNPAID" || value === "PAID" ? value : "ALL";
}

export function useStorageOrders() {
  const [urlParams, setUrlParams] = useSearchParams();

  const page = Math.max(0, Number(urlParams.get("page") ?? "0") || 0);
  const pageSize = Number(urlParams.get("size") ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

  const filters: StorageFilterState = useMemo(
    () => ({
      q: urlParams.get("q") ?? "",
      type: readList(urlParams, "type"),
      payment: readPayment(urlParams.get("payment")),
      sort: urlParams.get("sort") ?? DEFAULT_STORAGE_SORT,
    }),
    [urlParams],
  );

  const patchParams = useCallback(
    (patch: Record<string, string | string[] | number | undefined>, resetPage = true) => {
      setUrlParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            const text = Array.isArray(value) ? value.join(",") : value?.toString() ?? "";
            if (text === "" || (key === "payment" && text === "ALL")) next.delete(key);
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
    <K extends keyof StorageFilterState>(key: K, value: StorageFilterState[K]) =>
      patchParams({ [key]: value }),
    [patchParams],
  );
  const setPage = useCallback((next: number) => patchParams({ page: next }, false), [patchParams]);
  const setPageSize = useCallback((next: number) => patchParams({ size: next }), [patchParams]);
  const clearFilters = useCallback(
    () => setUrlParams(new URLSearchParams(), { replace: true }),
    [setUrlParams],
  );

  // Backend cũ chưa cho sắp theo `pickupDeadline` (trả INVALID_SORT): lùi về `createdAt` cùng chiều,
  // gần đúng vì đơn tạo trước thường hết hạn trước. Nhớ trong phiên để không gọi lỗi lại.
  const [legacySort, setLegacySort] = useState(false);
  const effectiveSort =
    legacySort && filters.sort.startsWith("pickupDeadline")
      ? filters.sort.replace("pickupDeadline", "createdAt")
      : filters.sort;

  const list = useSearchAdminOrdersQuery({
    page,
    size: pageSize,
    status: [STORED_STATUS],
    type: filters.type.length > 0 ? filters.type : undefined,
    paymentStatus: filters.payment === "ALL" ? undefined : [filters.payment],
    q: filters.q || undefined,
    sort: effectiveSort,
  });

  useEffect(() => {
    if (!legacySort && toReportError(list.error)?.code === "INVALID_SORT") setLegacySort(true);
  }, [legacySort, list.error]);

  // Thẻ thống kê chỉ cần tổng số dòng: hỏi trang 1 phần tử, không phụ thuộc bộ lọc đang chọn.
  const total = useSearchAdminOrdersQuery({ page: 0, size: 1, status: [STORED_STATUS] });
  const unpaid = useSearchAdminOrdersQuery({
    page: 0,
    size: 1,
    status: [STORED_STATUS],
    paymentStatus: ["UNPAID"],
  });
  const paid = useSearchAdminOrdersQuery({
    page: 0,
    size: 1,
    status: [STORED_STATUS],
    paymentStatus: ["PAID"],
  });

  // Quy tắc "quá hạn bao nhiêu giờ thì dời vào kho" để giải thích trên đầu trang.
  const settings = useGetBusinessSettingsQuery("order");
  const releaseHours = useMemo(() => {
    const row = settings.data?.data?.find((s) => s.key === OrderSettingsKeys.OVERDUE_RELEASE_HOURS);
    const value = Number(row?.value ?? row?.defaultValue);
    return Number.isFinite(value) ? value : null;
  }, [settings.data]);

  const { refetch: refetchList } = list;
  const { refetch: refetchTotal } = total;
  const { refetch: refetchUnpaid } = unpaid;
  const { refetch: refetchPaid } = paid;
  const refetchAll = useCallback(() => {
    refetchList();
    refetchTotal();
    refetchUnpaid();
    refetchPaid();
  }, [refetchList, refetchTotal, refetchUnpaid, refetchPaid]);

  // Job quá hạn chạy mỗi giờ: đơn mới vào kho hoặc vừa trao trả thì làm mới ngay.
  const { subscribe } = useWebSocket({ autoConnect: true });
  useEffect(() => {
    if (!subscribe) return;
    const sub = subscribe<unknown>("/topic/orders", () => refetchAll());
    return () => sub?.unsubscribe();
  }, [subscribe, refetchAll]);

  const pageData = list.data?.data;
  const orders: AdminOrder[] = pageData?.content ?? [];

  return {
    orders,
    isLoading: list.isLoading,
    isFetching: list.isFetching,
    // Lỗi INVALID_SORT đang được tự xử lý bằng cách lùi về createdAt — không báo cho người dùng.
    error: toReportError(list.error)?.code === "INVALID_SORT" ? undefined : list.error,
    refetch: refetchAll,
    filters,
    setFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages: pageData?.totalPages ?? 0,
    totalElements: pageData?.totalElements ?? 0,
    hasActiveFilters:
      filters.q !== "" ||
      filters.type.length > 0 ||
      filters.payment !== "ALL" ||
      filters.sort !== DEFAULT_STORAGE_SORT,
    clearFilters,
    stats: {
      isLoading: total.isLoading || unpaid.isLoading || paid.isLoading,
      total: total.data?.data?.totalElements ?? 0,
      unpaid: unpaid.data?.data?.totalElements ?? 0,
      paid: paid.data?.data?.totalElements ?? 0,
    },
    releaseHours,
  };
}
