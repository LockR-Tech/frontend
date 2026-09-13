import { ORDER_STATUS_COLORS } from "@/constants";
import type { OrderStatus } from "@/types/partner.enum";

export const STATUS_LABELS: Record<string, string> = {
  ALL: "Tất cả",
  WAITING: "Chờ lấy đồ",
  COLLECTED: "Đã lấy",
  PROCESSING: "Đang giặt",
  READY: "Sẵn sàng trả",
  RETURNED: "Đã trả",
  COMPLETED: "Hoàn thành",
  CANCELED: "Đã hủy",
};

export const ERROR_CODES = {
  E_ORDER002: "E_ORDER002",
  E_BOX003: "E_BOX003",
  E_ORDER001: "E_ORDER001",
  E_AUTH001: "E_AUTH001",
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.E_ORDER002]: "Lỗi: Trạng thái đơn hàng đã thay đổi, không thể cấp mã.",
  [ERROR_CODES.E_BOX003]: "Lỗi: Tủ Locker hiện đang bận hoặc gặp sự cố kỹ thuật.",
  [ERROR_CODES.E_ORDER001]: "Không tìm thấy đơn hàng.",
  [ERROR_CODES.E_AUTH001]: "Bạn không có quyền truy cập cửa hàng này.",
};

export const getErrorMessage = (err: unknown): string => {
  const apiError = err as {
    status?: number;
    data?: { code?: string; message?: string };
  };

  if (apiError?.status === 401 || apiError?.status === 403) {
    localStorage.removeItem("accessToken");
    window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
    return "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
  }

  const errorCode = apiError?.data?.code;
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  return apiError?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
};

export const getStatusBadgeClass = (status: string) => {
  return ORDER_STATUS_COLORS[status as OrderStatus] || "bg-gray-100 text-gray-700";
};

export const copyToClipboard = (code: string) => {
  navigator.clipboard.writeText(code);
};

export const tableHeader = {
  bg: "bg-blue-950",
  text: "text-amber-100",
  radius: "rounded-md",
};
