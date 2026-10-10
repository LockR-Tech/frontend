import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { API_BASE_URL, CONTENT_TYPES } from "../constants";
import { getAccessToken, recoverFromUnauthorized } from "../utils/auth-session";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { arg }) => {
    const token = getAccessToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    // Upload multipart (FormData): KHÔNG tự đặt Content-Type — trình duyệt phải tự sinh
    // `multipart/form-data; boundary=...`. Mọi request khác vẫn gửi JSON như cũ.
    const body = typeof arg === "string" ? undefined : arg?.body;
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      headers.delete("Content-Type");
    } else {
      headers.set("Content-Type", CONTENT_TYPES.JSON);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Ghi lại token đã dùng để biết request 401 này có cần refresh hay không
  const tokenUsed = getAccessToken();
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Single-flight: các 401 song song chờ chung một lần refresh rồi gửi lại đúng một lần
    const shouldRetry = await recoverFromUnauthorized(tokenUsed);
    if (shouldRetry) {
      result = await rawBaseQuery(args, api, extraOptions);
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
    "DroneOrders", // Hành trình giao hàng bằng drone (admin theo dõi)
    "DroneIncidents", // Sự cố rơi kiện, thu hồi và phương án xử lý
    "BusinessSettings", // Quy tắc nghiệp vụ theo scope (ADR-0005)
    "BusinessSettingAudits", // Lịch sử thay đổi quy tắc nghiệp vụ
    "PaymentRefunds", // Hoàn tiền (báo cáo admin)
    "WalletTransactions", // Biến động ví của mọi khách (báo cáo admin)
    "PaymentStats", // Thống kê giao dịch có so sánh kỳ trước
    "Revenue", // Doanh thu theo tiền thực thu
    "KnowledgeDocuments", // Kho tri thức của trợ lý hỏi đáp (assistant-service)
    "AssistantConversations", // Hội thoại của trợ lý (admin xem lại chất lượng)
    "KnowledgeEvalCases", // Bộ câu hỏi đánh giá truy xuất
  ],

  endpoints: () => ({}),
});
