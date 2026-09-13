import type {
  DiscountType,
  AcquisitionType,
  RewardType,
  PromotionStatus,
  UsageType,
  UsageStatus,
} from "./enums";

// ============================================================
// Promotion Types
// ============================================================

export interface PromotionResponse {
  id: number;
  code: string;
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startDate: string;
  endDate: string;
  totalUsageLimit?: number;
  currentUsageCount: number;
  remainingUses?: number;
  perUserLimit?: number;
  applicableServiceIds?: number[];
  applicableStoreIds?: number[];
  applicableTiers?: string[];
  isActive: boolean;
  priority: number;
  stackable: boolean;
  status: PromotionStatus;
  acquisitionType?: AcquisitionType;
  pointsRequired?: number;
  rewardType?: RewardType;
  remainingQuantity?: number;
  createdAt: string;
  createdBy?: number;
}

export interface PromotionRequest {
  code: string;
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startDate: string;
  endDate: string;
  totalUsageLimit?: number;
  perUserLimit?: number;
  applicableServiceIds?: number[];
  applicableStoreIds?: number[];
  applicableTiers?: string[];
  isActive?: boolean;
  priority?: number;
  stackable?: boolean;
}

export interface PromotionUsageResponse {
  id: number;
  promotionId: number;
  userId: number;
  orderId: number;
  discountApplied: number;
  usedAt: string;
  usageType: UsageType;
  status: UsageStatus;
  pointsSpent?: number;
  rewardCode?: string;
}
