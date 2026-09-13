import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PromotionStatus } from "~/types/admin/enums";
import { extractList } from "~/lib/extract-list";
import {
  useGetAllPromotionsQuery,
  useDeletePromotionMutation,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
} from "@/stores/apis/admin/promotions";
import type {
  PromotionResponse,
  PromotionRequest,
} from "~/types/admin/promotion";

export type PromotionStatusFilter = "ALL" | PromotionStatus;

export function usePromotions() {
  const [statusFilter, setStatusFilter] =
    useState<PromotionStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Number(urlParams.get("page") ?? "0");
  const pageSize = Number(urlParams.get("size") ?? "10");
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] =
    useState<PromotionResponse | null>(null);

  const { data, isLoading, refetch } = useGetAllPromotionsQuery({
    page,
    size: pageSize,
  });

  const [createPromotion, { isLoading: isCreating }] =
    useCreatePromotionMutation();
  const [updatePromotion, { isLoading: isUpdating }] =
    useUpdatePromotionMutation();
  const [deletePromotion, { isLoading: isDeleting }] =
    useDeletePromotionMutation();

  const allPromotions: PromotionResponse[] = extractList<PromotionResponse>(data?.data);

  const filteredPromotions = useMemo(() => {
    let list = allPromotions;

    if (statusFilter !== "ALL") {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [allPromotions, statusFilter, searchQuery]);

  const statusCounts = useMemo(
    () => ({
      ALL: allPromotions.length,
      [PromotionStatus.ACTIVE]: allPromotions.filter(
        (p) => p.status === PromotionStatus.ACTIVE,
      ).length,
      [PromotionStatus.UPCOMING]: allPromotions.filter(
        (p) => p.status === PromotionStatus.UPCOMING,
      ).length,
      [PromotionStatus.EXPIRED]: allPromotions.filter(
        (p) => p.status === PromotionStatus.EXPIRED,
      ).length,
      [PromotionStatus.DEPLETED]: allPromotions.filter(
        (p) => p.status === PromotionStatus.DEPLETED,
      ).length,
      [PromotionStatus.INACTIVE]: allPromotions.filter(
        (p) => p.status === PromotionStatus.INACTIVE,
      ).length,
    }),
    [allPromotions],
  );

  const handleCreate = () => {
    setEditingPromotion(null);
    setIsModalOpen(true);
  };

  const handleEdit = (promotion: PromotionResponse) => {
    setEditingPromotion(promotion);
    setIsModalOpen(true);
  };

  const handleSave = async (data: PromotionRequest) => {
    if (editingPromotion) {
      await updatePromotion({ id: editingPromotion.id, data }).unwrap();
    } else {
      await createPromotion(data).unwrap();
    }
    setIsModalOpen(false);
    setEditingPromotion(null);
  };

  const handleDelete = async (id: number) => {
    await deletePromotion(id).unwrap();
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setSearchQuery("");
    setPage(0);
  };

  const hasActiveFilters = statusFilter !== "ALL" || searchQuery !== "";

  return {
    promotions: filteredPromotions,
    totalElements: filteredPromotions.length,
    totalPages: 1,
    isLoading,
    isSaving: isCreating || isUpdating,
    isDeleting,
    statusFilter,
    setStatusFilter,
    statusCounts,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    isModalOpen,
    setIsModalOpen,
    editingPromotion,
    refetch,
    handleCreate,
    handleEdit,
    handleSave,
    handleDelete,
    clearFilters,
    hasActiveFilters,
  };
}
