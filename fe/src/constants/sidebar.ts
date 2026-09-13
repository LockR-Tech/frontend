import {
  Home,
  Users,
  Package,
  ListOrdered,
  UserCog,
  Store,
  CreditCard,
  Clock,
  Boxes,
  LayoutDashboard,
  Bell,
  Settings,
  Briefcase,
  Tag,
  Plane,
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
    icon: Briefcase,
    path: "/admin/maintenance",
    label: "admin.sidebar.maintenance",
    permission: "admin_access",
  },
  {
    icon: Plane,
    path: "/admin/drones",
    label: "admin.sidebar.drones",
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
];

// Sidebar Brand Config
export const SIDEBAR_BRAND = {
  logo: "L",
  name: "Laundry Locker",
  tagline: "Admin Portal",
};

// Partner Navigation Items
export const PARTNER_NAV_ITEMS: NavItem[] = [
  {
    icon: LayoutDashboard,
    path: "/partner/dashboard",
    label: "partner.sidebar.dashboard",
    permission: "partner_access",
  },
  {
    icon: Package,
    path: "/partner/orders",
    label: "partner.sidebar.orders",
    permission: "partner_access",
  },
  {
    icon: Boxes,
    path: "/partner/stores",
    label: "partner.sidebar.stores",
    permission: "partner_access",
  },
  // TODO: Uncomment when partner services API is ready
  // {
  //   icon: Briefcase,
  //   path: "/partner/services",
  //   label: "partner.sidebar.services",
  //   permission: "partner_access",
  // },
  // TODO: Uncomment when partner revenue period API is ready (currently shown in dashboard)
  // {
  //   icon: DollarSign,
  //   path: "/partner/revenue",
  //   label: "partner.sidebar.revenue",
  //   permission: "partner_access",
  // },
  {
    icon: Users,
    path: "/partner/staff",
    label: "partner.sidebar.staff",
    permission: "partner_access",
  },
  // TODO: Uncomment when revenue page is ready (data shown on dashboard for now)
  // {
  //   icon: DollarSign,
  //   path: "/partner/revenue",
  //   label: "partner.sidebar.revenue",
  //   permission: "partner_access",
  // },
  {
    icon: Bell,
    path: "/partner/notifications",
    label: "partner.sidebar.notifications",
    permission: "partner_access",
  },
  {
    icon: Settings,
    path: "/partner/settings",
    label: "partner.sidebar.settings",
    permission: "partner_access",
  },
];

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
