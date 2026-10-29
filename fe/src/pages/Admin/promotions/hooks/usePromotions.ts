import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
import { useGetAllLockersQuery } from "~/stores/apis/admin/lockers";
import type { AdminLockerResponse } from "~/types/admin/locker";
import { effectivePromotionStatus, promotionError } from "../promotion-status";

export type PromotionStatusFilter = "ALL" | PromotionStatus;

/** Lọc theo nơi áp dụng: tất cả, chỉ toàn hệ thống, hoặc id tủ (dạng chuỗi cho Select). */
export type PromotionLockerFilter = "ALL" | "GLOBAL" | `${number}`;

/** Tủ mà voucher áp dụng (code/name có thể null khi không tra được). */
export interface PromotionLockerRef {
  id: number;
  code: string | null;
  name: string | null;
}

/**
 * Khuyến mãi kèm trạng thái hiệu lực suy ra tại client và tủ áp dụng
 * (`scopeLocker` null = toàn hệ thống).
 */
export type PromotionRow = AdminPromotion & {
  effectiveStatus: PromotionStatus;
  scopeLocker: PromotionLockerRef | null;
};

// Đủ lớn để lấy hết tủ trong một trang (các màn admin khác cũng dùng 1000).
const LOCKER_PAGE = { page: 0, size: 1000 } as const;

/** Mã/tên tủ: ưu tiên backend trả kèm voucher, thiếu thì tra danh sách tủ. */
function resolveScopeLocker(
  p: AdminPromotion,
  lockerById: Map<number, AdminLockerResponse>,
): PromotionLockerRef | null {
  if (p.lockerId == null) return null;
  const locker = lockerById.get(p.lockerId);
  return {
    id: p.lockerId,
    code: p.lockerCode ?? locker?.code ?? null,
    name: p.lockerName ?? locker?.name ?? null,
  };
}

export function usePromotions() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilterState] = useState<PromotionStatusFilter>("ALL");
  const [lockerFilter, setLockerFilterState] = useState<PromotionLockerFilter>("ALL");
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
  const setLockerFilter = (value: PromotionLockerFilter) => {
    setLockerFilterState(value);
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
  const { data: lockersData, isLoading: isLoadingLockers } = useGetAllLockersQuery(LOCKER_PAGE);

  const [createPromotion, { isLoading: isCreating }] = useCreatePromotionMutation();
  const [updatePromotion, { isLoading: isUpdating }] = useUpdatePromotionMutation();
  const [deletePromotion, { isLoading: isDeleting }] = useDeletePromotionMutation();

  /** Toàn bộ tủ, sắp theo mã — dùng cho ô chọn "Áp dụng tại" và bộ lọc. */
  const lockers = useMemo(
    () =>
      [...extractList<AdminLockerResponse>(lockersData?.data)].sort((a, b) =>
        (a.code ?? "").localeCompare(b.code ?? "", "vi", { numeric: true }),
      ),
    [lockersData],
  );
  const lockerById = useMemo(
    () => new Map(lockers.map((l) => [l.id, l] as const)),
    [lockers],
  );

  const allPromotions: PromotionRow[] = useMemo(() => {
    const now = Date.now();
    return extractList<AdminPromotion>(data?.data).map((p) => ({
      ...p,
      effectiveStatus: effectivePromotionStatus(p, now),
      scopeLocker: resolveScopeLocker(p, lockerById),
    }));
  }, [data, lockerById]);

  /**
   * Lựa chọn tủ cho bộ lọc: mọi tủ hiện có + tủ mà voucher đang gắn nhưng không còn
   * trong danh sách (vd tủ đã xoá) để vẫn lọc được.
   */
  const lockerFilterOptions: PromotionLockerRef[] = useMemo(() => {
    const options = new Map<number, PromotionLockerRef>(
      lockers.map((l) => [l.id, { id: l.id, code: l.code, name: l.name }]),
    );
    for (const p of allPromotions) {
      if (p.scopeLocker && !options.has(p.scopeLocker.id)) {
        options.set(p.scopeLocker.id, p.scopeLocker);
      }
    }
    return Array.from(options.values());
  }, [lockers, allPromotions]);

  const filteredPromotions = useMemo(() => {
    let list = allPromotions;

    if (statusFilter !== "ALL") {
      list = list.filter((p) => p.effectiveStatus === statusFilter);
    }

    if (lockerFilter === "GLOBAL") {
      list = list.filter((p) => p.scopeLocker === null);
    } else if (lockerFilter !== "ALL") {
      const lockerId = Number(lockerFilter);
      list = list.filter((p) => p.scopeLocker?.id === lockerId);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          (p.code ?? "").toLowerCase().includes(q) ||
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.scopeLocker?.code ?? "").toLowerCase().includes(q) ||
          (p.scopeLocker?.name ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [allPromotions, statusFilter, lockerFilter, searchQuery]);

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
      toast.success(t("admin.promotions.toast.deleted", { code: target.code }));
      setDeleteTarget(null);
    } catch (err) {
      const { code, message } = promotionError(err);
      setDeleteTarget(null);
      if (code === "PROMOTION_HAS_HISTORY") {
        setDeactivateTarget(target);
        return;
      }
      toast.error(t("admin.promotions.toast.deleteFailed"), { description: message || undefined });
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
          ? t("admin.promotions.toast.deactivated", { code: promotion.code })
          : t("admin.promotions.toast.reactivated", { code: promotion.code }),
      );
      return true;
    } catch (err) {
      toast.error(t("admin.promotions.toast.statusFailed"), {
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
    setLockerFilterState("ALL");
    setSearchQueryState("");
    setPage(0);
  };

  const hasActiveFilters =
    statusFilter !== "ALL" || lockerFilter !== "ALL" || searchQuery !== "";

  return {
    promotions: pagedPromotions,
    /// Mọi dòng khớp bộ lọc (mọi trang) — cho "Xoá tất cả".
    filteredIds: filteredPromotions.map((p) => p.id),
    deleteOne: (id: number) => deletePromotion(id).unwrap(),
    totalElements,
    totalPages,
    isLoading,
    isSaving: isCreating || isUpdating,
    isUpdating,
    isDeleting,
    statusFilter,
    setStatusFilter,
    statusCounts,
    lockerFilter,
    setLockerFilter,
    lockerFilterOptions,
    lockers,
    isLoadingLockers,
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
