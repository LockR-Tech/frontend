// Legacy Order types - OrderStatus enum moved to admin/enums.ts
// Use OrderStatus from '@/types/admin' instead

export type OrderItem = {
  id: string;
  sku?: string;
  name?: string;
  qty: number;
  price?: number;
};

export interface Order {
  id: string;
  customerId?: string;
  customerName?: string;
  // Use OrderStatus type from admin/enums.ts
  status: import('./admin/enums').OrderStatus;
  items?: OrderItem[];
  total?: number;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}

export type OrderSummary = Pick<Order, "id" | "customerName" | "status" | "total" | "createdAt">;

// Import OrderStatus from admin/enums for this helper
import { OrderStatus } from './admin/enums';
export const isTerminalStatus = (s: OrderStatus) =>
  s === OrderStatus.COMPLETED || s === OrderStatus.CANCELED || s === OrderStatus.RETURNED;
