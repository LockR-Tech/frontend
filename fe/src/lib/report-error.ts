// Đọc lỗi từ các API báo cáo admin và dịch mã nghiệp vụ sang tiếng Việt.
//
// Backend trả `{ success: false, code, message }`. Mã quan trọng nhất là
// `PAYMENT_DATA_UNAVAILABLE` (503): payment-service không trả lời, màn hình doanh thu
// phải báo lỗi chứ KHÔNG được vẽ số 0 — xem docs/01-overview/admin-reporting-api.md § 0.2.

import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

export interface ReportError {
  /** Mã nghiệp vụ backend trả về, rỗng nếu lỗi mạng hoặc không parse được. */
  code: string;
  /** Câu hiển thị cho người dùng, luôn có nội dung. */
  message: string;
  /** Mã HTTP nếu biết. */
  status?: number;
}

const MESSAGES: Record<string, string> = {
  PAYMENT_DATA_UNAVAILABLE:
    "Không lấy được dữ liệu thanh toán (payment-service không phản hồi). Số liệu doanh thu chưa thể hiển thị.",
  INVALID_PAGE: "Số trang không hợp lệ.",
  INVALID_PAGE_SIZE: "Số dòng mỗi trang phải từ 1 đến 100.",
  INVALID_SORT: "Tiêu chí sắp xếp không hợp lệ.",
  INVALID_DATE: "Ngày không hợp lệ.",
  INVALID_DATE_RANGE:
    "Khoảng thời gian không hợp lệ: ngày cuối phải từ ngày đầu trở đi và tối đa 366 ngày.",
  INVALID_KIND: "Loại giao dịch không hợp lệ.",
  NOT_FOUND: "Không tìm thấy dữ liệu.",
  VALIDATION_ERROR: "Dữ liệu gửi lên không hợp lệ.",
  INTERNAL_ERROR: "Máy chủ gặp lỗi khi xử lý yêu cầu.",
};

function messageForStatus(status: number | undefined): string {
  switch (status) {
    case 401:
      return "Phiên đăng nhập đã hết hạn. Đăng nhập lại để xem báo cáo.";
    case 403:
      return "Tài khoản không có quyền ADMIN để xem báo cáo này.";
    case 404:
      return "Không tìm thấy dữ liệu.";
    case 503:
      return "Dịch vụ phụ thuộc đang không phản hồi. Thử lại sau.";
    default:
      return "Không tải được dữ liệu. Thử lại hoặc kiểm tra kết nối.";
  }
}

/** Chuẩn hoá lỗi RTK Query thành `{ code, message, status }`; `null` khi không có lỗi. */
export function toReportError(
  error: FetchBaseQueryError | SerializedError | undefined,
): ReportError | null {
  if (!error) return null;

  if ("status" in error) {
    if (error.status === "FETCH_ERROR") {
      return {
        code: "FETCH_ERROR",
        message: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
      };
    }
    if (error.status === "PARSING_ERROR" || error.status === "CUSTOM_ERROR") {
      return {
        code: String(error.status),
        message: "Máy chủ trả dữ liệu không đọc được.",
      };
    }
    if (error.status === "TIMEOUT_ERROR") {
      return {
        code: "TIMEOUT_ERROR",
        message: "Máy chủ phản hồi quá lâu. Thử lại sau.",
      };
    }

    const status = typeof error.status === "number" ? error.status : undefined;
    const body = error.data as
      | { code?: unknown; message?: unknown }
      | null
      | undefined;
    const code = typeof body?.code === "string" ? body.code : "";
    const serverMessage =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : "";

    return {
      code,
      status,
      message: MESSAGES[code] || serverMessage || messageForStatus(status),
    };
  }

  return {
    code: error.code ?? "",
    message: error.message?.trim() || "Không tải được dữ liệu.",
  };
}

/** `true` khi báo cáo doanh thu không dùng được vì payment-service im lặng. */
export function isPaymentDataUnavailable(
  error: FetchBaseQueryError | SerializedError | undefined,
): boolean {
  return toReportError(error)?.code === "PAYMENT_DATA_UNAVAILABLE";
}
