// ============================================
// Admin Service Management Types
// ============================================

export interface AdminServiceResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  unit: string;
  imageUrl: string;
  estimatedMinutes: number;
  storeId: number;
  storeName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  price: number;
  unit?: string;
  imageUrl?: string;
  estimatedMinutes?: number;
  storeId?: number;
}

export interface UpdateServicePriceRequest {
  price: number;
}
