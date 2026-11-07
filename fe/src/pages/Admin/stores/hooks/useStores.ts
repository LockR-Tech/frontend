import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useGetAllStoresQuery,
  useDeleteStoreMutation,
  useUpdateStoreStatusMutation,
  isStoreActive,
  type StoreRecord,
} from "@/stores/apis/admin/stores";
import { extractList } from "~/lib/extract-list";
import { useStoreRevenue } from "./useStoreRevenue";
import { areaOf } from "../store-area";
import i18n from "~/utils/i18n";

export type StoreStatus = "ALL" | "ACTIVE" | "INACTIVE";
/** "ALL" | tên khu vực (areaOf) | AREA_UNKNOWN cho địa chỉ không tách được. */
export const AREA_ALL = "ALL";
export const AREA_UNKNOWN = "__UNKNOWN__";

/** Ưu tiên `message` backend trả (vd ràng buộc tủ còn gắn với cửa hàng). */
export function storeErrorMessage(err: unknown, fallback: string): string {
  const e = err as { data?: { message?: unknown }; status?: unknown } | undefined;
  if (typeof e?.data?.message === "string" && e.data.message.trim()) return e.data.message;
  if (e?.status === "FETCH_ERROR") return i18n.t("common.serverUnreachable");
  return fallback;
}

// Cùng tham số với dashboard/lockers để dùng chung cache — backend bỏ qua page/size.
const ALL_STORES_ARGS = { page: 0, size: 1000 };

export function useStores() {
  const { t } = useTranslation();
  const [status, setStatusState] = useState<StoreStatus>("ALL");
  const [searchQuery, setSearchQueryState] = useState("");
  const [area, setAreaState] = useState<string>(AREA_ALL);
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
  const setArea = (value: string) => {
    setAreaState(value);
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

    if (area !== AREA_ALL) {
      result = result.filter((store) => (areaOf(store.address) ?? AREA_UNKNOWN) === area);
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
  }, [allStores, status, area, searchQuery]);

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

  /** Khu vực có trong dữ liệu, kèm số địa điểm, xếp theo tên; "chưa rõ" để cuối. */
  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const store of allStores) {
      const key = areaOf(store.address) ?? AREA_UNKNOWN;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) =>
        a.value === AREA_UNKNOWN ? 1 : b.value === AREA_UNKNOWN ? -1 : a.value.localeCompare(b.value, "vi"),
      );
  }, [allStores]);

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
      toast.success(t("admin.stores.toast.deleted"));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(t("admin.stores.toast.deleteFailed"), {
        description: storeErrorMessage(err, t("admin.stores.toast.deleteRejected")),
      });
    }
  };

  const handleToggleStatus = async (store: StoreRecord) => {
    if (statusPendingIds.has(store.id)) return;
    const nextStatus = isStoreActive(store) ? "INACTIVE" : "ACTIVE";
    setStatusPendingIds((prev) => new Set(prev).add(store.id));
    try {
      await updateStoreStatus({ id: store.id, data: { status: nextStatus } }).unwrap();
      toast.success(
        nextStatus === "ACTIVE"
          ? t("admin.stores.toast.activated")
          : t("admin.stores.toast.deactivated"),
      );
    } catch (err) {
      toast.error(t("admin.stores.toast.statusFailed"), {
        description: storeErrorMessage(err, t("common.pleaseRetry")),
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
    setAreaState(AREA_ALL);
    setSearchQueryState("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || area !== AREA_ALL || searchQuery !== "";

  return {
    stores: pagedStores,
    /// Mọi dòng khớp bộ lọc (mọi trang) — cho "Xoá tất cả".
    filteredIds: filteredStores.map((s) => s.id),
    deleteOne: (id: number) => deleteStore(id).unwrap(),
    totalElements,
    totalPages,
    isLoading,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    area,
    setArea,
    areaCounts,
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
