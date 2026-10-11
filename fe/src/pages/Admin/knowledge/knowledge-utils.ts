import { getRoleLabel } from "~/constants/roles";
import i18n from "~/utils/i18n";
import type {
  KnowledgeDocumentStatus,
  KnowledgeEvalCaseInput,
  KnowledgeEvalReport,
} from "~/stores/apis/admin/knowledge";

// Chuỗi hiển thị dịch lúc gọi (i18n.t) — component hiển thị phải gọi useTranslation() để render lại khi đổi ngôn ngữ.

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
    return i18n.t("admin.knowledge.upload.unsupportedType");
  }
  if (file.size === 0) return i18n.t("admin.knowledge.upload.emptyFile");
  if (file.size > MAX_UPLOAD_BYTES) {
    return i18n.t("admin.knowledge.upload.tooLarge", { size: formatBytes(file.size) });
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

// `label` là getter: dịch lúc đọc theo ngôn ngữ hiện tại.
export const STATUS_META: Record<
  KnowledgeDocumentStatus,
  { label: string; className: string }
> = {
  PENDING: {
    get label() {
      return i18n.t("admin.knowledge.status.pending");
    },
    className: "border-amber-300 bg-amber-50 text-amber-800",
  },
  INDEXING: {
    get label() {
      return i18n.t("admin.knowledge.status.indexing");
    },
    className: "border-blue-300 bg-blue-50 text-blue-800",
  },
  READY: {
    get label() {
      return i18n.t("admin.knowledge.status.ready");
    },
    className: "border-green-300 bg-green-50 text-green-800",
  },
  FAILED: {
    get label() {
      return i18n.t("admin.knowledge.status.failed");
    },
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
  return role === "ALL" ? i18n.t("admin.knowledge.roles.all") : getRoleLabel(role);
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

/** Mã lỗi chung của backend có message tiếng Anh -> luôn dùng câu đã dịch (giá trị = message key). */
const GENERIC_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: "admin.knowledge.errors.notFound",
  VALIDATION_ERROR: "admin.knowledge.errors.validation",
  DATA_CONFLICT: "admin.knowledge.errors.conflict",
  INTERNAL_ERROR: "admin.knowledge.errors.internal",
};

/** Dự phòng khi backend không kèm message (bình thường message đã là tiếng Việt). Giá trị = message key. */
const BUSINESS_CODE_MESSAGES: Record<string, string> = {
  DOCUMENT_EMPTY: "admin.knowledge.upload.emptyFile",
  DOCUMENT_TOO_LARGE: "admin.knowledge.errors.documentTooLarge",
  DOCUMENT_TYPE_UNSUPPORTED: "admin.knowledge.errors.documentTypeUnsupported",
  DOCUMENT_DUPLICATE: "admin.knowledge.errors.documentDuplicate",
  DOCUMENT_UNREADABLE: "admin.knowledge.errors.documentUnreadable",
  ROLE_INVALID: "admin.knowledge.errors.roleInvalid",
  EVAL_CASE_INVALID: "admin.knowledge.errors.evalCaseInvalid",
  ASSISTANT_NOT_CONFIGURED: "admin.knowledge.errors.assistantNotConfigured",
  ASSISTANT_UNAVAILABLE: "admin.knowledge.errors.assistantUnavailable",
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
  if (code && GENERIC_CODE_MESSAGES[code]) return i18n.t(GENERIC_CODE_MESSAGES[code]);

  // Chỉ tin `message` của ApiResponse (có `code`); lỗi mặc định của Spring/gateway là tiếng Anh.
  if (code) {
    const message = (e.data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
    if (BUSINESS_CODE_MESSAGES[code]) return i18n.t(BUSINESS_CODE_MESSAGES[code]);
  }

  // Nginx trả HTML (không parse được JSON) khi body vượt giới hạn.
  const status = e.status === "PARSING_ERROR" ? e.originalStatus : e.status;
  switch (status) {
    case 413:
      return i18n.t("admin.knowledge.errors.payloadTooLarge");
    case 403:
      return i18n.t("admin.knowledge.errors.forbidden");
    case 404:
      return i18n.t("admin.knowledge.errors.notSupported");
    case 500:
      return i18n.t("admin.knowledge.errors.internal");
    case 502:
    case 503:
    case 504:
      return i18n.t("admin.knowledge.errors.unavailable");
    case "FETCH_ERROR":
      return i18n.t("admin.knowledge.errors.network");
    case "TIMEOUT_ERROR":
      return i18n.t("admin.knowledge.errors.timeout");
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
  if (!trimmed) return { cases: [], errors: [i18n.t("admin.knowledge.import.errors.empty")] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    return {
      cases: [],
      errors: [
        i18n.t("admin.knowledge.import.errors.invalidJson", {
          message: err instanceof Error ? err.message : String(err),
        }),
      ],
    };
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) return { cases: [], errors: [i18n.t("admin.knowledge.import.errors.emptyArray")] };

  const cases: KnowledgeEvalCaseInput[] = [];
  const errors: string[] = [];

  items.forEach((item, index) => {
    const at = { index: index + 1 };
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(i18n.t("admin.knowledge.import.errors.notObject", at));
      return;
    }
    const raw = item as Record<string, unknown>;

    const question = typeof raw.question === "string" ? raw.question.trim() : "";
    if (!question) {
      errors.push(i18n.t("admin.knowledge.import.errors.missingQuestion", at));
      return;
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      errors.push(i18n.t("admin.knowledge.import.errors.questionTooLong", { ...at, max: MAX_QUESTION_LENGTH }));
      return;
    }

    if (raw.mustRefuse !== undefined && typeof raw.mustRefuse !== "boolean") {
      errors.push(i18n.t("admin.knowledge.import.errors.mustRefuseBoolean", at));
      return;
    }
    const mustRefuse = raw.mustRefuse === true;

    let roles: string[] | undefined;
    if (raw.roles !== undefined && raw.roles !== null) {
      if (!Array.isArray(raw.roles) || raw.roles.some((r) => typeof r !== "string")) {
        errors.push(i18n.t("admin.knowledge.import.errors.rolesArray", at));
        return;
      }
      roles = (raw.roles as string[])
        .map((r) => r.trim().toUpperCase().replace(/^ROLE_/, ""))
        .filter(Boolean);
      const invalid = roles.filter((r) => !VALID_EVAL_ROLES.has(r));
      if (invalid.length > 0) {
        errors.push(i18n.t("admin.knowledge.import.errors.rolesInvalid", { ...at, roles: invalid.join(", ") }));
        return;
      }
    }

    const expected =
      typeof raw.expectedDocumentTitle === "string" ? raw.expectedDocumentTitle.trim() : "";
    if (raw.expectedDocumentTitle != null && typeof raw.expectedDocumentTitle !== "string") {
      errors.push(i18n.t("admin.knowledge.import.errors.expectedString", at));
      return;
    }
    if (expected.length > MAX_TITLE_LENGTH) {
      errors.push(i18n.t("admin.knowledge.import.errors.expectedTooLong", { ...at, max: MAX_TITLE_LENGTH }));
      return;
    }
    if (!mustRefuse && !expected) {
      errors.push(i18n.t("admin.knowledge.import.errors.expectedRequired", at));
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
