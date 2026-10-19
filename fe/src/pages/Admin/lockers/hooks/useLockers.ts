import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { LockerStatus } from "~/types/admin/enums";
import {
  useGetAllLockersQuery,
  useSetLockerMaintenanceMutation,
  useGetAllStoresQuery,
  useDeleteLockerMutation,
  useDeleteLockersBatchMutation,
  useDeleteAllLockersMutation,
} from "~/stores/apis/admin";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { extractList } from "~/lib/extract-list";
import type { AdminLockerResponse } from "~/types";

export type LockerStatusFilter = "ALL" | LockerStatus;

export function useLockers() {
  const { t } = useTranslation();
  const [status, setStatusState] = useState<LockerStatusFilter>("ALL");
  const [searchQuery, setSearchQueryState] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Number(urlParams.get("page") ?? "0");
  const pageSize = Number(urlParams.get("size") ?? "10");
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });
  // Đổi bộ lọc / từ khoá ⇒ về trang đầu, tránh đứng ở trang không còn dữ liệu
  // Chỉ đổi URL khi thật sự đang ở trang khác 0, tránh thêm một mục lịch sử mỗi lần gõ phím
  const setStatus = (value: LockerStatusFilter) => {
    setStatusState(value);
    if (page !== 0) setPage(0);
  };
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value);
    if (page !== 0) setPage(0);
  };

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

  // Join technician names from users list
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const technicianNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of extractList<{ id: number; fullName?: string; name?: string }>(usersData?.data)) {
      const name = (u.fullName || u.name || "").trim();
      if (name) m.set(u.id, name);
    }
    return m;
  }, [usersData]);

  const allLockers = useMemo(
    () =>
      extractList<AdminLockerResponse>(data?.data).map((l) => {
        const resolvedTechName =
          (l.assignedTechnicianId ? technicianNameById.get(l.assignedTechnicianId) : undefined) ||
          (l.assignedTechnicianName && !l.assignedTechnicianName.startsWith("KTV #")
            ? l.assignedTechnicianName
            : undefined);

        return {
          ...l,
          storeName: l.storeName || storeNameById.get(l.storeId),
          assignedTechnicianName: resolvedTechName ?? l.assignedTechnicianName,
        };
      }),
    [data, storeNameById, technicianNameById],
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
          locker.address?.toLowerCase().includes(query) ||
          locker.assignedTechnicianName?.toLowerCase().includes(query),
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
    }),
    [allLockers],
  );

  const clearFilters = () => {
    setStatusState("ALL");
    setSearchQueryState("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  const [setMaintenance] = useSetLockerMaintenanceMutation();
  const [deleteLockerMutation, { isLoading: isDeletingSingle }] = useDeleteLockerMutation();
  const [deleteLockersBatchMutation, { isLoading: isDeletingBatch }] = useDeleteLockersBatchMutation();
  const [deleteAllLockersMutation, { isLoading: isDeletingAll }] = useDeleteAllLockersMutation();

  const handleMaintenance = async (lockerId: number) => {
    try {
      await setMaintenance({ id: lockerId, data: { maintenance: true } }).unwrap();
      toast.success(t("admin.lockers.toast.maintenanceOn"));
      refetch();
    } catch {
      toast.error(t("admin.lockers.toast.maintenanceFailed"));
    }
  };

  const handleActivate = async (lockerId: number) => {
    try {
      await setMaintenance({ id: lockerId, data: { maintenance: false } }).unwrap();
      toast.success(t("admin.lockers.toast.reactivated"));
      refetch();
    } catch {
      toast.error(t("admin.lockers.toast.activateFailed"));
    }
  };

  const handleDeleteLocker = async (lockerId: number) => {
    try {
      await deleteLockerMutation(lockerId).unwrap();
      toast.success(t("admin.lockers.toast.deleteSuccess", "Đã xóa tủ thành công"));
      refetch();
      return true;
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || t("admin.lockers.toast.deleteFailed", "Không thể xóa tủ")
      );
      return false;
    }
  };

  const handleDeleteBatchLockers = async (lockerIds: number[]) => {
    if (!lockerIds.length) return false;
    try {
      const res = await deleteLockersBatchMutation({ lockerIds }).unwrap();
      const count = res.data?.deletedCount ?? lockerIds.length;
      toast.success(t("admin.lockers.toast.deleteBatchSuccess", `Đã xóa thành công ${count} tủ!`));
      refetch();
      return true;
    } catch {
      // Fallback: nếu server chưa có batch-delete, xóa lần lượt từng tủ bằng deleteLockerMutation (đã có sẵn)
      try {
        await Promise.all(lockerIds.map((id) => deleteLockerMutation(id).unwrap()));
        toast.success(t("admin.lockers.toast.deleteBatchSuccess", `Đã xóa thành công ${lockerIds.length} tủ!`));
        refetch();
        return true;
      } catch (fallbackErr: any) {
        toast.error(
          fallbackErr?.data?.message || fallbackErr?.message || t("admin.lockers.toast.deleteBatchFailed", "Không thể xóa các tủ đã chọn")
        );
        return false;
      }
    }
  };

  const handleDeleteAllLockers = async () => {
    if (!allLockers.length) return false;
    try {
      const res = await deleteAllLockersMutation().unwrap();
      const count = res.data?.deletedCount ?? allLockers.length;
      toast.success(t("admin.lockers.toast.deleteAllSuccess", `Đã xóa tất cả ${count} tủ thành công!`));
      refetch();
      return true;
    } catch {
      // Fallback: xóa toàn bộ tủ bằng deleteLockerMutation
      try {
        await Promise.all(allLockers.map((l) => deleteLockerMutation(l.id).unwrap()));
        toast.success(t("admin.lockers.toast.deleteAllSuccess", `Đã xóa tất cả ${allLockers.length} tủ thành công!`));
        refetch();
        return true;
      } catch (fallbackErr: any) {
        toast.error(
          fallbackErr?.data?.message || fallbackErr?.message || t("admin.lockers.toast.deleteAllFailed", "Không thể xóa tất cả tủ")
        );
        return false;
      }
    }
  };

  return {
    handleMaintenance,
    handleActivate,
    handleDeleteLocker,
    handleDeleteBatchLockers,
    handleDeleteAllLockers,
    isDeleting: isDeletingSingle || isDeletingBatch || isDeletingAll,
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
