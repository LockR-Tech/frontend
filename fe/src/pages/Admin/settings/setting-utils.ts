import type {
  SettingScope,
  SettingValueInput,
  SettingView,
} from "~/stores/apis/admin/businessSettings";
import i18n from "~/utils/i18n";

// Toàn bộ logic kiểm tra / chuẩn hoá / hiển thị giá trị quy tắc nghiệp vụ.
// Dựa hoàn toàn vào metadata từ API (type, min, max, allowedValues, unit) — không biết trước key nào.
// Chuỗi hiển thị dịch lúc gọi (i18n.t) — component hiển thị phải gọi useTranslation() để render lại khi đổi ngôn ngữ.

/** Bản nháp theo key, lưu ở dạng chuỗi giống `SettingView.value`. */
export type DraftMap = Record<string, string>;
export type ScopeDrafts = Partial<Record<SettingScope, DraftMap>>;

export interface SettingChange {
  setting: SettingView;
  raw: string;
  error: string | null;
}

const INTEGER_RE = /^[+-]?\d+$/;
const DECIMAL_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const LIST_SEPARATOR_RE = /[,;\s]+/;

function emptyText(): string {
  return i18n.t("admin.settings.value.empty");
}

export const EMPTY_SELECT_VALUE = "__empty__";

export function currentRaw(setting: SettingView): string {
  return setting.value ?? "";
}

export function settingLabel(setting: SettingView): string {
  return setting.label?.trim() || setting.key;
}

export function allowedValuesOf(setting: SettingView): string[] {
  return (setting.allowedValues ?? []).filter(
    (v): v is string => typeof v === "string",
  );
}

export function splitList(raw: string): string[] {
  return raw
    .split(LIST_SEPARATOR_RE)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Cho phép gõ dấu phẩy thập phân kiểu Việt Nam ("12,5") khi không có dấu chấm. */
function toDecimalString(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.includes(".") ? trimmed : trimmed.replace(",", ".");
}

function parseBound(bound: string | null | undefined): number | null {
  if (bound === null || bound === undefined || bound.trim() === "") return null;
  const n = Number(bound);
  return Number.isFinite(n) ? n : null;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 10 });
}

function withUnit(text: string, unit: string | null | undefined): string {
  return unit ? `${text} ${unit}` : text;
}

function checkRange(setting: SettingView, n: number, lowercase = false): string | null {
  const min = parseBound(setting.min);
  const max = parseBound(setting.max);
  if (min !== null && n < min) {
    return i18n.t(lowercase ? "admin.settings.validation.minLower" : "admin.settings.validation.min", {
      value: withUnit(formatNumber(min), setting.unit),
    });
  }
  if (max !== null && n > max) {
    return i18n.t(lowercase ? "admin.settings.validation.maxLower" : "admin.settings.validation.max", {
      value: withUnit(formatNumber(max), setting.unit),
    });
  }
  return null;
}

/** Chuẩn hoá để so sánh "đã thay đổi chưa" (vd "015000" == "15000", "12.50" == "12.5"). */
export function normalizeValue(setting: SettingView, raw: string): string {
  switch (setting.type) {
    case "INTEGER": {
      const t = raw.trim();
      return INTEGER_RE.test(t) && Number.isSafeInteger(Number(t))
        ? String(Number(t))
        : t;
    }
    case "DECIMAL": {
      const t = toDecimalString(raw);
      return DECIMAL_RE.test(t) && Number.isFinite(Number(t))
        ? String(Number(t))
        : t;
    }
    case "BOOLEAN":
      return raw.trim().toLowerCase();
    case "INTEGER_LIST":
      return splitList(raw)
        .map((item) =>
          INTEGER_RE.test(item) && Number.isSafeInteger(Number(item))
            ? String(Number(item))
            : item,
        )
        .join(",");
    case "STRING":
    default:
      return raw;
  }
}

function checkAllowed(setting: SettingView, raw: string): string | null {
  const allowed = allowedValuesOf(setting);
  if (allowed.length === 0) return null;
  const normalized = normalizeValue(setting, raw);
  const ok = allowed.some((a) => normalizeValue(setting, a) === normalized);
  return ok ? null : i18n.t("admin.settings.validation.notAllowed");
}

/** Kiểm tra một phần tử của INTEGER_LIST (min/max áp cho từng phần tử). */
export function validateListItem(setting: SettingView, item: string): string | null {
  if (!INTEGER_RE.test(item)) return i18n.t("admin.settings.validation.itemNotInteger", { item });
  const n = Number(item);
  if (!Number.isSafeInteger(n)) return i18n.t("admin.settings.validation.itemTooLarge", { item });
  const range = checkRange(setting, n, true);
  if (range) return `${formatNumber(n)}: ${range}`;
  const allowed = allowedValuesOf(setting);
  if (allowed.length > 0 && !allowed.some((a) => normalizeValue(setting, a) === String(n))) {
    return i18n.t("admin.settings.validation.itemNotAllowed", { value: formatNumber(n) });
  }
  return null;
}

/** Thông báo lỗi (theo ngôn ngữ đang chọn), hoặc `null` nếu hợp lệ. Mirror kiểm tra phía backend. */
export function validateSetting(setting: SettingView, raw: string): string | null {
  switch (setting.type) {
    case "INTEGER": {
      const t = raw.trim();
      if (!t) return i18n.t("admin.settings.validation.required");
      if (!INTEGER_RE.test(t)) return i18n.t("admin.settings.validation.mustBeInteger");
      const n = Number(t);
      if (!Number.isSafeInteger(n)) return i18n.t("admin.settings.validation.tooLarge");
      return checkRange(setting, n) ?? checkAllowed(setting, t);
    }
    case "DECIMAL": {
      const t = toDecimalString(raw);
      if (!t) return i18n.t("admin.settings.validation.required");
      if (!DECIMAL_RE.test(t)) return i18n.t("admin.settings.validation.mustBeNumber");
      const n = Number(t);
      if (!Number.isFinite(n)) return i18n.t("admin.settings.validation.invalidNumber");
      return checkRange(setting, n) ?? checkAllowed(setting, t);
    }
    case "BOOLEAN": {
      const t = raw.trim().toLowerCase();
      return t === "true" || t === "false" ? null : i18n.t("admin.settings.validation.booleanOnly");
    }
    case "INTEGER_LIST": {
      for (const item of splitList(raw)) {
        const error = validateListItem(setting, item);
        if (error) return error;
      }
      return null;
    }
    case "STRING":
    default:
      return checkAllowed(setting, raw);
  }
}

export function isDirty(setting: SettingView, draft: string | undefined): boolean {
  if (draft === undefined) return false;
  return normalizeValue(setting, draft) !== normalizeValue(setting, currentRaw(setting));
}

export function collectChanges(settings: SettingView[], drafts: DraftMap | undefined): SettingChange[] {
  if (!drafts) return [];
  const changes: SettingChange[] = [];
  for (const setting of settings) {
    const raw = drafts[setting.key];
    if (raw !== undefined && isDirty(setting, raw)) {
      changes.push({ setting, raw, error: validateSetting(setting, raw) });
    }
  }
  return changes;
}

/** Giá trị gửi trong body PUT theo đúng kiểu. */
export function toPayloadValue(setting: SettingView, raw: string): SettingValueInput {
  switch (setting.type) {
    case "INTEGER":
      return Number(raw.trim());
    case "DECIMAL":
      return Number(toDecimalString(raw));
    case "BOOLEAN":
      return raw.trim().toLowerCase() === "true";
    case "INTEGER_LIST":
      return splitList(raw).map(Number);
    case "STRING":
    default:
      return raw;
  }
}

/** Hiển thị giá trị cho người đọc (có đơn vị, phân tách hàng nghìn). */
export function formatSettingValue(setting: SettingView, raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return "—";
  switch (setting.type) {
    case "INTEGER":
    case "DECIMAL": {
      const t = setting.type === "DECIMAL" ? toDecimalString(raw) : raw.trim();
      if (t === "") return emptyText();
      const pattern = setting.type === "DECIMAL" ? DECIMAL_RE : INTEGER_RE;
      const n = Number(t);
      return pattern.test(t) && Number.isFinite(n) ? withUnit(formatNumber(n), setting.unit) : raw;
    }
    case "BOOLEAN": {
      const t = raw.trim().toLowerCase();
      if (t === "true") return i18n.t("admin.settings.value.on");
      if (t === "false") return i18n.t("admin.settings.value.off");
      return raw;
    }
    case "INTEGER_LIST": {
      const items = splitList(raw);
      if (items.length === 0) return emptyText();
      const text = items
        .map((item) => (INTEGER_RE.test(item) ? formatNumber(Number(item)) : item))
        .join(", ");
      return withUnit(text, setting.unit);
    }
    case "STRING":
    default:
      return raw === "" ? emptyText() : raw;
  }
}

/** Gợi ý khoảng giá trị hợp lệ, vd "Từ 0 đến 100.000.000 VND". */
export function rangeHint(setting: SettingView): string | null {
  if (setting.type !== "INTEGER" && setting.type !== "DECIMAL" && setting.type !== "INTEGER_LIST") {
    return null;
  }
  const min = parseBound(setting.min);
  const max = parseBound(setting.max);
  const each = setting.type === "INTEGER_LIST";
  if (min !== null && max !== null) {
    return i18n.t(each ? "admin.settings.range.eachBetween" : "admin.settings.range.between", {
      min: formatNumber(min),
      max: withUnit(formatNumber(max), setting.unit),
    });
  }
  if (min !== null) {
    return i18n.t(each ? "admin.settings.range.eachMin" : "admin.settings.validation.min", {
      value: withUnit(formatNumber(min), setting.unit),
    });
  }
  if (max !== null) {
    return i18n.t(each ? "admin.settings.range.eachMax" : "admin.settings.validation.max", {
      value: withUnit(formatNumber(max), setting.unit),
    });
  }
  return null;
}

function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Tìm theo label / key / mô tả / nhóm, không phân biệt hoa thường và dấu tiếng Việt. */
export function matchesSearch(setting: SettingView, query: string): boolean {
  const q = foldText(query.trim());
  if (!q) return true;
  const haystack = foldText(
    [setting.label, setting.key, setting.description, setting.group]
      .filter(Boolean)
      .join(" \n "),
  );
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export interface SettingGroup {
  name: string;
  items: SettingView[];
}

/** Gom theo `group`, giữ thứ tự xuất hiện từ API. `fallbackName`: tên nhóm cho quy tắc không có `group`. */
export function groupSettings(
  settings: SettingView[],
  fallbackName: string = i18n.t("admin.settings.groups.other"),
): SettingGroup[] {
  const groups = new Map<string, SettingView[]>();
  for (const setting of settings) {
    const name = setting.group?.trim() || fallbackName;
    const list = groups.get(name);
    if (list) list.push(setting);
    else groups.set(name, [setting]);
  }
  return Array.from(groups, ([name, items]) => ({ name, items }));
}

// ---------------------------------------------------------------------------
// Lỗi RTK Query
// ---------------------------------------------------------------------------

interface RtkErrorLike {
  status?: number | string;
  message?: string;
  error?: string;
  data?: { code?: string; message?: string; error?: string } | string | null;
}

export function getErrorStatus(err: unknown): number | string | undefined {
  return (err as RtkErrorLike | undefined)?.status;
}

/** Scope có service chưa triển khai API cấu hình -> 404. */
export function isUnsupportedScopeError(err: unknown): boolean {
  return getErrorStatus(err) === 404;
}

/** Ưu tiên `ApiResponse.message` từ backend (vd SETTING_INVALID nêu rõ label/key). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as RtkErrorLike | undefined;
  if (!e) return fallback;
  if (e.data && typeof e.data === "object") {
    const message = e.data.message || e.data.error;
    if (message) return message;
  }
  if (typeof e.data === "string" && e.data.trim() && !e.data.trim().startsWith("<")) {
    return e.data.trim();
  }
  if (e.status === "FETCH_ERROR") return i18n.t("common.serverUnreachable");
  if (e.status === "TIMEOUT_ERROR") return i18n.t("admin.settings.errors.timeout");
  if (e.status === 403) return i18n.t("admin.settings.errors.forbidden");
  return e.message || e.error || fallback;
}
