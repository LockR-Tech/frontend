import type { LucideIcon } from "lucide-react";

// ============================================
// Sidebar Types
// ============================================

export interface NavItem {
  icon: LucideIcon;
  path: string;
  label: string;
  permission?: string; // Optional permission required to access
}
