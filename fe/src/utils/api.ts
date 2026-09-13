import { API_BASE_URL, AUTH_ENDPOINTS, ROOT_URI } from "~/constants/api-paths";

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
 * Get the access token from localStorage
 */
function getAccessToken(): string | null {
  return localStorage.getItem("accessToken")?.replace(/\s/g, "") || null;
}

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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add Authorization header for protected endpoints
  if (!isPublicEndpoint(endpoint)) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log(`✅ [API] Token attached to ${method} ${endpoint}`);
    } else {
      console.warn(`⚠️ [API] No token found for ${method} ${endpoint}`);
    }
  } else {
    console.log(
      `📌 [API] Public endpoint (no token needed): ${method} ${endpoint}`,
    );
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options?.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  console.log(`🔗 [API] Calling: ${fullUrl}`, { headers });

  const response = await fetch(fullUrl, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message ||
        `API Error ${response.status}: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data;
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
