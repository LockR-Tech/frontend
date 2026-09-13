import type { PartnerStatus } from './enums';

// ============================================
// Admin Partner Management Types
// ============================================

export interface PartnerResponse {
  id: number;
  userId: number;
  userName: string;
  businessName: string;
  businessRegistrationNumber: string;
  taxId: string;
  businessAddress: string;
  contactPhone: string;
  contactEmail: string;
  status: PartnerStatus;
  approvedAt: string | null;
  approvedBy: number | null;
  rejectionReason: string | null;
  revenueSharePercent: number;
  storeCount: number;
  staffCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerStatisticsResponse {
  totalPartners: number;
  pendingPartners: number;
  approvedPartners: number;
  rejectedPartners: number;
  suspendedPartners: number;
}
