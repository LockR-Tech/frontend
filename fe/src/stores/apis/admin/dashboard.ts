import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type { ApiResponse, DashboardOverviewResponse } from "../../../types";

const TAGS = {
  DASHBOARD: "Dashboard",
} as const;

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardOverview: builder.query<ApiResponse<DashboardOverviewResponse>, void>({
      query: () => ADMIN_ENDPOINTS.DASHBOARD,
      providesTags: [TAGS.DASHBOARD],
    }),
  }),
});

export const { useGetDashboardOverviewQuery } = dashboardApi;
