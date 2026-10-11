// Đọc lỗi từ các API báo cáo admin và dịch mã nghiệp vụ sang tiếng Việt.
//
// Backend trả `{ success: false, code, message }`. Mã quan trọng nhất là
// `PAYMENT_DATA_UNAVAILABLE` (503): payment-service không trả lời, màn hình doanh thu
// phải báo lỗi chứ KHÔNG được vẽ số 0 — xem docs/01-overview/admin-reporting-api.md § 0.2.

import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import i18n from "~/utils/i18n";

export interface ReportError {
  /** Mã nghiệp vụ backend trả về, rỗng nếu lỗi mạng hoặc không parse được. */
  code: string;
  /** Câu hiển thị cho người dùng, luôn có nội dung. */
  message: string;
  /** Mã HTTP nếu biết. */
  status?: number;
}

// Khoá i18n theo mã nghiệp vụ; dịch lúc gọi để theo ngôn ngữ hiện tại.
const MESSAGE_KEYS: Record<string, string> = {
  PAYMENT_DATA_UNAVAILABLE: "shared.reportError.paymentDataUnavailable",
  INVALID_PAGE: "shared.reportError.invalidPage",
  INVALID_PAGE_SIZE: "shared.reportError.invalidPageSize",
  INVALID_SORT: "shared.reportError.invalidSort",
  INVALID_DATE: "shared.reportError.invalidDate",
  INVALID_DATE_RANGE: "shared.reportError.invalidDateRange",
  INVALID_KIND: "shared.reportError.invalidKind",
  NOT_FOUND: "shared.reportError.notFound",
  VALIDATION_ERROR: "shared.reportError.validationError",
  INTERNAL_ERROR: "shared.reportError.internalError",
};

function messageForStatus(status: number | undefined): string {
  switch (status) {
    case 401:
      return i18n.t("shared.reportError.status401");
    case 403:
      return i18n.t("shared.reportError.status403");
    case 404:
      return i18n.t("shared.reportError.notFound");
    case 503:
      return i18n.t("shared.reportError.status503");
    default:
      return i18n.t("shared.reportError.loadFailed");
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
        message: i18n.t("shared.reportError.fetchError"),
      };
    }
    if (error.status === "PARSING_ERROR" || error.status === "CUSTOM_ERROR") {
      return {
        code: String(error.status),
        message: i18n.t("shared.reportError.parsingError"),
      };
    }
    if (error.status === "TIMEOUT_ERROR") {
      return {
        code: "TIMEOUT_ERROR",
        message: i18n.t("shared.reportError.timeout"),
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
      message:
        (MESSAGE_KEYS[code] ? i18n.t(MESSAGE_KEYS[code]) : "") ||
        serverMessage ||
        messageForStatus(status),
    };
  }

  return {
    code: error.code ?? "",
    message: error.message?.trim() || i18n.t("shared.reportError.loadFailedShort"),
  };
}

/** `true` khi báo cáo doanh thu không dùng được vì payment-service im lặng. */
export function isPaymentDataUnavailable(
  error: FetchBaseQueryError | SerializedError | undefined,
): boolean {
  return toReportError(error)?.code === "PAYMENT_DATA_UNAVAILABLE";
}
