import type { OrderType, OrderStatus } from './enums';

// ============================================
// Admin Order Management Types
// ============================================

export interface OrderDetailResponse {
  id: number;
  serviceId: number;
  serviceName: string;
  serviceImage: string;
  quantity: number;
  unit: string;
  price: number;
  description: string;
}

export interface OrderResponse {
  id: number;
  type: OrderType;
  status: OrderStatus;
  pinCode: string;
  senderId: number;
  senderName: string;
  senderPhone: string;
  receiverId: number;
  receiverName: string;
  lockerId: number;
  lockerName: string;
  lockerCode: string;
  sendBoxNumber: number;
  receiveBoxNumber: number;
  sendBoxNumbers: number[];
  receiveBoxNumbers: number[];
  staffId: number;
  staffName: string;
  actualWeight: number;
  weightUnit: string;
  extraFee: number;
  discount: number;
  reservationFee: number;
  storagePrice: number;
  shippingFee: number;
  totalPrice: number;
  description: string;
  customerNote: string;
  staffNote: string;
  deliveryAddress: string;
  intendedReceiveAt: string;
  receiveAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  orderDetails: OrderDetailResponse[];
}

export interface OrderStatisticsResponse {
  totalOrders: number;
  completedOrders: number;
  canceledOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
}

export interface DailyRevenueEntry {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface RevenueReportResponse {
  totalRevenue: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  revenueByPaymentMethod: { [key: string]: number };
  dailyRevenue: DailyRevenueEntry[];
}
