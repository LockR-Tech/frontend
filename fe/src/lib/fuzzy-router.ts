/**
 * Fuzzy URL matching - Tự động redirect khi user gõ gần đúng URL
 * Sử dụng Levenshtein distance để tìm route gần nhất
 */

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

// Danh sách tất cả các routes hợp lệ
const VALID_ROUTES = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot",
  "/admin/dashboard",
  "/admin/users",
  "/admin/orders",
  "/admin/orders/create",
  "/admin/stores",
  "/admin/stores/create",
  "/admin/lockers",
  "/admin/services",
  "/admin/payments",
  "/admin/loyalty",
  "/admin/partners",
  "/admin/feedback",
  "/admin/scheduler",
  "/admin/settings",
  "/partner/dashboard",
  "/partner/orders",
  "/partner/staff",
  "/partner/revenue",
  "/partner/lockers",
  "/partner/services",
  "/partner/notifications",
  "/partner/settings",
  "/401",
  "/403",
  "/404",
  "/503",
  "/maintenance",
];

// Các alias cho routes (nhiều cách gõ khác nhau)
const ROUTE_ALIASES: Record<string, string> = {
  // Auth aliases
  "/login": "/auth/login",
  "/signin": "/auth/login",
  "/dang-nhap": "/auth/login",
  "/register": "/auth/register",
  "/signup": "/auth/register",
  "/dang-ky": "/auth/register",
  "/forgot-password": "/auth/forgot",
  "/quen-mat-khau": "/auth/forgot",
  
  // Admin aliases
  "/admin": "/admin/dashboard",
  "/dashboard": "/admin/dashboard",
  "/user": "/admin/users",
  "/user-management": "/admin/users",
  "/khach-hang": "/admin/users",
  "/order": "/admin/orders",
  "/don-hang": "/admin/orders",
  "/store": "/admin/stores",
  "/cua-hang": "/admin/stores",
  "/locker": "/admin/lockers",
  "/tu-do": "/admin/lockers",
  "/service": "/admin/services",
  "/dich-vu": "/admin/services",
  "/payment": "/admin/payments",
  "/thanh-toan": "/admin/payments",
  "/partner": "/admin/partners",
  "/doi-tac": "/admin/partners",
  "/feedback": "/admin/feedback",
  "/phan-hoi": "/admin/feedback",
  "/schedule": "/admin/scheduler",
  "/lap-lich": "/admin/scheduler",
  
  // Partner aliases
  "/partner/dashboard": "/partner/dashboard",
  "/partner/order": "/partner/orders",
  "/partner/don-hang": "/partner/orders",
  "/partner/nhan-vien": "/partner/staff",
  "/partner/doanh-thu": "/partner/revenue",
  "/partner/tu-do": "/partner/lockers",
  "/partner/dich-vu": "/partner/services",
  "/partner/thong-bao": "/partner/notifications",
  "/partner/cai-dat": "/partner/settings",
};

/**
 * Tính Levenshtein distance giữa 2 chuỗi
 * Dùng để tìm chuỗi gần giống nhau
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Tìm route gần nhất với path đã cho
 */
function findClosestRoute(path: string): string | null {
  // 1. Kiểm tra alias trước (exact match)
  const normalizedPath = path.toLowerCase().trim();
  if (ROUTE_ALIASES[normalizedPath]) {
    return ROUTE_ALIASES[normalizedPath];
  }

  // 2. Nếu là detail page (có số ID ở cuối), thử match pattern
  const detailMatch = path.match(/^(.*)\/\d+$/);
  if (detailMatch) {
    const basePath = detailMatch[1];
    // Tìm base path trong danh sách
    if (VALID_ROUTES.includes(basePath)) {
      return path; // Giữ nguyên nếu base path hợp lệ
    }
    // Thử tìm alias cho base path
    if (ROUTE_ALIASES[basePath]) {
      const id = path.match(/\/(\d+)$/)?.[1];
      return `${ROUTE_ALIASES[basePath]}/${id}`;
    }
  }

  // 3. Tìm route gần nhất dựa trên Levenshtein distance
  let closestRoute: string | null = null;
  let minDistance = Infinity;
  const threshold = Math.max(3, Math.floor(path.length * 0.4)); // Cho phép sai lệch 40%

  for (const route of VALID_ROUTES) {
    const distance = levenshteinDistance(path, route);
    if (distance < minDistance && distance <= threshold) {
      minDistance = distance;
      closestRoute = route;
    }
  }

  return closestRoute;
}

/**
 * Hook để tự động redirect khi vào 404
 * Sử dụng trong NotFoundPage
 */
export function useFuzzyRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Bỏ qua nếu là trang 404 chính thức
    if (currentPath === "/404") return;

    // Tìm route gần nhất
    const closestRoute = findClosestRoute(currentPath);
    
    if (closestRoute && closestRoute !== currentPath) {
      console.log(`[FuzzyRouter] Redirect: "${currentPath}" -> "${closestRoute}"`);
      navigate(closestRoute, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}

/**
 * Kiểm tra xem path có phải là valid route không
 */
export function isValidRoute(path: string): boolean {
  if (VALID_ROUTES.includes(path)) return true;
  if (ROUTE_ALIASES[path]) return true;
  
  // Kiểm tra detail page pattern
  const detailMatch = path.match(/^(.*)\/\d+$/);
  if (detailMatch) {
    return VALID_ROUTES.includes(detailMatch[1]);
  }
  
  return false;
}

/**
 * Lấy gợi ý routes gần nhất (cho hiển thị UI)
 */
export function getRouteSuggestions(path: string, maxSuggestions = 3): string[] {
  const suggestions: { route: string; distance: number }[] = [];
  
  for (const route of VALID_ROUTES) {
    const distance = levenshteinDistance(path, route);
    suggestions.push({ route, distance });
  }
  
  return suggestions
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(s => s.route);
}

export { VALID_ROUTES, ROUTE_ALIASES, findClosestRoute };
