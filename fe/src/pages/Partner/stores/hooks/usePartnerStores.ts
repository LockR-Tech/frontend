import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGetPartnerStoresQuery } from "@/stores/apis/partnerApi";

export type StoreStatus = "ALL" | "ACTIVE" | "INACTIVE";

export function usePartnerStores() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StoreStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stores = [], isLoading, refetch } = useGetPartnerStoresQuery();

  const filteredStores = useMemo(() => {
    let result = [...stores];

    if (status !== "ALL") {
      result = result.filter((s) => s.status === status);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(query) ||
          s.address?.toLowerCase().includes(query) ||
          s.contactPhone?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [stores, status, searchQuery]);

  const statusCounts = useMemo(
    () => ({
      ALL: stores.length,
      ACTIVE: stores.filter((s) => s.status === "ACTIVE").length,
      INACTIVE: stores.filter((s) => s.status === "INACTIVE").length,
    }),
    [stores],
  );

  const handleViewDetail = useCallback(
    (storeId: number) => {
      navigate(`/partner/stores/${storeId}`);
    },
    [navigate],
  );

  const clearFilters = () => {
    setStatus("ALL");
    setSearchQuery("");
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  return {
    stores: filteredStores,
    isLoading,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    statusCounts,
    refetch,
    clearFilters,
    hasActiveFilters,
    handleViewDetail,
  };
}
