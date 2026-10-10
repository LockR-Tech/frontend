import { useMemo } from "react";
import { useGetStoreByIdQuery } from "~/stores/apis/admin/stores";
import { useGetLockersByStoreQuery } from "~/stores/apis/admin/lockers";
import { extractList } from "~/lib/extract-list";
import type { AdminLockerResponse } from "~/types/admin/locker";
import { useStoreRevenue } from "./useStoreRevenue";

export function useStoreDetail(storeId: string | undefined) {
  const id = storeId ? Number(storeId) : NaN;
  const valid = Number.isFinite(id) && id > 0;

  const storeQuery = useGetStoreByIdQuery(id, { skip: !valid });
  // GET /api/admin/lockers/store/{storeId} — LockerResponse có totalBoxes/availableBoxes.
  const lockersQuery = useGetLockersByStoreQuery(id, { skip: !valid });
  const storeRevenue = useStoreRevenue();

  const lockers = useMemo(
    () => extractList<AdminLockerResponse>(lockersQuery.data?.data),
    [lockersQuery.data],
  );

  const refetch = () => {
    void storeQuery.refetch();
    void lockersQuery.refetch();
  };

  return {
    store: storeQuery.data?.data ?? null,
    lockers,
    isLoading: valid && storeQuery.isLoading,
    isError: storeQuery.isError,
    refetch,
    revenueStats: valid ? storeRevenue.byStoreId.get(id) : undefined,
    revenueError: storeRevenue.error,
  };
}
