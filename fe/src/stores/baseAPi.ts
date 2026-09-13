import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { API_BASE_URL, CONTENT_TYPES, AUTH_ENDPOINTS } from "../constants";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("accessToken")?.replace(/\s/g, "");
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("Content-Type", CONTENT_TYPES.JSON);
    return headers;
  },
});

// Determine which refresh endpoint to use based on stored user role
function getRefreshEndpoint(): string {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const roles: string[] = user.role ?? user.roles ?? [];
      const isAdmin = roles.some((r) =>
        ["ADMIN", "SUPER_ADMIN"].includes(r.toUpperCase().replace(/^ROLE_/, "")),
      );
      if (isAdmin) return AUTH_ENDPOINTS.ADMIN_REFRESH;
    }
  } catch {
    // ignore
  }
  return AUTH_ENDPOINTS.REFRESH_TOKEN;
}

function clearAuthAndRedirect() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken")?.replace(/\s/g, "");
    if (refreshToken) {
      try {
        const refreshEndpoint = getRefreshEndpoint();
        const refreshRes = await fetch(`${API_BASE_URL}${refreshEndpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const json = await refreshRes.json().catch(() => null);
        const newAccessToken =
          json?.data?.accessToken ?? json?.accessToken ?? null;

        if (refreshRes.ok && newAccessToken) {
          localStorage.setItem(
            "accessToken",
            newAccessToken.replace(/\s/g, ""),
          );
          // Also update refreshToken if a new one was returned
          const newRefreshToken =
            json?.data?.refreshToken ?? json?.refreshToken ?? null;
          if (newRefreshToken) {
            localStorage.setItem(
              "refreshToken",
              newRefreshToken.replace(/\s/g, ""),
            );
          }
          // Retry the original request with the new access token
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          clearAuthAndRedirect();
        }
      } catch {
        clearAuthAndRedirect();
      }
    } else {
      clearAuthAndRedirect();
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "User",
    "Auth",
    "Users",
    "Stores",
    "Services",
    "Lockers",
    "Orders",
    "Payments",
    "Dashboard",
    "Scheduler",
    "Loyalty", // Giữ từ main cho Admin
    "Partners", // Giữ từ main cho Admin management
    "Partner", // Thêm cho Partner profile
    "AccessCodes", // Thêm cho Staff Access Code logic
    "PartnerOrder", // Thêm cho luồng xử lý đơn của Partner
    "Notifications", // Thêm cho hệ thống thông báo realtime
    "NotificationStats", // Stats của notifications
    "NotificationTemplates", // Templates của notifications
    "Promotions", // Quản lý khuyến mãi
    "Wallet", // Ví nội bộ / điều chỉnh số dư
    "Drones", // Đội drone giao/nhận gắn bãi đáp tủ
  ],

  endpoints: () => ({}),
});
