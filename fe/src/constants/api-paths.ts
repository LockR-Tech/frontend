// API Base URLs
// Mặc định trỏ về API production (Azure VM sau Nginx/TLS) qua domain, không hard-code IP:
// đổi server chỉ cần đổi DNS. Override bằng VITE_API_BASE_URL trong .env khi chạy
// backend local (http://localhost:18080).
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.locker-drone.tech";

// Root URIs
export const ROOT_URI = {
  AUTH: "/api/auth",
  USERS: "/api/user",
  ADMIN: "/api/admin",
  PARTNER: "/api/partner",
  LOYALTY: "/api/loyalty",
} as const;

// Authentication Endpoints
export const AUTH_ENDPOINTS = {
  // Token Management
  REFRESH_TOKEN: `${ROOT_URI.AUTH}/refresh-token`,
  LOGOUT: `${ROOT_URI.AUTH}/logout`,

  // Email/Password Login
  LOGIN: `${ROOT_URI.AUTH}/login`,

  // Phone OTP Authentication
  PHONE_LOGIN: `${ROOT_URI.AUTH}/phone-login`,
  COMPLETE_REGISTRATION: `${ROOT_URI.AUTH}/complete-registration`,

  // Email OTP Authentication
  EMAIL_SEND_OTP: `${ROOT_URI.AUTH}/email/send-otp`,
  EMAIL_VERIFY_OTP: `${ROOT_URI.AUTH}/email/verify-otp`,
  EMAIL_COMPLETE_REGISTRATION: `${ROOT_URI.AUTH}/email/complete-registration`,

  // Admin Authentication (2FA)
  ADMIN_LOGIN: `${ROOT_URI.ADMIN}/auth/login`,
  ADMIN_VERIFY_2FA: `${ROOT_URI.ADMIN}/auth/verify-2fa`,
  ADMIN_REFRESH: `${ROOT_URI.ADMIN}/auth/refresh`,
} as const;

// User Endpoints
export const USER_ENDPOINTS = {
  HELLO: `${ROOT_URI.USERS}/hello`,
  PROFILE: `${ROOT_URI.USERS}/profile`,
  DASHBOARD: `${ROOT_URI.USERS}/dashboard`,
  READ: `${ROOT_URI.USERS}/read`,
  SECURED: `${ROOT_URI.USERS}/secured`,
} as const;

// Admin Endpoints
export const ADMIN_ENDPOINTS = {
  // Dashboard
  DASHBOARD: `${ROOT_URI.ADMIN}/dashboard/overview`,

  // Users Management
  USERS: `${ROOT_URI.ADMIN}/users`,
  USER_BY_ID: (id: number) => `${ROOT_URI.ADMIN}/users/${id}`,
  USER_STATUS: (id: number) => `${ROOT_URI.ADMIN}/users/${id}/status`,
  USER_ROLES: (id: number) => `${ROOT_URI.ADMIN}/users/${id}/roles`,

  // Stores Management
  STORES: `${ROOT_URI.ADMIN}/stores`,
  STORE_BY_ID: (id: number) => `${ROOT_URI.ADMIN}/stores/${id}`,
  STORE_STATUS: (id: number) => `${ROOT_URI.ADMIN}/stores/${id}/status`,

  // Services Management
  SERVICES: `${ROOT_URI.ADMIN}/services`,
  SERVICE_BY_ID: (id: number) => `${ROOT_URI.ADMIN}/services/${id}`,
  SERVICE_PRICE: (id: number) => `${ROOT_URI.ADMIN}/services/${id}/price`,
  SERVICE_STATUS: (id: number) => `${ROOT_URI.ADMIN}/services/${id}/status`,

  // Lockers Management
  LOCKERS: `${ROOT_URI.ADMIN}/lockers`,
  LOCKER_BY_ID: (id: number) => `${ROOT_URI.ADMIN}/lockers/${id}`,
  LOCKERS_BY_STORE: (storeId: number) =>
    `${ROOT_URI.ADMIN}/lockers/store/${storeId}`,
  LOCKER_MAINTENANCE: (id: number) =>
    `${ROOT_URI.ADMIN}/lockers/${id}/maintenance`,
  LOCKER_BOXES: (id: number) => `${ROOT_URI.ADMIN}/lockers/${id}/boxes`,
  BOX_STATUS: (boxId: number) =>
    `${ROOT_URI.ADMIN}/lockers/boxes/${boxId}/status`,

  // Orders Management
  ORDERS: `${ROOT_URI.ADMIN}/orders`,
  ORDER_BY_ID: (id: number) => `${ROOT_URI.ADMIN}/orders/${id}`,
  ORDER_STATUS: (id: number) => `${ROOT_URI.ADMIN}/orders/${id}/status`,
  ORDER_STATISTICS: `${ROOT_URI.ADMIN}/orders/statistics`,
  ORDER_REVENUE: `${ROOT_URI.ADMIN}/orders/revenue`,

  // Payments Management
  PAYMENTS: `${ROOT_URI.ADMIN}/payments`,
  PAYMENT_BY_ID: (paymentId: number) =>
    `${ROOT_URI.ADMIN}/payments/${paymentId}`,
  PAYMENT_STATUS: (paymentId: number) =>
    `${ROOT_URI.ADMIN}/payments/${paymentId}/status`,

  // Wallet Management
  WALLET_BY_USER: (userId: number) => `${ROOT_URI.ADMIN}/wallet/${userId}`,
  WALLET_TRANSACTIONS: (userId: number) =>
    `${ROOT_URI.ADMIN}/wallet/${userId}/transactions`,
  WALLET_ADJUST: (userId: number) => `${ROOT_URI.ADMIN}/wallet/${userId}/adjust`,

  // Scheduler Management
  SCHEDULER_STATUS: `${ROOT_URI.ADMIN}/scheduler/status`,
  SCHEDULER_AUTO_CANCEL: `${ROOT_URI.ADMIN}/scheduler/auto-cancel`,
  SCHEDULER_RELEASE_BOXES: `${ROOT_URI.ADMIN}/scheduler/release-boxes`,
  SCHEDULER_PICKUP_REMINDERS: `${ROOT_URI.ADMIN}/scheduler/pickup-reminders`,

  // Loyalty Management (real endpoints only)
  LOYALTY_STATISTICS: `${ROOT_URI.ADMIN}/loyalty/statistics`,
  LOYALTY_USER_SUMMARY: (userId: number) =>
    `${ROOT_URI.ADMIN}/loyalty/users/${userId}`,
  LOYALTY_USER_ADJUST_POINTS: (userId: number) =>
    `${ROOT_URI.ADMIN}/loyalty/users/${userId}/adjust-points`,
  LOYALTY_USER_HISTORY: (userId: number) =>
    `${ROOT_URI.ADMIN}/loyalty/users/${userId}/history`,

  // Partner Management
  PARTNERS: `${ROOT_URI.ADMIN}/partners`,
  PARTNER_BY_ID: (partnerId: number) =>
    `${ROOT_URI.ADMIN}/partners/${partnerId}`,
  PARTNER_APPROVE: (partnerId: number) =>
    `${ROOT_URI.ADMIN}/partners/${partnerId}/approve`,
  PARTNER_REJECT: (partnerId: number) =>
    `${ROOT_URI.ADMIN}/partners/${partnerId}/reject`,
  PARTNER_SUSPEND: (partnerId: number) =>
    `${ROOT_URI.ADMIN}/partners/${partnerId}/suspend`,

  // Promotion Management
  PROMOTIONS: `${ROOT_URI.ADMIN}/promotions`,
  PROMOTION_BY_ID: (id: number) => `${ROOT_URI.ADMIN}/promotions/${id}`,
  PROMOTIONS_ACTIVE: `${ROOT_URI.ADMIN}/promotions/active`,
  PROMOTIONS_BY_STATUS: (status: string) =>
    `${ROOT_URI.ADMIN}/promotions/status/${status}`,
  PROMOTIONS_SEARCH: `${ROOT_URI.ADMIN}/promotions/search`,
  PROMOTION_VALIDATE: (code: string) =>
    `${ROOT_URI.ADMIN}/promotions/validate/${code}`,

  // Notification Management
  NOTIFICATIONS: `${ROOT_URI.ADMIN}/notifications`,
  NOTIFICATION_BY_ID: (id: number) => `${ROOT_URI.ADMIN}/notifications/${id}`,
  NOTIFICATION_STATUS: (id: number) =>
    `${ROOT_URI.ADMIN}/notifications/${id}/status`,
  NOTIFICATION_STATS: `${ROOT_URI.ADMIN}/notifications/stats`,
  NOTIFICATION_BROADCAST: `${ROOT_URI.ADMIN}/notifications/broadcast`,
  NOTIFICATION_BULK_DELETE: `${ROOT_URI.ADMIN}/notifications/bulk`,
  NOTIFICATION_TEMPLATES: `${ROOT_URI.ADMIN}/notifications/templates`,
  NOTIFICATION_RESEND: (id: number) =>
    `${ROOT_URI.ADMIN}/notifications/${id}/resend`,

  // Feedback Management
  FEEDBACK: `${ROOT_URI.ADMIN}/feedback`,
  FEEDBACK_BY_ID: (id: number) => `${ROOT_URI.ADMIN}/feedback/${id}`,
  FEEDBACK_STATUS: (id: number) => `${ROOT_URI.ADMIN}/feedback/${id}/status`,
  FEEDBACK_REPLY: (id: number) => `${ROOT_URI.ADMIN}/feedback/${id}/reply`,

  // Report Management (LockerReport)
  REPORTS: `${ROOT_URI.ADMIN}/lockers/reports`,
  REPORT_BY_ID: (id: number) => `${ROOT_URI.ADMIN}/lockers/reports/${id}`,
  REPORT_RESOLVE: (id: number) =>
    `${ROOT_URI.ADMIN}/lockers/reports/${id}/resolve`,

  // Analytics
  ANALYTICS_FEEDBACK: `${ROOT_URI.ADMIN}/analytics/feedback`,
  ANALYTICS_SATISFACTION: `${ROOT_URI.ADMIN}/analytics/satisfaction`,

  // Legacy
  ANALYTICS: `${ROOT_URI.ADMIN}/analytics`,
  SCHEDULE: `${ROOT_URI.ADMIN}/schedule`,
  INTEGRATIONS: `${ROOT_URI.ADMIN}/integrations`,
  SETTINGS: `${ROOT_URI.ADMIN}/settings`,
} as const;

// Loyalty (User-facing) Endpoints
export const LOYALTY_ENDPOINTS = {
  PROFILE: `${ROOT_URI.LOYALTY}/profile`,
  REWARDS: `${ROOT_URI.LOYALTY}/rewards`,
  REDEEM: `${ROOT_URI.LOYALTY}/redeem`,
  TRANSACTIONS: `${ROOT_URI.LOYALTY}/transactions`,
} as const;

// Partner Endpoints
export const PARTNER_ENDPOINTS = {
  PROFILE: `${ROOT_URI.PARTNER}`,
  REGISTER: `${ROOT_URI.PARTNER}/register`,
  DASHBOARD: `${ROOT_URI.PARTNER}/dashboard`,
  ORDERS: `${ROOT_URI.PARTNER}/orders`,
  ORDERS_PENDING: `${ROOT_URI.PARTNER}/orders/pending`,
  ORDER_BY_ID: (id: number) => `${ROOT_URI.PARTNER}/orders/${id}`,
  ORDER_ACCEPT: (id: number) => `${ROOT_URI.PARTNER}/orders/${id}/accept`,
  ORDER_PROCESS: (id: number) => `${ROOT_URI.PARTNER}/orders/${id}/process`,
  ORDER_READY: (id: number) => `${ROOT_URI.PARTNER}/orders/${id}/ready`,
  ORDER_WEIGHT: (id: number) => `${ROOT_URI.PARTNER}/orders/${id}/weight`,
  ORDER_COLLECT: (id: number) => `${ROOT_URI.PARTNER}/orders/${id}/collect`,
  ORDER_STATISTICS: `${ROOT_URI.PARTNER}/orders/statistics`,
  ACCESS_CODES: `${ROOT_URI.PARTNER}/access-codes`,
  ACCESS_CODE_GENERATE: `${ROOT_URI.PARTNER}/access-codes/generate`,
  ACCESS_CODES_BY_ORDER: (orderId: number) =>
    `${ROOT_URI.PARTNER}/access-codes/order/${orderId}`,
  ACCESS_CODE_CANCEL: (codeId: number) =>
    `${ROOT_URI.PARTNER}/access-codes/${codeId}/cancel`,
  STAFF: `${ROOT_URI.PARTNER}/staff`,
  STAFF_BY_ID: (id: number) => `${ROOT_URI.PARTNER}/staff/${id}`,
  STORES: `${ROOT_URI.PARTNER}/stores`,
  STORE_LOCKERS: (storeId: number) => `api/lockers/${storeId}`,
  LOCKERS: `${ROOT_URI.PARTNER}/lockers`,
  GET_BOXES_BY_LOCKER: (storeId: number) => `api/locker/${storeId}/boxes`,
  LOCKER_AVAILABLE_BOXES: (lockerId: number) =>
    `${ROOT_URI.PARTNER}/lockers/${lockerId}/boxes/available`,
  LOCKER_BOXES: (lockerId: number) => `/api/lockers/${lockerId}/boxes`,
  REVENUE: `${ROOT_URI.PARTNER}/revenue`,
  ORDER_COMPLAINTS: (orderId: number) => `/api/orders/${orderId}/complaints`,
  ORDER_RATING: (orderId: number) => `/api/orders/${orderId}/rating`,
} as const;

// Combined API Paths
export const API_PATHS = {
  ...AUTH_ENDPOINTS,
  ...USER_ENDPOINTS,
  ...ADMIN_ENDPOINTS,
  ...PARTNER_ENDPOINTS,
} as const;
// HTTP Methods & Metadata
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const;
export const CONTENT_TYPES = {
  JSON: "application/json",
  FORM_DATA: "multipart/form-data",
} as const;

export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error occurred",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  NOT_FOUND: "Resource not found",
  SERVER_ERROR: "Internal server error",
  UNKNOWN_ERROR: "An unknown error occurred",
} as const;
