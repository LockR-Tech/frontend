// ============================================
// Admin Feedback & Report Management Types
// ============================================

// ─── Feedback (OrderRating) ───────────────────────────────────────────────────
// NOTE: Admin-wide feedback list endpoint not yet in BE — FeedbackTab shows error gracefully

export interface FeedbackDTO {
  id: number;
  userId: number;
  userName: string;
  email: string;
  rating: number; // 1-5
  comment: string;
  relatedOrderId: number | null;
  orderDescription: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackDetailDTO {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  rating: number;
  comment: string;
  relatedOrderId: number | null;
  serviceType: string | null;
  orderAmount: number | null;
  adminReply: string | null;
  repliedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFeedbackStatusRequest {
  status: string;
}

export interface ReplyFeedbackRequest {
  reply: string;
}

// ─── LockerReport ─────────────────────────────────────────────────────────────
// BE: GET /api/admin/lockers/reports  |  PUT /api/admin/lockers/reports/{id}/resolve

export type LockerReportStatus = "PENDING" | "RESOLVED" | "REJECTED";

export interface ReportDTO {
  id: number;
  lockerId: number;
  lockerName: string;
  userId: number;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  description: string;
  status: LockerReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ResolveReportRequest {
  resolution?: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface FeedbackTrendDTO {
  date: string;
  count: number;
  avgRating: number;
}

export interface FeedbackAnalyticsDTO {
  averageRating: number;
  totalFeedback: number;
  ratingDistribution: Record<string, number>;
  feedbackToday: number;
  feedbackThisWeek: number;
  feedbackThisMonth: number;
  trends: FeedbackTrendDTO[];
  unresolvedCount: number;
}

export interface SatisfactionMetricsDTO {
  overallSatisfactionScore: number;
  npsScore: number;
  positivePercentage: number;
  negativePercentage: number;
  mostCommonComplaint: string;
  topServiceQuality: string;
  departmentScores: Record<string, number>;
}
