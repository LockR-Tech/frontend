import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useGetAllPartnersQuery,
  useApprovePartnerMutation,
  useRejectPartnerMutation,
  useSuspendPartnerMutation,
} from "@/stores/apis/admin/partners";
import { PartnerStatus } from "@/types/admin/enums";
import type { PartnerResponse } from "@/types/admin";

export type PartnerStatusFilter = "ALL" | PartnerStatus;

// Helper to map API response to table format
const mapPartnerToTable = (partner: PartnerResponse) => ({
  id: partner.id,
  name: partner.businessName,
  email: partner.contactEmail,
  phone: partner.contactPhone,
  representativeName: partner.userName,
  representativePhone: partner.contactPhone,
  status: partner.status as PartnerStatus,
  address: partner.businessAddress,
  createdAt: partner.createdAt,
  storeCount: partner.storeCount,
  staffCount: partner.staffCount,
  revenueSharePercent: partner.revenueSharePercent,
});

export function usePartners() {
  const [status, setStatus] = useState<PartnerStatusFilter>("ALL");
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
  const [selectedPartner, setSelectedPartner] = useState<ReturnType<typeof mapPartnerToTable> | null>(null);

  // Fetch partners from API
  const {
    data: partnersResponse,
    isLoading,
    error,
    refetch,
  } = useGetAllPartnersQuery({
    page,
    size: pageSize,
    status: status === "ALL" ? undefined : status,
  });

  // Mutations
  const [approvePartner] = useApprovePartnerMutation();
  const [rejectPartner] = useRejectPartnerMutation();
  const [suspendPartner] = useSuspendPartnerMutation();

  const partnersData = partnersResponse?.data;
  const partners = useMemo(() => {
    return (partnersData?.content || []).map(mapPartnerToTable);
  }, [partnersData]);

  const totalElements = partnersData?.totalElements || 0;
  const totalPages = partnersData?.totalPages || 0;

  // Statistics
  const statistics = useMemo(() => {
    // If we have real data, use it; otherwise return defaults
    return {
      totalPartners: totalElements,
      pendingApproval: 0, // These would need a separate API call or aggregations
      approved: 0,
      rejected: 0,
      suspended: 0,
      totalStores: 0,
    };
  }, [totalElements]);

  const statusCounts = useMemo(() => ({
    ALL: totalElements,
    [PartnerStatus.PENDING]: 0, // Would need to fetch counts separately
    [PartnerStatus.APPROVED]: 0,
    [PartnerStatus.REJECTED]: 0,
    [PartnerStatus.SUSPENDED]: 0,
  }), [totalElements]);

  const handleCreate = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleEdit = useCallback((partner: ReturnType<typeof mapPartnerToTable>) => {
    setSelectedPartner(partner);
    setIsEditModalOpen(true);
  }, []);

  const handleApprove = useCallback(async (partnerId: number) => {
    try {
      await approvePartner(partnerId).unwrap();
      toast.success("Đã phê duyệt đối tác thành công!");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || "Không thể phê duyệt đối tác");
    }
  }, [approvePartner, refetch]);

  const handleReject = useCallback(async (partnerId: number) => {
    try {
      await rejectPartner({ partnerId, reason: "Không đáp ứng yêu cầu" }).unwrap();
      toast.success("Đã từ chối đối tác!");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || "Không thể từ chối đối tác");
    }
  }, [rejectPartner, refetch]);

  const handleSuspend = useCallback(async (partnerId: number) => {
    try {
      await suspendPartner(partnerId).unwrap();
      toast.success("Đã đình chỉ đối tác!");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || "Không thể đình chỉ đối tác");
    }
  }, [suspendPartner, refetch]);

  // Clear all filters
  const clearFilters = () => {
    setStatus("ALL");
    setSearchQuery("");
    setPage(0);
  };

  // Check if any filter is active
  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  return {
    partners,
    totalElements,
    totalPages,
    statistics,
    isLoading,
    error,
    refetch,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    statusCounts,
    clearFilters,
    hasActiveFilters,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    selectedPartner,
    handleCreate,
    handleEdit,
    handleApprove,
    handleReject,
    handleSuspend,
    isMock: false,
  };
}
