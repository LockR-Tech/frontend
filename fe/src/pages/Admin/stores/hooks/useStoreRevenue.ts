import { useMemo } from "react";
import { useGetRevenueByStoreQuery } from "~/stores/apis/admin/revenue";
import { shiftDay, vietnamToday } from "~/lib/report-format";
import { toReportError } from "~/lib/report-error";
import type { RevenueByStoreItem } from "~/types/admin/reporting";

/**
 * Số tủ / số đơn / doanh thu theo cửa hàng từ GET /api/admin/revenue/by-store,
 * khoảng 366 ngày gần nhất (tối đa backend cho phép). Bảng và trang chi tiết dùng
 * chung tham số nên chung cache.
 */
export function useStoreRevenue() {
  const range = useMemo(() => {
    const to = vietnamToday();
    return { from: shiftDay(to, -365), to };
  }, []);
  const { data, error, isLoading } = useGetRevenueByStoreQuery(range);

  const byStoreId = useMemo(() => {
    const map = new Map<number, RevenueByStoreItem>();
    // lookupAvailable = false: store/locker-service lỗi → số tủ có thể sai, bỏ qua.
    if (data?.data?.lookupAvailable === false) return map;
    for (const item of data?.data?.items ?? []) {
      if (item.storeId != null) map.set(item.storeId, item);
    }
    return map;
  }, [data]);

  return {
    byStoreId,
    range,
    isLoading,
    error: toReportError(error),
  };
}
