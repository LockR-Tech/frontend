export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;

  // Admin 2FA login
  isWaitingFor2FA: boolean;
  maskedEmail: string;
  adminLoginStep1: (email: string, password: string) => Promise<void>;
  adminLoginStep2: (otpCode: string) => Promise<void>;
  cancelAdmin2FA: () => void;

  // Partner OTP login
  isWaitingForOTP: boolean;
  partnerContactInfo: string;
  partnerSendOTP: (
    email: string,
    contactType: "EMAIL" | "PHONE",
  ) => Promise<void>;
  partnerVerifyOTP: (email: string, otp: string) => Promise<void>;
  cancelPartnerOTP: () => void;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string[];
  permissions: string[];
  avatar?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ============================================
// Common API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
  timestamp: string;
}

// Query params for pagination (used in API calls)
export interface PageableRequest {
  page?: number;
  size?: number;
  sort?: string;
}

// Response structure from Spring Boot
export interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface Page<T> {
  content: T[];
  pageable: Pageable;
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}
