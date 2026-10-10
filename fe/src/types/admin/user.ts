import type { AuthProvider, RoleName } from './enums';

// ============================================
// Admin User Management Types
// ============================================

export interface AdminUserResponse {
  id: number;
  email: string;
  name: string;
  phoneNumber?: string;
  imageUrl: string;
  provider: AuthProvider;
  emailVerified: boolean;
  /** Suy ra từ `status` ở users slice (backend không gửi trường này). */
  enabled: boolean;
  /** ACTIVE / INACTIVE — trạng thái thật do user-service trả. */
  status?: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phoneNumber?: string;
  roles: string[];
  /** @deprecated user-service đọc `status`. */
  enabled?: boolean;
  status?: "ACTIVE" | "INACTIVE";
}

/** Khớp UserProfileRequest của user-service (không có `name` — dùng firstName/lastName). */
export interface UpdateUserRequest {
  /** @deprecated backend bỏ qua; dùng firstName/lastName. */
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  imageUrl?: string;
  phoneNumber?: string;
  /** Gửi kèm trạng thái hiện tại — backend cũ đặt lại ACTIVE khi thiếu. */
  status?: "ACTIVE" | "INACTIVE";
}

export interface UpdateUserStatusRequest {
  status: "ACTIVE" | "INACTIVE";
}

export interface UpdateUserRolesRequest {
  roles: RoleName[];
}
