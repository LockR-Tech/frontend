// Logic thuần của hướng dẫn lần đầu trên màn hình (F3-G13): lọc nhóm theo vai trò / nền tảng, tính nhóm mới,
// quyết định có tự mở không, xử lý bước không tìm thấy phần tử, kiểm nội dung và bản dịch.
// Không import alias "~/" để chạy được bằng `node --test` (tests/onboarding-*.test.mjs). Bản Dart ở app mobile
// chạy cùng bộ ca kiểm tra tests/fixtures/onboarding-cases.json.

export const TOUR_ROLES = ["ADMIN", "CUSTOMER", "LOCKER_TECHNICIAN", "DRONE_TECHNICIAN"] as const;
export type TourRole = (typeof TOUR_ROLES)[number];
export const TOUR_PLATFORMS = ["web", "mobile"] as const;
export type TourPlatform = (typeof TOUR_PLATFORMS)[number];
export const TOUR_PLACEMENTS = ["auto", "top", "bottom", "left", "right"] as const;
export type TourPlacement = (typeof TOUR_PLACEMENTS)[number];

export const AUTO_OPEN_DELAY_MS = 1000;
/** Sự kiện window: Sidebar mở menu ngăn kéo trên màn hẹp trước khi khoanh mục trong đó. */
export const OPEN_NAV_EVENT = "lockr:tour-open-nav";
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface TourStep {
  id: string;
  /** Phần tử cần khoanh: `data-tour` trên web, `TourAnchor` trên mobile. null = bước giới thiệu ở giữa màn hình. */
  anchor?: string | null;
  /** Trang phải mở trước khi khoanh (react-router path / go_router path). */
  webRoute?: string;
  mobileRoute?: string;
  placement?: TourPlacement;
  /** true = phần tử có thể không có trên màn hình (dữ liệu rỗng, quyền…) ⇒ bỏ qua lặng lẽ. */
  optional?: boolean;
  platforms: TourPlatform[];
  /** Màn hẹp: mở menu ngăn kéo trước khi khoanh. */
  openNav?: boolean;
}

export interface TourGroup {
  id: string;
  version: number;
  order?: number;
  roles: TourRole[];
  steps: TourStep[];
}

export interface TourContent {
  schemaVersion: number;
  groups: TourGroup[];
}

export interface OnboardingState {
  autoShow: boolean;
  seenGroups: Record<string, number>;
  updatedAt?: string | null;
}

export type GroupStatus = "new" | "updated" | "seen";

/** Vai trò từ JWT/hồ sơ (chuỗi "ADMIN, DRONE_TECHNICIAN", mảng, có tiền tố ROLE_…) ⇒ tập vai trò của tour. */
export function normalizeRoles(raw: readonly string[] | string | null | undefined): TourRole[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const out: TourRole[] = [];
  for (const item of list) {
    let r = String(item ?? "").trim().toUpperCase();
    if (r.startsWith("ROLE_")) r = r.slice(5);
    if (r === "SUPER_ADMIN") r = "ADMIN";
    if ((TOUR_ROLES as readonly string[]).includes(r) && !out.includes(r as TourRole)) out.push(r as TourRole);
  }
  return out;
}

const byOrder = (a: TourGroup, b: TourGroup) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id);

export function stepsFor(group: TourGroup, platform: TourPlatform): TourStep[] {
  return group.steps.filter((s) => s.platforms.includes(platform));
}

/** Nhóm người dùng tự chạy được trên nền tảng này: đúng vai trò của mình và có ít nhất một bước ở nền tảng đó. */
export function ownGroups(content: TourContent, roles: readonly TourRole[], platform: TourPlatform): TourGroup[] {
  return content.groups
    .filter((g) => g.roles.some((r) => roles.includes(r)) && stepsFor(g, platform).length > 0)
    .sort(byOrder);
}

/** Nhóm được XEM (danh sách hướng dẫn, trang HDSD): ADMIN xem mọi vai trò, người khác chỉ vai trò mình. */
export function browseGroups(content: TourContent, roles: readonly TourRole[]): TourGroup[] {
  const admin = roles.includes("ADMIN");
  return content.groups.filter((g) => admin || g.roles.some((r) => roles.includes(r))).sort(byOrder);
}

export function groupStatus(group: TourGroup, seen: Record<string, number> | null | undefined): GroupStatus {
  const v = seen?.[group.id];
  if (v == null || v < 1) return "new";
  return group.version > v ? "updated" : "seen";
}

export function pendingGroups(groups: readonly TourGroup[], seen: Record<string, number> | null | undefined) {
  return groups.filter((g) => groupStatus(g, seen) !== "seen");
}

export interface AutoOpenInput {
  signedIn: boolean;
  /** Đang ở khu làm việc (không phải trang đăng nhập, không ở giữa luồng bắt buộc). */
  inWorkspace: boolean;
  /** Đã qua mọi bước bắt buộc sau đăng nhập (2FA, điều khoản, hoàn tất hồ sơ…). */
  mandatoryDone: boolean;
  autoShow: boolean;
  /** Đã bấm "Bỏ qua" trong phiên này. */
  sessionSkipped: boolean;
  /** Đã tự mở một lần trong phiên này. */
  shownThisSession: boolean;
  groups: readonly TourGroup[];
  seen: Record<string, number> | null | undefined;
}

export type AutoOpenDecision =
  | { kind: "none"; reason: string }
  | { kind: "welcome"; groups: TourGroup[] }
  | { kind: "whatsNew"; groups: TourGroup[] };

export function decideAutoOpen(input: AutoOpenInput): AutoOpenDecision {
  if (!input.signedIn) return { kind: "none", reason: "signed-out" };
  if (!input.inWorkspace) return { kind: "none", reason: "not-in-workspace" };
  if (!input.mandatoryDone) return { kind: "none", reason: "mandatory-steps-pending" };
  if (!input.autoShow) return { kind: "none", reason: "skipped-forever" };
  if (input.sessionSkipped) return { kind: "none", reason: "skipped-this-session" };
  if (input.shownThisSession) return { kind: "none", reason: "already-shown" };
  const pending = pendingGroups(input.groups, input.seen);
  if (pending.length === 0) return { kind: "none", reason: "nothing-new" };
  const seenAny = input.groups.some((g) => (input.seen?.[g.id] ?? 0) > 0);
  return seenAny ? { kind: "whatsNew", groups: pending } : { kind: "welcome", groups: [...input.groups] };
}

/** Bước có neo mà không tìm thấy phần tử: bước "có thể không xuất hiện" bỏ qua, bước thường hiện ở giữa kèm lời báo. */
export function resolveStep(step: TourStep, anchorFound: boolean): "show" | "center" | "skip" | "missing" {
  if (!step.anchor) return "center";
  if (anchorFound) return "show";
  return step.optional ? "skip" : "missing";
}

export function textKeys(group: TourGroup): string[] {
  return [
    `groups.${group.id}.title`,
    `groups.${group.id}.summary`,
    ...group.steps.flatMap((s) => [`steps.${s.id}.title`, `steps.${s.id}.body`]),
  ];
}

export function lookup(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

/** Lỗi cấu trúc nội dung (mã, phiên bản, vai trò, nền tảng, phía đặt, trùng id). Rỗng = hợp lệ. */
export function validateContent(content: TourContent): string[] {
  const errors: string[] = [];
  if (content?.schemaVersion !== 1) errors.push("schemaVersion phải là 1");
  const groupIds = new Set<string>();
  const stepIds = new Set<string>();
  for (const g of content?.groups ?? []) {
    if (!ID_PATTERN.test(g.id)) errors.push(`mã nhóm sai định dạng: ${g.id}`);
    if (groupIds.has(g.id)) errors.push(`trùng mã nhóm: ${g.id}`);
    groupIds.add(g.id);
    if (!Number.isInteger(g.version) || g.version < 1) errors.push(`${g.id}: phiên bản phải là số nguyên ≥ 1`);
    if (!g.roles?.length || g.roles.some((r) => !(TOUR_ROLES as readonly string[]).includes(r))) {
      errors.push(`${g.id}: vai trò không hợp lệ`);
    }
    if (!g.steps?.length) errors.push(`${g.id}: không có bước nào`);
    for (const s of g.steps ?? []) {
      if (!ID_PATTERN.test(s.id) || !s.id.startsWith(`${g.id}-`)) errors.push(`${g.id}: id bước phải dạng "${g.id}-…": ${s.id}`);
      if (stepIds.has(s.id)) errors.push(`trùng id bước: ${s.id}`);
      stepIds.add(s.id);
      if (!s.platforms?.length || s.platforms.some((p) => !(TOUR_PLATFORMS as readonly string[]).includes(p))) {
        errors.push(`${s.id}: platforms phải là web / mobile`);
      }
      if (s.placement && !(TOUR_PLACEMENTS as readonly string[]).includes(s.placement)) errors.push(`${s.id}: placement sai`);
      if (s.anchor != null && !ID_PATTERN.test(s.anchor)) errors.push(`${s.id}: neo sai định dạng: ${s.anchor}`);
      if (s.webRoute && !s.webRoute.startsWith("/")) errors.push(`${s.id}: webRoute phải bắt đầu bằng /`);
      if (s.mobileRoute && !s.mobileRoute.startsWith("/")) errors.push(`${s.id}: mobileRoute phải bắt đầu bằng /`);
    }
  }
  return errors;
}

/** Chữ còn thiếu trong từng ngôn ngữ. */
export function missingTranslations(content: TourContent, locales: Record<string, unknown>) {
  const missing: { lang: string; key: string }[] = [];
  for (const [lang, data] of Object.entries(locales)) {
    for (const g of content.groups) {
      for (const key of textKeys(g)) {
        const v = lookup(data, key);
        if (typeof v !== "string" || !v.trim()) missing.push({ lang, key });
      }
    }
  }
  return missing;
}
