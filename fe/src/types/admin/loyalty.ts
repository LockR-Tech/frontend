// ============================================
// Admin Loyalty Types — khớp loyalty-service (LoyaltyController)
// ============================================

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

// ─── GET /api/admin/loyalty/users/{userId} — LoyaltyAccountResponse ─────────
// Chưa có tài khoản thì backend trả bản trống (id null, điểm 0).
export interface LoyaltyAccountDTO {
  id: number | null;
  userId: number;
  /** Số dư điểm hiện tại (dùng được). */
  points: number | null;
  /**
   * Tổng điểm đã tích từ trước tới nay — căn cứ xét hạng, không giảm khi dùng điểm.
   * Backend cũ chưa có.
   */
  lifetimePoints?: number | null;
  stamps: number | null;
  tier: LoyaltyTier | string | null;
}

// ─── POST /api/admin/loyalty/users/{userId}/points — AdjustPointsRequest ─────
// `points` có dấu: dương = cộng, âm = trừ. `type` là chuỗi tự do (tối đa 30 ký tự),
// bỏ trống thì backend ghi "ADJUSTMENT".
export interface AdjustPointsRequest {
  userId: number;
  points: number;
  type?: string;
  orderId?: number;
}

// ─── GET /api/admin/loyalty/users/{userId}/history — PointTransactionResponse ─
export interface PointTransactionDTO {
  id: number;
  userId: number;
  orderId: number | null;
  /** Có dấu: dương = cộng, âm = trừ. */
  points: number;
  /**
   * ORDER_EARN (tích từ đơn hoàn tất), ORDER_REDEEM (dùng cho đơn, âm),
   * ORDER_REDEEM_REFUND (trả lại khi đơn huỷ/hoàn tiền), ORDER_EARN_REVERSAL (thu hồi điểm đã tích khi
   * đơn được hoàn tiền, âm), ADJUSTMENT (admin), REDEEM (cũ).
   */
  type: string;
  createdAt: string;
}

// ─── GET /api/admin/loyalty/statistics ───────────────────────────────────────
// Mọi trường là số; để optional vì backend cũ chỉ trả {accounts, transactions}.
export interface LoyaltyStatisticsDTO {
  accounts?: number;
  transactions?: number;
  totalMembers?: number;
  newMembersThisMonth?: number;
  activeMembersLast30Days?: number;
  tierDistribution?: Record<string, number>;
  totalPointsOutstanding?: number;
  averagePoints?: number;
  medianPoints?: number;
  pointsIssued?: number;
  pointsRedeemed?: number;
  pointsIssuedThisMonth?: number;
  pointsRedeemedThisMonth?: number;
}
