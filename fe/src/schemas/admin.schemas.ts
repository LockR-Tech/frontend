import { z } from 'zod';
// updated: 2026-07-12

// ============================================
// Enum Schemas (for validation)
// ============================================

export const AuthProviderSchema = z.enum([
  'LOCAL',
  'GOOGLE',
  'FACEBOOK',
  'GITHUB',
  'ZALO',
  'PHONE',
  'EMAIL',
]);

export const RoleNameSchema = z.enum([
  // Role model chuẩn — khớp JwtGatewayFilter.hasRequiredRole của api-gateway.
  'CUSTOMER',
  'ADMIN',
  'MAINTENANCE',
  'TECHNICIAN',
  // Legacy/back-compat values still present in seed data; kept so request and
  // response validation does not break on existing accounts. MANAGER/STAFF were
  // retired — do not offer them when creating a user.
  'MANAGER',
  'USER',
  'STAFF',
  'MODERATOR',
  'PARTNER',
]);

export const LockerStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'MAINTENANCE',
  'DISCONNECTED',
]);

export const BoxStatusSchema = z.enum([
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'MAINTENANCE',
]);

export const OrderTypeSchema = z.enum([
  'LAUNDRY',
  'DRY_CLEAN',
  'STORAGE',
]);

export const OrderStatusSchema = z.enum([
  'INITIALIZED',
  'RESERVED',
  'WAITING',
  'COLLECTED',
  'PROCESSING',
  'READY',
  'RETURNED',
  'COMPLETED',
  'CANCELED',
]);

export const PaymentMethodSchema = z.enum([
  'CASH',
  'WALLET',
  'BANK_TRANSFER',
  'MOMO',
  'VNPAY',
  'ZALOPAY',
]);

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'CANCELED',
]);

export const PartnerStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
]);

export const PointTransactionTypeSchema = z.enum([
  'EARN',
  'REDEEM',
  'EXPIRE',
  'ADJUST',
  'BONUS',
  'REFUND',
]);

export const StampTypeSchema = z.enum(['BOX', 'SERVICE']);

// ============================================
// User Management Schemas
// ============================================

export const CreateUserRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  roles: z.array(RoleNameSchema),
  enabled: z.boolean().optional().default(true),
});

export const UpdateUserRequestSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email('Invalid email format').optional(),
  imageUrl: z.string().url().optional(),
});

export const UpdateUserStatusRequestSchema = z.object({
  enabled: z.boolean(),
});

export const UpdateUserRolesRequestSchema = z.object({
  roles: z.array(RoleNameSchema),
});

// ============================================
// Store Management Schemas
// ============================================

export const CreateStoreRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  imageUrl: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
});

export const UpdateStoreStatusRequestSchema = z.object({
  enabled: z.boolean(),
});

// ============================================
// Service Management Schemas
// ============================================

export const CreateServiceRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  unit: z.string().optional(),
  imageUrl: z.string().url().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  storeId: z.number().int().optional(),
});

export const UpdateServicePriceRequestSchema = z.object({
  price: z.number().positive('Price must be positive'),
});

export const UpdateServiceStatusRequestSchema = z.object({
  enabled: z.boolean(),
});

// ============================================
// Locker & Box Management Schemas
// ============================================

export const CreateLockerRequestSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  storeId: z.number().int().positive('Store ID is required'),
});

export const CreateBoxRequestSchema = z.object({
  boxNumber: z.number().int().positive('Box number is required'),
  description: z.string().optional(),
});

export const UpdateLockerMaintenanceRequestSchema = z.object({
  maintenance: z.boolean(),
});

export const UpdateBoxStatusRequestSchema = z.object({
  status: BoxStatusSchema,
});

// ============================================
// Order Management Schemas
// ============================================

export const UpdateOrderStatusRequestSchema = z.object({
  status: OrderStatusSchema,
});

// ============================================
// Payment Management Schemas
// ============================================

export const UpdatePaymentStatusRequestSchema = z.object({
  status: PaymentStatusSchema,
});

// ============================================
// Loyalty Management Schemas
// ============================================

export const AdjustUserPointsRequestSchema = z.object({
  userId: z.number().int().positive(),
  points: z.number().int(),
  reason: z.string().optional(),
});

// ============================================
// Partner Management Schemas
// ============================================

export const RejectPartnerRequestSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

// ============================================
// Type Exports
// ============================================

export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type RoleName = z.infer<typeof RoleNameSchema>;
export type LockerStatus = z.infer<typeof LockerStatusSchema>;
export type BoxStatus = z.infer<typeof BoxStatusSchema>;
export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PartnerStatus = z.infer<typeof PartnerStatusSchema>;
export type PointTransactionType = z.infer<typeof PointTransactionTypeSchema>;
export type StampType = z.infer<typeof StampTypeSchema>;

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateUserStatusRequest = z.infer<typeof UpdateUserStatusRequestSchema>;
export type UpdateUserRolesRequest = z.infer<typeof UpdateUserRolesRequestSchema>;

export type CreateStoreRequest = z.infer<typeof CreateStoreRequestSchema>;
export type UpdateStoreStatusRequest = z.infer<typeof UpdateStoreStatusRequestSchema>;

export type CreateServiceRequest = z.infer<typeof CreateServiceRequestSchema>;
export type UpdateServicePriceRequest = z.infer<typeof UpdateServicePriceRequestSchema>;
export type UpdateServiceStatusRequest = z.infer<typeof UpdateServiceStatusRequestSchema>;

export type CreateLockerRequest = z.infer<typeof CreateLockerRequestSchema>;
export type CreateBoxRequest = z.infer<typeof CreateBoxRequestSchema>;
export type UpdateLockerMaintenanceRequest = z.infer<typeof UpdateLockerMaintenanceRequestSchema>;
export type UpdateBoxStatusRequest = z.infer<typeof UpdateBoxStatusRequestSchema>;

export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusRequestSchema>;
export type UpdatePaymentStatusRequest = z.infer<typeof UpdatePaymentStatusRequestSchema>;

export type AdjustUserPointsRequest = z.infer<typeof AdjustUserPointsRequestSchema>;
export type RejectPartnerRequest = z.infer<typeof RejectPartnerRequestSchema>;
