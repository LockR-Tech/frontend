import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PromotionStatus } from "~/types/admin/enums";
import { extractList } from "~/lib/extract-list";
import {
  useGetAllPromotionsQuery,
  useDeletePromotionMutation,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  promotionToRequest,
  type AdminPromotion,
  type AdminPromotionRequest,
} from "@/stores/apis/admin/promotions";
import { effectivePromotionStatus, promotionError } from "../promotion-status";

export type PromotionStatusFilter = "ALL" | PromotionStatus;

/** Khuyến mãi kèm trạng thái hiệu lực suy ra tại client. */
export type PromotionRow = AdminPromotion & { effectiveStatus: PromotionStatus };

export function usePromotions() {
  const [statusFilter, setStatusFilterState] = useState<PromotionStatusFilter>("ALL");
  const [searchQuery, setSearchQueryState] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Math.max(0, Number(urlParams.get("page") ?? "0") || 0);
  const pageSize = Math.max(1, Number(urlParams.get("size") ?? "10") || 10);
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });
  const setStatusFilter = (value: PromotionStatusFilter) => {
    setStatusFilterState(value);
    setPage(0);
  };
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value);
    if (page !== 0) setPage(0);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<AdminPromotion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPromotion | null>(null);
  // Mã đã có lịch sử dùng → đề nghị ngưng áp dụng thay vì xoá.
  const [deactivateTarget, setDeactivateTarget] = useState<AdminPromotion | null>(null);

  const { data, isLoading, refetch } = useGetAllPromotionsQuery();

  const [createPromotion, { isLoading: isCreating }] = useCreatePromotionMutation();
  const [updatePromotion, { isLoading: isUpdating }] = useUpdatePromotionMutation();
  const [deletePromotion, { isLoading: isDeleting }] = useDeletePromotionMutation();

  const allPromotions: PromotionRow[] = useMemo(() => {
    const now = Date.now();
    return extractList<AdminPromotion>(data?.data).map((p) => ({
      ...p,
      effectiveStatus: effectivePromotionStatus(p, now),
    }));
  }, [data]);

  const filteredPromotions = useMemo(() => {
    let list = allPromotions;

    if (statusFilter !== "ALL") {
      list = list.filter((p) => p.effectiveStatus === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          (p.code ?? "").toLowerCase().includes(q) ||
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [allPromotions, statusFilter, searchQuery]);

  // Backend trả cả danh sách → phân trang tại client.
  const totalElements = filteredPromotions.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const pagedPromotions = useMemo(
    () => filteredPromotions.slice(page * pageSize, (page + 1) * pageSize),
    [filteredPromotions, page, pageSize],
  );

  useEffect(() => {
    if (!isLoading && page > 0 && page >= totalPages) {
      setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(totalPages - 1)); return next; });
    }
  }, [isLoading, page, totalPages, setUrlParams]);

  const statusCounts = useMemo(() => {
    const counts: Record<PromotionStatusFilter, number> = {
      ALL: allPromotions.length,
      [PromotionStatus.ACTIVE]: 0,
      [PromotionStatus.UPCOMING]: 0,
      [PromotionStatus.EXPIRED]: 0,
      [PromotionStatus.DEPLETED]: 0,
      [PromotionStatus.INACTIVE]: 0,
    };
    for (const p of allPromotions) counts[p.effectiveStatus] += 1;
    return counts;
  }, [allPromotions]);

  const handleCreate = () => {
    setEditingPromotion(null);
    setIsModalOpen(true);
  };

  const handleEdit = (promotion: AdminPromotion) => {
    setEditingPromotion(promotion);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: AdminPromotionRequest) => {
    if (editingPromotion) {
      await updatePromotion({ id: editingPromotion.id, data: payload }).unwrap();
    } else {
      await createPromotion(payload).unwrap();
    }
    setIsModalOpen(false);
    setEditingPromotion(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      await deletePromotion(target.id).unwrap();
      toast.success(`Đã xoá mã ${target.code}`);
      setDeleteTarget(null);
    } catch (err) {
      const { code, message } = promotionError(err);
      setDeleteTarget(null);
      if (code === "PROMOTION_HAS_HISTORY") {
        setDeactivateTarget(target);
        return;
      }
      toast.error("Không xoá được khuyến mãi", { description: message || undefined });
    }
  };

  /** Đổi trạng thái lưu (ACTIVE/INACTIVE) — gửi lại đủ trường vì PUT ghi đè. */
  const setStoredStatus = async (promotion: AdminPromotion, status: "ACTIVE" | "INACTIVE") => {
    try {
      await updatePromotion({
        id: promotion.id,
        data: promotionToRequest(promotion, { status }),
      }).unwrap();
      toast.success(
        status === "INACTIVE"
          ? `Đã ngưng áp dụng mã ${promotion.code}`
          : `Đã áp dụng lại mã ${promotion.code}`,
      );
      return true;
    } catch (err) {
      toast.error("Không cập nhật được trạng thái", {
        description: promotionError(err).message || undefined,
      });
      return false;
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    if (await setStoredStatus(deactivateTarget, "INACTIVE")) setDeactivateTarget(null);
  };

  const clearFilters = () => {
    setStatusFilterState("ALL");
    setSearchQueryState("");
    setPage(0);
  };

  const hasActiveFilters = statusFilter !== "ALL" || searchQuery !== "";

  return {
    promotions: pagedPromotions,
    totalElements,
    totalPages,
    isLoading,
    isSaving: isCreating || isUpdating,
    isUpdating,
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
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    deactivateTarget,
    setDeactivateTarget,
    confirmDeactivate,
    setStoredStatus,
    clearFilters,
    hasActiveFilters,
  };
}
