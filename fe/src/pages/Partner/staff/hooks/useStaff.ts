import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  useGetStaffContactsQuery,
  useAddStaffContactMutation,
  useDeleteStaffContactMutation,
} from "@/stores/apis/partnerApi";
import type { StaffContact } from "@/types/partner.type";

export function useStaff() {
  const {
    data: staff = [],
    isLoading,
    error,
    refetch,
  } = useGetStaffContactsQuery();

  const [addStaff] = useAddStaffContactMutation();
  const [deleteStaff, { isLoading: isDeleting }] =
    useDeleteStaffContactMutation();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const stats = useMemo(
    () => ({
      total: staff.length,
      active: staff.length,
    }),
    [staff],
  );

  const handleAdd = useCallback(
    async (staffId: number): Promise<boolean> => {
      try {
        await addStaff({ staffId }).unwrap();
        toast.success("Đã thêm nhân viên thành công!");
        setIsAddModalOpen(false);
        return true;
      } catch (err: unknown) {
        const e = err as { data?: { message?: string } };
        toast.error(e?.data?.message || "Không thể thêm nhân viên");
        return false;
      }
    },
    [addStaff],
  );

  const handleDelete = useCallback(
    async (staff: StaffContact) => {
      if (!confirm(`Xóa nhân viên "${staff.name}" khỏi đội của bạn?`)) return;
      try {
        await deleteStaff(staff.id).unwrap();
        toast.success(`Đã xóa ${staff.name} khỏi đội`);
      } catch (err: unknown) {
        const e = err as { data?: { message?: string } };
        toast.error(e?.data?.message || "Không thể xóa nhân viên");
      }
    },
    [deleteStaff],
  );

  return {
    staff,
    stats,
    isLoading,
    isDeleting,
    error,
    refetch,
    isAddModalOpen,
    setIsAddModalOpen,
    handleAdd,
    handleDelete,
  };
}
