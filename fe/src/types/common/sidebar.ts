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

/// Nhóm mục thu/mở được trên sidebar (vd. "Drone" gồm drone, hành trình, sự cố…).
export interface NavGroup {
  id: string;
  icon: LucideIcon;
  label: string;
  items: NavItem[];
}
