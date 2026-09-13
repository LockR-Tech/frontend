import { useState, useEffect } from "react";
import { isMockEnabled, mockDelay } from "~/hooks/useMockData";
import { apiGet } from "~/utils/api";
import type { AdminStoreResponse } from "~/types";
import type { AdminLockerResponse } from "~/types/admin/locker";

interface StoreDetail extends AdminStoreResponse {
  manager?: string;
  managerPhone?: string;
  email?: string;
  orderCount?: number;
  availableLockers?: number;
}

export function useStoreDetail(storeId: string | undefined) {
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [lockers, setLockers] = useState<AdminLockerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!storeId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Real API call with centralized token handling
    const fetchStoreDetail = async () => {
      try {
        const [storeData, lockersData] = await Promise.all([
          apiGet<{ data: StoreDetail }>(`/api/admin/stores/${storeId}`),
          apiGet<{ data: AdminLockerResponse[] }>(
            `/api/admin/lockers/store/${storeId}`,
          ).catch(() => ({ data: [] })),
        ]);
        setStore(storeData.data);
        // Handle both plain array and paginated { content: [...] } responses
        const lockersRaw = lockersData.data as unknown;
        const lockersList = Array.isArray(lockersRaw)
          ? lockersRaw
          : ((lockersRaw as { content?: AdminLockerResponse[] })?.content ??
            []);
        setLockers(lockersList);
      } catch (error) {
        console.error(error);
        setStore(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreDetail();
  }, [storeId, refreshKey]);

  return {
    store,
    lockers,
    isLoading,
    refetch,
  };
}
