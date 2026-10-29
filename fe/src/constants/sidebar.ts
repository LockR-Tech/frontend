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
  CloudSun,
  TrendingUp,
  Wrench,
  SlidersHorizontal,
  BookOpen,
  Gift,
  Sparkles,
  RotateCcw,
  UserCheck,
  Users,
  Wallet,
  Settings,
} from "lucide-react";
import type { NavGroup, NavItem } from "@/types";

// Sidebar Navigation - Labels are i18n keys
// Mục dùng hằng ngày nằm trên cùng; còn lại chia nhóm thu/mở được.
export const ADMIN_NAV_TOP: NavItem[] = [
  {
    icon: Home,
    path: "/admin/dashboard",
    label: "admin.sidebar.dashboard",
  },
  {
    icon: Package,
    path: "/admin/orders",
    label: "admin.sidebar.orders",
    permission: "view_orders",
  },
  {
    icon: Bell,
    path: "/admin/notifications",
    label: "admin.sidebar.notifications",
    permission: "admin_access",
  },
];

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "operations",
    icon: Boxes,
    label: "admin.sidebar.groups.operations",
    items: [
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
        icon: Store,
        path: "/admin/stores",
        label: "admin.sidebar.stores",
        permission: "manage_stores",
      },
      {
        icon: Sparkles,
        path: "/admin/services",
        label: "admin.sidebar.services",
        permission: "manage_services",
      },
    ],
  },
  {
    id: "drone",
    icon: Plane,
    label: "admin.sidebar.groups.drone",
    items: [
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
        icon: CloudSun,
        path: "/admin/flight-control",
        label: "admin.sidebar.flightControl",
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
    ],
  },
  {
    id: "finance",
    icon: Wallet,
    label: "admin.sidebar.groups.finance",
    items: [
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
    ],
  },
  {
    id: "customers",
    icon: Users,
    label: "admin.sidebar.groups.customers",
    items: [
      {
        icon: UserCog,
        path: "/admin/users",
        label: "admin.sidebar.users",
        permission: "manage_users",
      },
      {
        icon: Gift,
        path: "/admin/loyalty",
        label: "admin.sidebar.loyaltyProgram",
        permission: "manage_loyalty",
      },
      {
        icon: Tag,
        path: "/admin/promotions",
        label: "admin.sidebar.promotions",
        permission: "admin_access",
      },
      {
        icon: ListOrdered,
        path: "/admin/feedback",
        label: "admin.sidebar.feedback",
        permission: "manage_feedback",
      },
    ],
  },
  {
    id: "system",
    icon: Settings,
    label: "admin.sidebar.groups.system",
    items: [
      {
        icon: SlidersHorizontal,
        path: "/admin/settings",
        label: "admin.sidebar.businessSettings",
        permission: "admin_access",
      },
      {
        icon: Clock,
        path: "/admin/scheduler",
        label: "admin.sidebar.scheduler",
        permission: "admin_access",
      },
      {
        icon: BookOpen,
        path: "/admin/knowledge",
        label: "admin.sidebar.knowledge",
        permission: "admin_access",
      },
    ],
  },
];

// Danh sách phẳng mọi trang (ô tìm kiếm nhanh ở Header).
export const ADMIN_NAV_ITEMS: NavItem[] = [
  ...ADMIN_NAV_TOP,
  ...ADMIN_NAV_GROUPS.flatMap((group) => group.items),
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
