import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useGetAllStoresQuery,
  useDeleteStoreMutation,
  useUpdateStoreStatusMutation,
  isStoreActive,
  type StoreRecord,
} from "@/stores/apis/admin/stores";
import { extractList } from "~/lib/extract-list";
import { useStoreRevenue } from "./useStoreRevenue";

export type StoreStatus = "ALL" | "ACTIVE" | "INACTIVE";

/** Ưu tiên `message` backend trả (vd ràng buộc tủ còn gắn với cửa hàng). */
export function storeErrorMessage(err: unknown, fallback: string): string {
  const e = err as { data?: { message?: unknown }; status?: unknown } | undefined;
  if (typeof e?.data?.message === "string" && e.data.message.trim()) return e.data.message;
  if (e?.status === "FETCH_ERROR") return "Không kết nối được máy chủ";
  return fallback;
}

// Cùng tham số với dashboard/lockers để dùng chung cache — backend bỏ qua page/size.
const ALL_STORES_ARGS = { page: 0, size: 1000 };

export function useStores() {
  const [status, setStatusState] = useState<StoreStatus>("ALL");
  const [searchQuery, setSearchQueryState] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Math.max(0, Number(urlParams.get("page") ?? "0") || 0);
  const pageSize = Math.max(1, Number(urlParams.get("size") ?? "10") || 10);
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });
  const setStatus = (value: StoreStatus) => {
    setStatusState(value);
    setPage(0);
  };
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value);
    if (page !== 0) setPage(0);
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreRecord | null>(null);
  const [statusPendingIds, setStatusPendingIds] = useState<Set<number>>(new Set());

  const { data, isLoading, refetch } = useGetAllStoresQuery(ALL_STORES_ARGS);
  const [deleteStore, { isLoading: isDeleting }] = useDeleteStoreMutation();
  const [updateStoreStatus] = useUpdateStoreStatusMutation();
  const storeRevenue = useStoreRevenue();

  const allStores = useMemo(() => extractList<StoreRecord>(data?.data), [data]);

  const filteredStores = useMemo(() => {
    let result = allStores;

    if (status !== "ALL") {
      result = result.filter((store) =>
        status === "ACTIVE" ? isStoreActive(store) : !isStoreActive(store),
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (store) =>
          store.name?.toLowerCase().includes(query) ||
          store.address?.toLowerCase().includes(query) ||
          store.contactPhone?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [allStores, status, searchQuery]);

  // Phân trang tại client sau khi lọc.
  const totalElements = filteredStores.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const pagedStores = useMemo(
    () => filteredStores.slice(page * pageSize, (page + 1) * pageSize),
    [filteredStores, page, pageSize],
  );

  useEffect(() => {
    if (!isLoading && page > 0 && page >= totalPages) {
      setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(totalPages - 1)); return next; });
    }
  }, [isLoading, page, totalPages, setUrlParams]);

  const statusCounts = useMemo(
    () => ({
      ALL: allStores.length,
      ACTIVE: allStores.filter((s) => isStoreActive(s)).length,
      INACTIVE: allStores.filter((s) => !isStoreActive(s)).length,
    }),
    [allStores],
  );

  const handleCreate = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleEdit = useCallback((store: StoreRecord) => {
    setSelectedStore(store);
    setIsEditModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStore(deleteTarget.id).unwrap();
      toast.success("Đã xoá cửa hàng");
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Không xoá được cửa hàng", {
        description: storeErrorMessage(err, "Máy chủ từ chối yêu cầu xoá."),
      });
    }
  };

  const handleToggleStatus = async (store: StoreRecord) => {
    if (statusPendingIds.has(store.id)) return;
    const nextStatus = isStoreActive(store) ? "INACTIVE" : "ACTIVE";
    setStatusPendingIds((prev) => new Set(prev).add(store.id));
    try {
      await updateStoreStatus({ id: store.id, data: { status: nextStatus } }).unwrap();
      toast.success(nextStatus === "ACTIVE" ? "Đã kích hoạt cửa hàng" : "Đã ngừng hoạt động cửa hàng");
    } catch (err) {
      toast.error("Không đổi được trạng thái cửa hàng", {
        description: storeErrorMessage(err, "Vui lòng thử lại."),
      });
    } finally {
      setStatusPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(store.id);
        return next;
      });
    }
  };

  const clearFilters = () => {
    setStatusState("ALL");
    setSearchQueryState("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  return {
    stores: pagedStores,
    totalElements,
    totalPages,
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
    isCreateModalOpen,
    setIsCreateModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    selectedStore,
    handleCreate,
    handleEdit,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    isDeleting,
    handleToggleStatus,
    statusPendingIds,
    storeRevenue,
  };
}
