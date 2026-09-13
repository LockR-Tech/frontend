import type { PaymentMethod, PaymentStatus } from './enums';

// ============================================
// Admin Payment Management Types
// ============================================

export interface PaymentResponse {
  id: number;
  orderId: number;
  userId?: number;
  customerId: number;
  customerName?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  content: string;
  referenceId: string;
  referenceTransactionId: string;
  qr: string;
  url: string;
  deeplink: string;
  description: string;
  createdAt: string;
}
