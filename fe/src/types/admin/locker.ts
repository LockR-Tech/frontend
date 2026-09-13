import type { BoxStatus, LockerStatus } from './enums';

// ============================================
// Admin Locker & Box Management Types
// ============================================

export interface BoxInfo {
  id: number;
  boxNumber: number;
  status: BoxStatus;
  description: string;
}

export interface AdminLockerResponse {
  id: number;
  code: string;
  name: string;
  address: string;
  storeId: number;
  storeName: string;
  status: LockerStatus;
  totalBoxes: number;
  availableBoxes: number;
  boxes: BoxInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLockerRequest {
  code: string;
  name: string;
  address?: string;
  storeId: number;
}

export interface CreateBoxRequest {
  boxNumber: number;
  description?: string;
}

export interface UpdateLockerMaintenanceRequest {
  maintenance: boolean;
}

export interface UpdateBoxStatusRequest {
  status: string;
}
