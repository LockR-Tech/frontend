// ============================================
// Admin Store Management Types
// ============================================

export interface AdminStoreResponse {
  id: number;
  name: string;
  address: string;
  phone: string;
  imageUrl: string;
  /** store-service cũ trả ảnh ở trường `image` — đọc `imageUrl ?? image`. */
  image?: string | null;
  latitude: number;
  longitude: number;
  description: string;
  openTime: string;
  closeTime: string;
  active: boolean;
  lockerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreRequest {
  name: string;
  address?: string;
  phone?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  openTime?: string;
  closeTime?: string;
}
