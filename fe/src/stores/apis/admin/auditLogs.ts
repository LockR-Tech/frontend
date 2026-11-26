import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types";
import type { AdminPage } from "~/types/admin/feedback";

/**
 * Nhật ký thao tác (F3-G16) — GET /api/admin/audit-logs (user-service).
 * Mọi service ghi "ai, lúc nào, làm gì, với cái gì, từ → thành, lý do": bật bảo trì, kích hoạt tủ, gán KTV,
 * đổi trạng thái ô / drone, khoá tài khoản, đổi vai trò, xoá…
 */
export interface ActionLogEntry {
  id: number;
  occurredAt: string;
  source: string | null;
  /** null = hệ thống tự làm (job hẹn giờ, thiết bị). */
  actorUserId: number | null;
  actorName: string | null;
  actorRoles: string | null;
  /** Mã hành động ổn định, vd LOCKER_MAINTENANCE_ON — dịch ở admin.auditLogs.actions.<mã>. */
  action: string;
  targetType: "LOCKER" | "BOX" | "DRONE" | "USER" | string | null;
  targetId: number | null;
  targetLabel: string | null;
  lockerId: number | null;
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
}

export interface ActionLogParams {
  page: number;
  size: number;
  /** Mã hành động, nhiều mã cách dấu phẩy; mã kết thúc bằng `_` = tiền tố (vd `LOCKER_`). */
  actions?: string;
  targetType?: string;
  targetId?: number;
  lockerId?: number;
  /** 0 = chỉ việc hệ thống tự làm, -1 = chỉ việc do người bấm. */
  actorUserId?: number;
  /** yyyy-MM-dd, tính cả hai đầu. */
  from?: string;
  to?: string;
  q?: string;
}

export const auditLogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActionLogs: builder.query<ApiResponse<AdminPage<ActionLogEntry>>, ActionLogParams>({
      query: (params) => ({
        url: "/api/admin/audit-logs",
        params: Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
        ),
      }),
      keepUnusedDataFor: 30,
    }),
  }),
});

export const { useGetActionLogsQuery } = auditLogApi;
