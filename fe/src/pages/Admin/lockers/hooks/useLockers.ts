import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LockerStatus } from "~/types/admin/enums";
import {
  useGetAllLockersQuery,
  useSetLockerMaintenanceMutation,
  useGetAllStoresQuery,
} from "~/stores/apis/admin";
import { extractList } from "~/lib/extract-list";
import type { AdminLockerResponse } from "~/types";

export type LockerStatusFilter = "ALL" | LockerStatus;

export function useLockers() {
  const [status, setStatus] = useState<LockerStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Number(urlParams.get("page") ?? "0");
  const pageSize = Number(urlParams.get("size") ?? "10");
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });

  const { data, isLoading, refetch } = useGetAllLockersQuery({
    page: 0,
    size: 200,
  });

  // Join store names from the stores list (locker payload only carries storeId).
  const { data: storesData } = useGetAllStoresQuery({ page: 0, size: 1000 });
  const storeNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of extractList<{ id: number; name?: string }>(storesData?.data)) {
      m.set(s.id, s.name ?? `#${s.id}`);
    }
    return m;
  }, [storesData]);

  const allLockers = useMemo(
    () =>
      extractList<AdminLockerResponse>(data?.data).map((l) => ({
        ...l,
        storeName: l.storeName || storeNameById.get(l.storeId),
      })),
    [data, storeNameById],
  );

  const filteredLockers = useMemo(() => {
    let result = [...allLockers];

    if (status !== "ALL") {
      result = result.filter((locker) => locker.status === status);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (locker) =>
          locker.name?.toLowerCase().includes(query) ||
          locker.code?.toLowerCase().includes(query) ||
          locker.storeName?.toLowerCase().includes(query) ||
          locker.address?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [allLockers, status, searchQuery]);

  const paginatedLockers = useMemo(() => {
    const start = page * pageSize;
    return filteredLockers.slice(start, start + pageSize);
  }, [filteredLockers, page, pageSize]);

  const statusCounts = useMemo(
    () => ({
      ALL: allLockers.length,
      [LockerStatus.ACTIVE]: allLockers.filter(
        (l) => l.status === LockerStatus.ACTIVE,
      ).length,
      [LockerStatus.INACTIVE]: allLockers.filter(
        (l) => l.status === LockerStatus.INACTIVE,
      ).length,
      [LockerStatus.MAINTENANCE]: allLockers.filter(
        (l) => l.status === LockerStatus.MAINTENANCE,
      ).length,
      [LockerStatus.DISCONNECTED]: allLockers.filter(
        (l) => l.status === LockerStatus.DISCONNECTED,
      ).length,
    }),
    [allLockers],
  );

  const clearFilters = () => {
    setStatus("ALL");
    setSearchQuery("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  const [setMaintenance] = useSetLockerMaintenanceMutation();

  const handleMaintenance = async (lockerId: number) => {
    try {
      await setMaintenance({ id: lockerId, data: { maintenance: true } }).unwrap();
      toast.success("Đã chuyển tủ sang bảo trì");
      refetch();
    } catch {
      toast.error("Không chuyển được trạng thái bảo trì");
    }
  };

  const handleActivate = async (lockerId: number) => {
    try {
      await setMaintenance({ id: lockerId, data: { maintenance: false } }).unwrap();
      toast.success("Tủ đã hoạt động lại");
      refetch();
    } catch {
      toast.error("Không kích hoạt được tủ");
    }
  };

  return {
    handleMaintenance,
    handleActivate,
    lockers: paginatedLockers,
    totalElements: filteredLockers.length,
    totalPages: Math.ceil(filteredLockers.length / pageSize),
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
