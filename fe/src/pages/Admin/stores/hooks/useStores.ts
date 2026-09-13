import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useGetAllStoresQuery,
  useDeleteStoreMutation,
} from "@/stores/apis/admin/stores";
import type { AdminStoreResponse } from "~/types/admin/store";
import { extractList } from "~/lib/extract-list";

export type StoreStatus = "ALL" | "ACTIVE" | "INACTIVE";

export function useStores() {
  const [status, setStatus] = useState<StoreStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Number(urlParams.get("page") ?? "0");
  const pageSize = Number(urlParams.get("size") ?? "10");
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<AdminStoreResponse | null>(
    null,
  );

  const { data, isLoading, refetch } = useGetAllStoresQuery({
    page,
    size: pageSize,
  });
  const [deleteStore] = useDeleteStoreMutation();

  const allStores: AdminStoreResponse[] = extractList<AdminStoreResponse>(data?.data);

  const filteredStores = useMemo(() => {
    let result = [...allStores];

    if (status !== "ALL") {
      result = result.filter((store) =>
        status === "ACTIVE" ? store.active : !store.active,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (store) =>
          store.name?.toLowerCase().includes(query) ||
          store.address?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [allStores, status, searchQuery]);

  const statusCounts = useMemo(
    () => ({
      ALL: allStores.length,
      ACTIVE: allStores.filter((s) => s.active).length,
      INACTIVE: allStores.filter((s) => !s.active).length,
    }),
    [allStores],
  );

  const handleCreate = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleEdit = useCallback((store: AdminStoreResponse) => {
    setSelectedStore(store);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (storeId: number) => {
      toast.promise(deleteStore(storeId).unwrap(), {
        loading: "Đang xóa cửa hàng...",
        success: "Đã xóa cửa hàng thành công!",
        error: "Không thể xóa cửa hàng",
      });
    },
    [deleteStore],
  );

  const clearFilters = () => {
    setStatus("ALL");
    setSearchQuery("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  return {
    stores: filteredStores,
    totalElements: filteredStores.length,
    totalPages: 1,
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
    handleDelete,
    isMock: false,
  };
}
