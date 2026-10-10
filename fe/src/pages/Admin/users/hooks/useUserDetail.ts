import { useMemo } from "react";
import { useGetUserByIdQuery } from "~/stores/apis/admin/users";
import { useGetCustomerRevenueDetailQuery } from "~/stores/apis/admin/revenue";
import { shiftDay, vietnamToday } from "~/lib/report-format";
import { mapUser, type AdminUserRow, type BackendUserSummary } from "./useUsers";

/** Khoảng tối đa backend báo cáo cho phép (366 ngày, tính cả hai đầu) tới hôm nay. */
function lastYearRange() {
  const to = vietnamToday();
  return { from: shiftDay(to, -365), to };
}

export function useUserDetail(userId: string | undefined) {
  const id = userId ? Number(userId) : NaN;
  const valid = Number.isFinite(id) && id > 0;

  // GET /api/admin/users/{id} trả UserSummary thô (fullName/status…) → map như bảng.
  const { data, isLoading, isError, refetch } = useGetUserByIdQuery(id, { skip: !valid });
  const user: AdminUserRow | null = useMemo(() => {
    const raw = data?.data as unknown as BackendUserSummary | undefined;
    return raw && raw.id != null ? mapUser(raw) : null;
  }, [data]);

  // Số đơn / tổng chi lấy từ báo cáo doanh thu theo khách (tiền thực thu).
  const range = useMemo(lastYearRange, []);
  const revenue = useGetCustomerRevenueDetailQuery(
    { userId: id, ...range },
    { skip: !valid },
  );

  return {
    user,
    isLoading: valid && isLoading,
    isError,
    refetch,
    revenue: {
      data: revenue.data?.data,
      error: revenue.error,
      isLoading: revenue.isLoading,
      range,
      refetch: revenue.refetch,
    },
  };
}
