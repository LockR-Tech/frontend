import { baseApi } from "~/stores/baseAPi";
import { ADMIN_ENDPOINTS } from "~/constants";
import type { ApiResponse } from "~/types";

// Hai endpoint thống kê mới cho dashboard (order-service / user-service).
export interface PeakHourPoint {
  /** 0–23, giờ Việt Nam. */
  hour: number;
  orders: number;
}

export interface UserGrowthPoint {
  /** "YYYY-MM" */
  month: string;
  newUsers: number;
}

const ADMIN_ROOT = ADMIN_ENDPOINTS.USERS.replace(/\/users$/, "");

export const dashboardExtraApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/admin/dashboard/peak-hours?from=yyyy-MM-dd&to=yyyy-MM-dd
    getDashboardPeakHours: builder.query<ApiResponse<PeakHourPoint[]>, { from: string; to: string }>({
      query: (params) => ({ url: `${ADMIN_ROOT}/dashboard/peak-hours`, params }),
      providesTags: ["Dashboard"],
    }),
    // GET /api/admin/users/growth?months=12
    getDashboardUserGrowth: builder.query<ApiResponse<UserGrowthPoint[]>, { months: number }>({
      query: (params) => ({ url: `${ADMIN_ENDPOINTS.USERS}/growth`, params }),
      providesTags: ["Users"],
    }),
  }),
});

export const { useGetDashboardPeakHoursQuery, useGetDashboardUserGrowthQuery } =
  dashboardExtraApi;
