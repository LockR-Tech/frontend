// ============================================
// Admin Feedback & Report Management Types
// ============================================

import type { ReportAttachmentRequest } from "~/stores/apis/media";

// ─── Feedback (OrderRating) ───────────────────────────────────────────────────
// BE: order-service AdminFeedbackController — /api/admin/feedback/**, /api/admin/analytics/*.
// Tên khách/email là null khi user-service lỗi.

/** PageResponse của common-lib (khác Page của Spring Data). */
export interface AdminPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FeedbackDTO {
  id: number;
  userId: number;
  userName: string | null;
  email: string | null;
  rating: number; // 1-5
  comment: string | null;
  relatedOrderId: number | null;
  orderCode: string | null;
  orderDescription: string | null;
  isResolved: boolean;
  /** Admin đã trả lời khách. */
  replied: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface FeedbackDetailDTO {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  rating: number;
  comment: string | null;
  relatedOrderId: number | null;
  orderCode: string | null;
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
// BE: GET /api/admin/lockers/reports (trả cả danh sách, không phân trang, không lọc)
//     PUT /api/admin/lockers/reports/{id}/resolve
// Trường khớp LockerReportResponse của locker-service.

export type LockerReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface ReportDTO {
  id: number;
  lockerId: number;
  lockerName: string | null;
  boxNumber: number | null;
  userId: number;
  reporterName: string | null;
  reporterPhone: string | null;
  title: string | null;
  description: string;
  status: LockerReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ResolveReportRequest {
  /** @deprecated backend nhận `note`; giữ để tương thích code cũ. */
  resolution?: string;
  note?: string;
  /** Ảnh nghiệm thu (stage RESOLUTION) — xem docs/01-overview/media-storage.md §4.2. */
  attachments?: ReportAttachmentRequest[];
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
