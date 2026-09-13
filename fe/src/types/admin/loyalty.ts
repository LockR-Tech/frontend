// ============================================
// Admin Loyalty Types — based on real backend API
// ============================================

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
export type AdjustmentType = "ADD" | "DEDUCT";
export type TransactionType =
  | "EARNED"
  | "REDEEMED"
  | "ADD"
  | "DEDUCT"
  | "REFUND"
  | "EXPIRED";

// ─── GET /api/admin/loyalty/users/{userId} ───────────────────────────────────
export interface LoyaltyUserSummaryDTO {
  userId: number;
  userName: string;
  email: string;
  phoneNumber: string;

  currentPoints: number;
  currentTier: LoyaltyTier;
  pointsToNextTier: number | null;
  tierDiscountPercentage: number;

  totalOrders: number;
  totalSpent: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  rewardsRedeemed: number;

  enrolledAt: string;
  lastActivityAt: string | null;
  lastRedeemedAt: string | null;
  membershipDays: number;
}

// ─── POST /api/admin/loyalty/users/{userId}/adjust-points ────────────────────
export interface AdjustPointsRequest {
  pointsAmount: number;
  adjustmentType: AdjustmentType;
  reason: string;
  adminNotes?: string;
}

export interface AdjustPointsResponseDTO {
  transactionId: string;
  userId: number;
  userName: string;
  email: string;

  pointsAmount: number;
  adjustmentType: AdjustmentType;
  reason: string;
  adminNotes: string | null;
  adjustedBy: string;

  pointsBeforeAdjustment: number;
  pointsAfterAdjustment: number;
  balanceChange: string;

  tierBeforeAdjustment: LoyaltyTier;
  tierAfterAdjustment: LoyaltyTier;

  transactionDate: string;
}

// ─── GET /api/admin/loyalty/users/{userId}/history ───────────────────────────
export interface OrderRelatedDTO {
  orderId: number;
  orderAmount: number;
}

export interface RewardRelatedDTO {
  rewardId: number;
  rewardName: string;
  redemptionDate: string;
}

export interface PointsHistoryItemDTO {
  transactionId: string;
  userId: number;
  userName: string;
  pointsAmount: number;
  transactionType: TransactionType;
  reason: string;
  orderRelated: OrderRelatedDTO | null;
  rewardRelated: RewardRelatedDTO | null;
  balanceBefore: number;
  balanceAfter: number;
  processedBy: string;
  transactionDate: string;
}

// ─── GET /api/admin/loyalty/statistics ───────────────────────────────────────
export interface TierStatsDTO {
  count: number;
  percentage: number;
  averagePoints: number;
}

export interface PopularRewardDTO {
  rewardId: number;
  name: string;
  timesRedeemed: number;
}

export interface LoyaltyStatisticsDTO {
  overview: {
    totalCustomersEnrolled: number;
    activeCustomersLast30Days: number;
    inactiveCustomers: number;
  };
  pointsMetrics: {
    totalPointsDistributed: number;
    totalPointsRedeemed: number;
    totalPointsOutstanding: number;
    averagePointsPerCustomer: number;
    medianPointsPerCustomer: number;
  };
  tierDistribution: Record<LoyaltyTier, TierStatsDTO>;
  rewardsMetrics: {
    totalRewardsCatalog: number;
    rewardsRedeemed: number;
    totalRewardsCost: number;
    mostPopularReward: PopularRewardDTO | null;
    leastPopularReward: PopularRewardDTO | null;
  };
  engagementMetrics: {
    programEngagementRate: number;
    redemptionRate: number;
    tierUpgradeCount: number;
    tierDowngradeCount: number;
  };
  timeSeriesData: {
    pointsEarnedThisMonth: number;
    pointsRedeemedThisMonth: number;
    newEnrollmentsThisMonth: number;
    averageTransactionsPerDay: number;
  };
  financialImpact: {
    estimatedRewardCost: number;
    estimatedDiscountValue: number;
    roi: number;
  };
  lastUpdated: string;
}
