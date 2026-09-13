// ============================================
// User-facing Loyalty Types
// Based on: GET /api/loyalty/profile, /rewards, /redeem, /transactions
// ============================================

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
export type LoyaltyTransactionType =
  | "EARN"
  | "REDEEM"
  | "ADJUST"
  | "EXPIRE"
  | "BONUS";
export type DiscountType = "PERCENTAGE" | "FIXED";

export interface LoyaltyProfileResponse {
  userId: number;
  tier: LoyaltyTier;
  currentPoints: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  nextTierPoints: number | null;
  nextTier: LoyaltyTier | null;
  progressToNextTier: number; // 0-100
}

export interface LoyaltyRewardResponse {
  id: number;
  name: string;
  description: string;
  pointsRequired: number;
  discountAmount: number;
  discountType: DiscountType;
  expiresAt: string | null;
  isAvailable: boolean;
  imageUrl?: string;
}

export interface RedeemPointsRequest {
  rewardId: number;
  pointsToSpend: number;
}

export interface RedeemPointsResponse {
  success: boolean;
  message: string;
  pointsSpent: number;
  remainingPoints: number;
  rewardCode?: string;
}

export interface LoyaltyTransactionResponse {
  id: number;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  description: string;
  orderId?: number | null;
  createdAt: string;
}
