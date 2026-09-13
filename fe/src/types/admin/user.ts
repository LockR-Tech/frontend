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
  enabled: boolean;
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
  enabled?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  imageUrl?: string;
}

export interface UpdateUserStatusRequest {
  enabled: boolean;
}

export interface UpdateUserRolesRequest {
  roles: RoleName[];
}
