export const ERROR_MESSAGES: Record<string, string> = {
  E_LOCKER001: "Không tìm thấy locker.",
  E_BOX003: "Tủ Locker hiện đang bận hoặc gặp sự cố kỹ thuật.",
  E_AUTH001: "Bạn không có quyền truy cập.",
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

export const getBoxStatusBadge = (status: string): string => {
  switch (status) {
    case "AVAILABLE":
      return "bg-green-100 text-green-700 border-green-200";
    case "OCCUPIED":
      return "bg-red-100 text-red-700 border-red-200";
    case "RESERVED":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "MAINTENANCE":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "ERROR":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export const getBoxStatusLabel = (status: string): string => {
  switch (status) {
    case "AVAILABLE":
      return "Trống";
    case "OCCUPIED":
      return "Đang dùng";
    case "RESERVED":
      return "Đã đặt";
    case "MAINTENANCE":
      return "Bảo trì";
    case "ERROR":
      return "Lỗi";
    default:
      return status;
  }
};

export const getLockerStatusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700 border-green-200";
    case "MAINTENANCE":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export const getLockerStatusLabel = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "Đang hoạt động";
    case "MAINTENANCE":
      return "Đang bảo trì";
    default:
      return status;
  }
};
