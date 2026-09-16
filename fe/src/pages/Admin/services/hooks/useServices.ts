import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useGetBusinessSettingsQuery,
  useUpdateBusinessSettingsMutation,
  type SettingView,
} from "~/stores/apis/admin/businessSettings";
import { useGetRevenueByServiceQuery } from "~/stores/apis/admin/revenue";
import { defaultReportRange, type DateRangeValue } from "~/components/shared/reporting";
import { toReportError } from "~/lib/report-error";
// Dùng lại đúng bộ kiểm tra/chuẩn hoá của trang Cấu hình — hai trang sửa chung một
// scope `order`, tách ra hai bộ luật sẽ lệch nhau ngay lần backend đổi ràng buộc.
import {
  collectChanges,
  currentRaw,
  toPayloadValue,
  type DraftMap,
} from "../../settings/setting-utils";
import type { RevenueByServiceItem } from "~/types/admin/reporting";

/// Nguồn dữ liệu cho trang Dịch vụ:
/// - quy tắc + giá: `GET /api/admin/settings/order` (ADR-0005), sửa bằng `PUT` cùng scope;
/// - hiệu quả kinh doanh: `GET /api/admin/revenue/by-service`.
///
/// Không có endpoint "services" nào ở backend — trang cũ gọi `/api/admin/services` và
/// nhận 404. Xem `service-catalog.ts`.
export function useServices() {
  const [range, setRange] = useState<DateRangeValue>(defaultReportRange);
  const [drafts, setDrafts] = useState<DraftMap>({});

  const {
    data: settingsData,
    isLoading: isSettingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useGetBusinessSettingsQuery("order");

  const {
    data: revenueData,
    isFetching: isRevenueFetching,
    error: revenueError,
    refetch: refetchRevenue,
  } = useGetRevenueByServiceQuery(range);

  const [saveSettings, { isLoading: isSaving }] = useUpdateBusinessSettingsMutation();

  const settings: SettingView[] = useMemo(
    () => settingsData?.data ?? [],
    [settingsData],
  );

  const settingByKey = useMemo(() => {
    const map = new Map<string, SettingView>();
    for (const s of settings) map.set(s.key, s);
    return map;
  }, [settings]);

  /// Doanh thu theo `serviceType`; dòng `OVERTIME_FEE` không thuộc dịch vụ nào nên bỏ.
  const revenueByType = useMemo(() => {
    const map = new Map<string, RevenueByServiceItem>();
    for (const item of revenueData?.data.items ?? []) {
      map.set(item.serviceType, item);
    }
    return map;
  }, [revenueData]);

  const overtimeRevenue = revenueByType.get("OVERTIME_FEE") ?? null;
  const totalRevenue = revenueData?.data.totalRevenue ?? 0;

  const setDraft = useCallback((key: string, raw: string) => {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
  }, []);

  const resetDrafts = useCallback(() => setDrafts({}), []);

  /// Chỉ những key thực sự đổi so với giá trị đang lưu.
  const changes = useMemo(
    () => collectChanges(settings, drafts),
    [settings, drafts],
  );

  const invalidChanges = changes.filter((c) => c.error !== null);
  const validChanges = changes.filter((c) => c.error === null);

  const save = useCallback(async () => {
    if (validChanges.length === 0) return;
    if (invalidChanges.length > 0) {
      toast.error("Còn giá trị không hợp lệ — sửa trước khi lưu");
      return;
    }
    const values: Record<string, ReturnType<typeof toPayloadValue>> = {};
    for (const change of validChanges) {
      values[change.setting.key] = toPayloadValue(change.setting, change.raw);
    }
    try {
      await saveSettings({ scope: "order", values }).unwrap();
      resetDrafts();
      toast.success(
        validChanges.length === 1
          ? "Đã lưu 1 thay đổi"
          : `Đã lưu ${validChanges.length} thay đổi`,
      );
    } catch (error) {
      toast.error(
        toReportError(error as Parameters<typeof toReportError>[0])?.message ??
          "Không lưu được thay đổi",
      );
    }
  }, [validChanges, invalidChanges, saveSettings, resetDrafts]);

  const refetch = useCallback(() => {
    refetchSettings();
    refetchRevenue();
  }, [refetchSettings, refetchRevenue]);

  return {
    range,
    setRange,
    settingByKey,
    valueOf: (key: string) => {
      const setting = settingByKey.get(key);
      if (!setting) return "";
      return drafts[key] ?? currentRaw(setting);
    },
    errorOf: (key: string) =>
      changes.find((c) => c.setting.key === key)?.error ?? null,
    setDraft,
    isSettingsLoading,
    settingsError,
    revenueByType,
    overtimeRevenue,
    totalRevenue,
    isRevenueFetching,
    revenueError,
    dirtyCount: changes.length,
    hasInvalid: invalidChanges.length > 0,
    isSaving,
    save,
    resetDrafts,
    refetch,
  };
}
