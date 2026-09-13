import type {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "./enums";

// ============================================================
// Admin Notification Types
// ============================================================

export interface AdminNotificationResponse {
  id: number;
  type: NotificationType;
  status: NotificationStatus;
  channel?: NotificationChannel;
  /** Raw recipient id from the backend (notification-service returns `userId`). */
  userId?: number;
  recipientId?: number;
  recipientName?: string;
  recipientEmail?: string;
  title: string;
  message: string;
  referenceId?: number;
  referenceType?: string;
  metadata?: Record<string, unknown>;
  readAt?: string;
  sentAt?: string;
  createdAt: string;
  relatedOrderId?: number;
}

export interface CreateNotificationRequest {
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: number;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  relatedOrderId?: number;
}

export interface BroadcastNotificationRequest {
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  targetAllUsers?: boolean;
  recipientIds?: number[];
  metadata?: Record<string, unknown>;
  scheduledFor?: string;
}

export interface UpdateNotificationStatusRequest {
  status: NotificationStatus;
}

export interface NotificationStatsResponse {
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  archivedCount: number;
  notificationsByType: Record<string, number>;
  notificationsByChannel: Record<string, number>;
  deliveryRate: number;
  averageReadTime: number;
}

export interface BroadcastResult {
  totalNotificationsSent: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  channels: NotificationChannel[];
  scheduledFor?: string;
}

export interface NotificationTemplateResponse {
  id: number;
  name: string;
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  channel: NotificationChannel;
  active: boolean;
}
