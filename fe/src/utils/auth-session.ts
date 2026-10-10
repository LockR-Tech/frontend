import { API_BASE_URL, AUTH_ENDPOINTS } from "~/constants/api-paths";

// Phiên đăng nhập dùng chung cho baseApi (RTK Query), utils/api và auth-context.
// Refresh token chỉ dùng được MỘT lần (backend thu hồi ngay khi refresh), nên mọi
// request 401 song song phải chờ chung một lần refresh rồi mới gửi lại.

const AUTH_STORAGE_KEYS = ["accessToken", "refreshToken", "user"] as const;

export function getAccessToken(): string | null {
  return localStorage.getItem("accessToken")?.replace(/\s/g, "") || null;
}

function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken")?.replace(/\s/g, "") || null;
}

// Admin dùng endpoint refresh riêng (kiểm tra quyền ADMIN)
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

/** Kết quả refresh: token mới, hoặc server từ chối (phiên hết hạn thật). */
export type RefreshResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "rejected" | "network" };

let refreshInFlight: Promise<RefreshResult> | null = null;

async function doRefresh(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return { ok: false, reason: "rejected" };

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${getRefreshEndpoint()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Mất mạng tạm thời: không xoá phiên
    return { ok: false, reason: "network" };
  }

  // Gateway/auth-service lỗi tạm (5xx): giữ phiên như mất mạng, chỉ 4xx mới là phiên hết hạn thật
  if (res.status >= 500) return { ok: false, reason: "network" };

  const json = await res.json().catch(() => null);
  const newAccessToken: string | null =
    json?.data?.accessToken ?? json?.accessToken ?? null;
  if (!res.ok || !newAccessToken) {
    // Tab khác đã dùng (và xoay) refresh token này trước: lấy token tab đó vừa lưu thay vì đăng xuất
    const rotatedAccess = getAccessToken();
    if (getRefreshToken() !== refreshToken && rotatedAccess) {
      return { ok: true, accessToken: rotatedAccess };
    }
    return { ok: false, reason: "rejected" };
  }

  localStorage.setItem("accessToken", newAccessToken.replace(/\s/g, ""));
  const newRefreshToken: string | null =
    json?.data?.refreshToken ?? json?.refreshToken ?? null;
  if (newRefreshToken) {
    localStorage.setItem("refreshToken", newRefreshToken.replace(/\s/g, ""));
  }
  return { ok: true, accessToken: newAccessToken };
}

/**
 * Refresh access token theo kiểu single-flight: lần gọi đầu thực sự gửi request,
 * các lần gọi đồng thời khác nhận chung promise đó.
 */
export function refreshAccessToken(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Xử lý 401 cho một request đã gửi bằng `tokenUsed`:
 * - token trong storage đã đổi (request khác vừa refresh xong) → gửi lại luôn;
 * - ngược lại chờ refresh chung.
 * Trả về true nếu nên gửi lại request. Server từ chối refresh → đăng xuất.
 */
export async function recoverFromUnauthorized(
  tokenUsed: string | null,
): Promise<boolean> {
  const current = getAccessToken();
  if (current && current !== tokenUsed) return true;

  const result = await refreshAccessToken();
  if ("accessToken" in result) return true;
  if (result.reason === "rejected") clearAuthAndRedirect();
  return false;
}

export function clearAuthStorage() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

let redirecting = false;

export function clearAuthAndRedirect() {
  clearAuthStorage();
  const { pathname, search, hash } = window.location;
  if (redirecting || pathname.startsWith("/auth/")) return;
  redirecting = true;
  // Giữ trang đang xem để đăng nhập lại xong quay về đúng chỗ
  const from = encodeURIComponent(`${pathname}${search}${hash}`);
  window.location.href = `/auth/login?from=${from}`;
}

/** Thu hồi refresh token ở backend khi đăng xuất (best-effort, không chặn đăng xuất). */
export async function revokeRefreshToken(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;
  // Không để mạng chậm giữ người dùng ở lại: tối đa 3 giây
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.LOGOUT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
  } catch {
    // bỏ qua: phía client vẫn xoá phiên
  } finally {
    window.clearTimeout(timer);
  }
}

/** Lỗi từ auth-service, giữ nguyên `code` của ApiResponse để UI tự dịch. */
export class AuthApiError extends Error {
  readonly code: string;
  readonly status: number;
  /** Token tạm của bước OTP không còn dùng được → phải quay lại bước 1. */
  tempTokenGone = false;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
    this.status = status;
  }
}

/** Đường dẫn quay lại sau đăng nhập; chỉ nhận đường dẫn nội bộ. */
export function sanitizeRedirectPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  // Trình duyệt coi "/\evil.com" như "//evil.com"; ký tự điều khiển cũng loại
  // eslint-disable-next-line no-control-regex
  if (/[\\\x00-\x1f]/.test(path)) return null;
  if (path.startsWith("/auth/")) return null;
  return path;
}
