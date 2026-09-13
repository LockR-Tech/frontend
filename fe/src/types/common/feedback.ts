// ============================================
// Feedback Types
// ============================================

export interface FeedbackItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userAvatar: string;
  type: 'BUG' | 'FEATURE' | 'IMPROVEMENT' | 'COMPLAINT' | 'PRAISE';
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject: string;
  message: string;
  rating?: number; // 1-5 stars
  orderNumber?: string;
  storeId?: number;
  storeName?: string;
  createdAt: string;
  updatedAt: string;
  responseMessage?: string;
  respondedBy?: string;
  respondedAt?: string;
}
