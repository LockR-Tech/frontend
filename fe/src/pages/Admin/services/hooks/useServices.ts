import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useGetAllServicesQuery,
  useDeleteServiceMutation,
  useUpdateServiceStatusMutation,
} from "@/stores/apis/admin/services";
import type { AdminServiceResponse } from "~/types/admin/service";
import { extractList } from "~/lib/extract-list";

export type ServiceStatus = "ALL" | "ACTIVE" | "INACTIVE";

export function useServices() {
  const [status, setStatus] = useState<ServiceStatus>("ALL");
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
  const [selectedService, setSelectedService] =
    useState<AdminServiceResponse | null>(null);

  const { data, isLoading, refetch } = useGetAllServicesQuery({
    page,
    size: pageSize,
  });
  const [deleteService] = useDeleteServiceMutation();
  const [updateServiceStatus] = useUpdateServiceStatusMutation();

  const allServices: AdminServiceResponse[] = extractList<AdminServiceResponse>(data?.data);

  const filteredServices = useMemo(() => {
    let result = [...allServices];

    if (status !== "ALL") {
      result = result.filter((service) =>
        status === "ACTIVE" ? service.active : !service.active,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (service) =>
          service.name?.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [allServices, status, searchQuery]);

  const statusCounts = useMemo(
    () => ({
      ALL: allServices.length,
      ACTIVE: allServices.filter((s) => s.active).length,
      INACTIVE: allServices.filter((s) => !s.active).length,
    }),
    [allServices],
  );

  const handleCreate = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleEdit = useCallback((service: AdminServiceResponse) => {
    setSelectedService(service);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (serviceId: number) => {
      try {
        await toast.promise(deleteService(serviceId).unwrap(), {
          loading: "Đang xóa dịch vụ...",
          success: "Đã xóa dịch vụ thành công!",
          error: "Không thể xóa dịch vụ",
        });
      } catch {
        // error handled by toast
      }
    },
    [deleteService],
  );

  const handleToggleStatus = useCallback(
    async (serviceId: number, currentActive: boolean) => {
      try {
        await toast.promise(
          updateServiceStatus({
            id: serviceId,
            data: { enabled: !currentActive },
          }).unwrap(),
          {
            loading: currentActive
              ? "Đang vô hiệu hóa..."
              : "Đang kích hoạt...",
            success: currentActive
              ? "Đã vô hiệu hóa dịch vụ"
              : "Đã kích hoạt dịch vụ",
            error: "Không thể cập nhật trạng thái",
          },
        );
      } catch {
        // error handled by toast
      }
    },
    [updateServiceStatus],
  );

  const clearFilters = () => {
    setStatus("ALL");
    setSearchQuery("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  return {
    services: filteredServices,
    totalElements: filteredServices.length,
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
    selectedService,
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggleStatus,
  };
}
