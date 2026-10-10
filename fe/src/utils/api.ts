import { API_BASE_URL, AUTH_ENDPOINTS } from "~/constants/api-paths";
import { getAccessToken, recoverFromUnauthorized } from "~/utils/auth-session";

/**
 * List of endpoints that DON'T require authentication
 * (login, register, password reset, etc.)
 */
const PUBLIC_ENDPOINTS = [
  AUTH_ENDPOINTS.LOGIN,
  AUTH_ENDPOINTS.PHONE_LOGIN,
  AUTH_ENDPOINTS.COMPLETE_REGISTRATION,
  AUTH_ENDPOINTS.EMAIL_SEND_OTP,
  AUTH_ENDPOINTS.EMAIL_VERIFY_OTP,
  AUTH_ENDPOINTS.EMAIL_COMPLETE_REGISTRATION,
  "/api/auth/signup",
  "/api/auth/register",
  "/api/auth/forgot-password",
];

/**
 * Check if an endpoint requires authentication
 */
function isPublicEndpoint(endpoint: string): boolean {
  return PUBLIC_ENDPOINTS.some((publicEndpoint) =>
    endpoint.includes(publicEndpoint),
  );
}

/**
 * Centralized API call function with automatic token injection
 *
 * Usage:
 * const data = await apiCall<UserType>('/api/admin/users/1');
 * const result = await apiCall<ResponseType>('/api/endpoint', { method: 'POST', body: {...} });
 */
export async function apiCall<T>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: unknown;
  },
): Promise<T> {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  const method = options?.method || "GET";
  const isPublic = isPublicEndpoint(endpoint);

  // Không log header: trong đó có bearer token
  const send = (token: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (!isPublic && token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const fetchOptions: RequestInit = { method, headers };
    if (options?.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }
    return fetch(fullUrl, fetchOptions);
  };

  const tokenUsed = isPublic ? null : getAccessToken();
  let response = await send(tokenUsed);

  // 401: dùng chung cơ chế refresh single-flight với baseApi, gửi lại một lần
  if (response.status === 401 && !isPublic) {
    const shouldRetry = await recoverFromUnauthorized(tokenUsed);
    if (shouldRetry) {
      response = await send(getAccessToken());
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message ||
        `API Error ${response.status}: ${response.statusText}`,
    );
  }

  // Một số endpoint trả 204 / body rỗng
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

/**
 * Alternative: Specific function for GET requests
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: "GET" });
}

/**
 * Alternative: Specific function for POST requests
 */
export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  return apiCall<T>(endpoint, { method: "POST", body });
}

/**
 * Alternative: Specific function for PUT requests
 */
export async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
  return apiCall<T>(endpoint, { method: "PUT", body });
}

/**
 * Alternative: Specific function for DELETE requests
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: "DELETE" });
}
