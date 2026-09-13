import { useState, useEffect, useMemo } from "react";
import { useGetPartnerLockersQuery } from "@/stores/apis/partnerApi";
import type { PartnerLocker, LockerBox } from "@/types/partner.type";
import { getErrorMessage } from "../utils/locker-helpers";

export interface LockerStats {
  totalLockers: number;
  totalBoxes: number;
  occupiedBoxes: number;
  availableBoxes: number;
  maintenanceBoxes: number;
}

export function useLockers() {
  const {
    data: lockers = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetPartnerLockersQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [selectedLocker, setSelectedLocker] = useState<PartnerLocker | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Set default selected locker
  useEffect(() => {
    if (lockers.length > 0 && !selectedLocker) {
      setSelectedLocker(lockers[0]);
    }
  }, [lockers, selectedLocker]);

  // Auto-hide error toast
  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  // Calculate statistics
  const stats: LockerStats = useMemo(() => {
    return {
      totalLockers: lockers.length,
      totalBoxes: lockers.reduce((sum, l) => sum + (l.totalBoxes || 0), 0),
      occupiedBoxes: lockers.reduce((sum, l) => sum + (l.occupiedBoxes || 0), 0),
      availableBoxes: lockers.reduce((sum, l) => sum + (l.availableBoxes || 0), 0),
      maintenanceBoxes: lockers.reduce((sum, l) => {
        const boxes = l.boxes || [];
        return sum + boxes.filter((b) => b.status === "MAINTENANCE").length;
      }, 0),
    };
  }, [lockers]);

  // Filter boxes
  const filteredBoxes = useMemo(() => {
    if (!selectedLocker?.boxes) return [];
    if (filterStatus === "ALL") return selectedLocker.boxes;
    return selectedLocker.boxes.filter((box) => box.status === filterStatus);
  }, [selectedLocker, filterStatus]);

  const handleLockerChange = (lockerId: string) => {
    const locker = lockers.find((l) => l.id === parseInt(lockerId));
    setSelectedLocker(locker || null);
  };

  const clearFilters = () => {
    setFilterStatus("ALL");
  };

  const hasActiveFilters = filterStatus !== "ALL";

  return {
    lockers,
    selectedLocker,
    filterStatus,
    setFilterStatus,
    handleLockerChange,
    filteredBoxes,
    stats,
    isLoading,
    isFetching,
    error,
    refetch,
    clearFilters,
    hasActiveFilters,
    errorToast,
    setErrorToast,
  };
}
