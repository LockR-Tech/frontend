import { getRoleLabel } from "~/constants/roles";
import type {
  KnowledgeDocumentStatus,
  KnowledgeEvalCaseInput,
  KnowledgeEvalReport,
} from "~/stores/apis/admin/knowledge";

/** Kết quả lần chạy đánh giá gần nhất (giữ ở cấp trang để đổi tab không mất). */
export interface EvalRun {
  report: KnowledgeEvalReport;
  /** Có gọi Claude sinh câu trả lời không. */
  generated: boolean;
  ranAt: Date;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/** Khớp DocumentParser.detect của assistant-service. */
export const ACCEPTED_EXTENSIONS = [
  ".md",
  ".markdown",
  ".txt",
  ".html",
  ".htm",
  ".pdf",
  ".docx",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

/** Khớp KnowledgeService.MAX_BYTES và giới hạn body 20 MB của Nginx. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const MAX_TITLE_LENGTH = 255;
export const MAX_QUESTION_LENGTH = 2000;

/** Lỗi hiển thị cho người dùng, `null` nếu file hợp lệ. */
export function validateUploadFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Chỉ hỗ trợ Markdown (.md), TXT, HTML, PDF và DOCX.";
  }
  if (file.size === 0) return "File rỗng.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File ${formatBytes(file.size)} vượt quá giới hạn 20 MB.`;
  }
  return null;
}

/** Tiêu đề mặc định backend dùng khi bỏ trống: tên file bỏ phần đuôi. */
export function defaultTitleFromFileName(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

// ---------------------------------------------------------------------------
// Trạng thái & vai trò
// ---------------------------------------------------------------------------

export const STATUS_META: Record<
  KnowledgeDocumentStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Chờ đánh chỉ mục",
    className: "border-amber-300 bg-amber-50 text-amber-800",
  },
  INDEXING: {
    label: "Đang đánh chỉ mục",
    className: "border-blue-300 bg-blue-50 text-blue-800",
  },
  READY: {
    label: "Sẵn sàng",
    className: "border-green-300 bg-green-50 text-green-800",
  },
  FAILED: {
    label: "Lỗi",
    className: "border-red-300 bg-red-50 text-red-800",
  },
};

export function statusMeta(status: string): { label: string; className: string } {
  return (
    STATUS_META[status as KnowledgeDocumentStatus] ?? {
      label: status,
      className: "border-border bg-muted text-muted-foreground",
    }
  );
}

export function knowledgeRoleLabel(role: string): string {
  return role === "ALL" ? "Tất cả người dùng" : getRoleLabel(role);
}

/**
 * Chọn/bỏ một vai trò đọc tài liệu theo đúng luật backend: `ALL` thắng mọi vai trò khác,
 * chọn vai trò cụ thể thì bỏ `ALL`, bỏ hết thì quay về `ALL`.
 */
export function toggleDocumentRole(
  current: string[],
  role: string,
  checked: boolean,
): string[] {
  if (role === "ALL") {
    // Bỏ ALL mà không còn vai trò nào khác thì vẫn là ALL: muốn thu hẹp, chọn vai trò cụ thể.
    const rest = current.filter((r) => r !== "ALL");
    return checked || rest.length === 0 ? ["ALL"] : rest;
  }
  const specific = current.filter((r) => r !== "ALL" && r !== role);
  const next = checked ? [...specific, role] : specific;
  return next.length === 0 ? ["ALL"] : next;
}

/** Vai trò người hỏi trong câu đánh giá: không có ALL, bỏ hết thì quay về CUSTOMER. */
export function toggleEvalRole(current: string[], role: string, checked: boolean): string[] {
  const rest = current.filter((r) => r !== role);
  const next = checked ? [...rest, role] : rest;
  return next.length === 0 ? ["CUSTOMER"] : next;
}

/** Độ giống cosine 0..1 -> "62%". */
export function formatScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return `${Math.round(score * 100)}%`;
}

/** "3/4 (75%)"; mẫu số 0 -> "—". */
export function formatRatio(part: number, total: number): string {
  if (!total) return "—";
  return `${part}/${total} (${Math.round((part / total) * 100)}%)`;
}

export function sameTitle(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Lỗi API
// ---------------------------------------------------------------------------

/** Mã lỗi chung của backend có message tiếng Anh -> luôn dùng câu tiếng Việt. */
const GENERIC_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy dữ liệu (có thể đã bị xoá).",
  VALIDATION_ERROR: "Dữ liệu gửi lên không hợp lệ.",
  DATA_CONFLICT: "Dữ liệu bị trùng hoặc vi phạm ràng buộc.",
  INTERNAL_ERROR: "Máy chủ gặp lỗi khi xử lý yêu cầu.",
};

/** Dự phòng khi backend không kèm message (bình thường message đã là tiếng Việt). */
const BUSINESS_CODE_MESSAGES: Record<string, string> = {
  DOCUMENT_EMPTY: "File rỗng.",
  DOCUMENT_TOO_LARGE: "File tối đa 20 MB.",
  DOCUMENT_TYPE_UNSUPPORTED: "Chỉ hỗ trợ Markdown, TXT, HTML, PDF và DOCX.",
  DOCUMENT_DUPLICATE: "Tài liệu này đã có trong kho tri thức.",
  DOCUMENT_UNREADABLE: "Không đọc được file tải lên.",
  ROLE_INVALID: "Vai trò không hợp lệ.",
  EVAL_CASE_INVALID: "Câu không bắt buộc từ chối phải có tài liệu mong đợi.",
  ASSISTANT_NOT_CONFIGURED: "Trợ lý hỏi đáp chưa được cấu hình trên máy chủ (thiếu khoá API mô hình).",
  ASSISTANT_UNAVAILABLE: "Nhà cung cấp mô hình đang lỗi, thử lại sau.",
};

interface RtkErrorLike {
  status?: number | string;
  originalStatus?: number;
  data?: unknown;
  error?: string;
  message?: string;
}

/** Mã nghiệp vụ trong lỗi RTK Query (rỗng nếu không có). */
export function getKnowledgeErrorCode(err: unknown): string {
  const data = (err as RtkErrorLike | undefined)?.data as { code?: unknown } | undefined;
  return data && typeof data === "object" && typeof data.code === "string" ? data.code : "";
}

export function getKnowledgeErrorMessage(err: unknown, fallback: string): string {
  const e = err as RtkErrorLike | undefined;
  if (!e) return fallback;

  const code = getKnowledgeErrorCode(err);
  if (code && GENERIC_CODE_MESSAGES[code]) return GENERIC_CODE_MESSAGES[code];

  // Chỉ tin `message` của ApiResponse (có `code`); lỗi mặc định của Spring/gateway là tiếng Anh.
  if (code) {
    const message = (e.data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
    if (BUSINESS_CODE_MESSAGES[code]) return BUSINESS_CODE_MESSAGES[code];
  }

  // Nginx trả HTML (không parse được JSON) khi body vượt giới hạn.
  const status = e.status === "PARSING_ERROR" ? e.originalStatus : e.status;
  switch (status) {
    case 413:
      return "File vượt quá giới hạn 20 MB của máy chủ.";
    case 403:
      return "Tài khoản không có quyền ADMIN để thực hiện thao tác này.";
    case 404:
      return "Máy chủ chưa hỗ trợ chức năng này (assistant-service chưa triển khai?).";
    case 500:
      return "Máy chủ gặp lỗi khi xử lý yêu cầu.";
    case 502:
    case 503:
    case 504:
      return "Trợ lý hỏi đáp đang không phản hồi. Thử lại sau.";
    case "FETCH_ERROR":
      return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
    case "TIMEOUT_ERROR":
      return "Máy chủ phản hồi quá lâu. Thử lại sau.";
    default:
      return fallback;
  }
}

// ---------------------------------------------------------------------------
// Nhập hàng loạt câu đánh giá từ JSON
// ---------------------------------------------------------------------------

export const EVAL_JSON_EXAMPLE = `[
  {
    "question": "Gửi đồ ở tủ tối đa bao lâu thì bị tính phí lưu giữ?",
    "roles": ["CUSTOMER"],
    "expectedDocumentTitle": "Hướng dẫn sử dụng tủ",
    "mustRefuse": false
  },
  {
    "question": "Giá cổ phiếu hôm nay thế nào?",
    "roles": ["CUSTOMER"],
    "mustRefuse": true
  }
]`;

const VALID_EVAL_ROLES = new Set(["ALL", "CUSTOMER", "LOCKER_TECHNICIAN", "DRONE_TECHNICIAN", "ADMIN"]);

export interface ParsedEvalCases {
  cases: KnowledgeEvalCaseInput[];
  errors: string[];
}

/** Kiểm tra JSON dán vào trước khi gửi (backend báo lỗi cả lô nếu một câu sai). */
export function parseEvalCasesJson(text: string): ParsedEvalCases {
  const trimmed = text.trim();
  if (!trimmed) return { cases: [], errors: ["Chưa dán nội dung JSON."] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    return {
      cases: [],
      errors: [`JSON không hợp lệ: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) return { cases: [], errors: ["Mảng rỗng."] };

  const cases: KnowledgeEvalCaseInput[] = [];
  const errors: string[] = [];

  items.forEach((item, index) => {
    const at = `Câu #${index + 1}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${at}: phải là một object.`);
      return;
    }
    const raw = item as Record<string, unknown>;

    const question = typeof raw.question === "string" ? raw.question.trim() : "";
    if (!question) {
      errors.push(`${at}: thiếu "question".`);
      return;
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      errors.push(`${at}: "question" dài quá ${MAX_QUESTION_LENGTH} ký tự.`);
      return;
    }

    if (raw.mustRefuse !== undefined && typeof raw.mustRefuse !== "boolean") {
      errors.push(`${at}: "mustRefuse" phải là true/false.`);
      return;
    }
    const mustRefuse = raw.mustRefuse === true;

    let roles: string[] | undefined;
    if (raw.roles !== undefined && raw.roles !== null) {
      if (!Array.isArray(raw.roles) || raw.roles.some((r) => typeof r !== "string")) {
        errors.push(`${at}: "roles" phải là mảng chuỗi.`);
        return;
      }
      roles = (raw.roles as string[])
        .map((r) => r.trim().toUpperCase().replace(/^ROLE_/, ""))
        .filter(Boolean);
      const invalid = roles.filter((r) => !VALID_EVAL_ROLES.has(r));
      if (invalid.length > 0) {
        errors.push(`${at}: vai trò không hợp lệ ${invalid.join(", ")}.`);
        return;
      }
    }

    const expected =
      typeof raw.expectedDocumentTitle === "string" ? raw.expectedDocumentTitle.trim() : "";
    if (raw.expectedDocumentTitle != null && typeof raw.expectedDocumentTitle !== "string") {
      errors.push(`${at}: "expectedDocumentTitle" phải là chuỗi.`);
      return;
    }
    if (expected.length > MAX_TITLE_LENGTH) {
      errors.push(`${at}: "expectedDocumentTitle" dài quá ${MAX_TITLE_LENGTH} ký tự.`);
      return;
    }
    if (!mustRefuse && !expected) {
      errors.push(`${at}: câu không bắt buộc từ chối phải có "expectedDocumentTitle".`);
      return;
    }

    cases.push({
      question,
      ...(roles && roles.length > 0 ? { roles } : {}),
      expectedDocumentTitle: expected || null,
      mustRefuse,
    });
  });

  return { cases, errors };
}
