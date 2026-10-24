import {
  Home,
  Package,
  ListOrdered,
  UserCog,
  Store,
  CreditCard,
  Clock,
  Boxes,
  Bell,
  Tag,
  Plane,
  Activity,
  Route,
  PackageSearch,
  TrendingUp,
  Wrench,
  SlidersHorizontal,
  BookOpen,
  Gift,
  Sparkles,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import type { NavItem } from "@/types";

// Sidebar Navigation Items - Labels are i18n keys
export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    icon: Home,
    path: "/admin/dashboard",
    label: "admin.sidebar.dashboard",
  },
  {
    icon: UserCog,
    path: "/admin/users",
    label: "admin.sidebar.users",
    permission: "manage_users",
  },
  {
    icon: Store,
    path: "/admin/stores",
    label: "admin.sidebar.stores",
    permission: "manage_stores",
  },
  {
    icon: Boxes,
    path: "/admin/lockers",
    label: "admin.sidebar.lockers",
    permission: "admin_access",
  },
  {
    icon: SlidersHorizontal,
    path: "/admin/cabinet-control",
    label: "admin.sidebar.cabinetControl",
    permission: "control_cabinet",
  },
  {
    icon: Sparkles,
    path: "/admin/services",
    label: "admin.sidebar.services",
    permission: "manage_services",
  },
  {
    icon: Wrench,
    path: "/admin/maintenance",
    label: "admin.sidebar.maintenance",
    permission: "admin_access",
  },
  {
    icon: UserCheck,
    path: "/admin/technicians",
    label: "admin.sidebar.technicians",
    permission: "admin_access",
  },
  {
    icon: Plane,
    path: "/admin/drones",
    label: "admin.sidebar.drones",
    permission: "admin_access",
  },
  {
    icon: Route,
    path: "/admin/drone-orders",
    label: "admin.sidebar.droneOrders",
    permission: "admin_access",
  },
  {
    icon: PackageSearch,
    path: "/admin/drone-incidents",
    label: "admin.sidebar.droneIncidents",
    permission: "admin_access",
  },
{
    icon: Activity,
    path: "/admin/drone-logs",
    label: "admin.sidebar.droneLogs",
    permission: "admin_access",
  },
  {
    icon: Package,
    path: "/admin/orders",
    label: "admin.sidebar.orders",
    permission: "view_orders",
  },
  {
    icon: CreditCard,
    path: "/admin/payments",
    label: "admin.sidebar.payments",
    permission: "view_payments",
  },
  {
    icon: RotateCcw,
    path: "/admin/refunds",
    label: "admin.sidebar.refunds",
    permission: "view_payments",
  },
  {
    icon: TrendingUp,
    path: "/admin/revenue",
    label: "admin.sidebar.revenue",
    permission: "view_payments",
  },
  {
    icon: Gift,
    path: "/admin/loyalty",
    label: "admin.sidebar.loyaltyProgram",
    permission: "manage_loyalty",
  },
  {
    icon: ListOrdered,
    path: "/admin/feedback",
    label: "admin.sidebar.feedback",
    permission: "manage_feedback",
  },
  {
    icon: Clock,
    path: "/admin/scheduler",
    label: "admin.sidebar.scheduler",
    permission: "admin_access",
  },
  {
    icon: Bell,
    path: "/admin/notifications",
    label: "admin.sidebar.notifications",
    permission: "admin_access",
  },
  {
    icon: Tag,
    path: "/admin/promotions",
    label: "admin.sidebar.promotions",
    permission: "admin_access",
  },
  {
    icon: BookOpen,
    path: "/admin/knowledge",
    label: "admin.sidebar.knowledge",
    permission: "admin_access",
  },
  {
    icon: SlidersHorizontal,
    path: "/admin/settings",
    label: "admin.sidebar.businessSettings",
    permission: "admin_access",
  },
];

// Sidebar Brand Config
export const SIDEBAR_BRAND = {
  logo: "K",
  name: "Smart Kiosk",
  tagline: "Admin Portal",
};

// Sidebar Styling Config
export const SIDEBAR_CONFIG = {
  width: "w-20", // Collapsed width
  expandedWidth: "w-64", // Expanded width (for future hover feature)
  bgColor: "bg-blue-950 opacity-90",
  hoverBgColor: "hover:bg-orange-600",
  activeBgColor: "bg-orange-600",
  textColor: "text-white",
  inactiveTextColor: "text-gray-400",
};
