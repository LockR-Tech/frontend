import { useState, useMemo, useCallback } from "react";
import { useGetPartnerServicesQuery } from "@/stores/apis/partnerApi";
import type { PartnerService } from "@/types/partner.type";

export interface ServiceStats {
  total: number;
  active: number;
  inactive: number;
  avgPrice: number;
}

export function useServices() {
  const {
    data: services = [],
    isLoading,
    error,
    refetch,
  } = useGetPartnerServicesQuery();

  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<PartnerService | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filter services
  const filteredServices = useMemo(() => {
    let result =
      filterCategory === "ALL"
        ? services
        : services.filter((service) => service.category === filterCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [services, filterCategory, searchQuery]);

  // Stats
  const stats: ServiceStats = useMemo(() => {
    const activeServices = services.filter((s) => s.isActive).length;
    const inactiveServices = services.length - activeServices;
    const avgPrice =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.price, 0) / services.length
        : 0;

    return {
      total: services.length,
      active: activeServices,
      inactive: inactiveServices,
      avgPrice,
    };
  }, [services]);

  const handleViewDetail = useCallback((service: PartnerService) => {
    setSelectedService(service);
    setIsDetailOpen(true);
  }, []);

  return {
    services,
    filteredServices,
    filterCategory,
    setFilterCategory,
    searchQuery,
    setSearchQuery,
    stats,
    isLoading,
    error,
    refetch,
    errorToast,
    setErrorToast,
    selectedService,
    isDetailOpen,
    setIsDetailOpen,
    handleViewDetail,
  };
}
