import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./protected-route";
import AuthLayout from "../pages/auth/layout";
import AdminLayout from "../pages/Admin/layout";

// Partner Layout (eager loaded as it's small)
import PartnerLayout from "../pages/Partner/layout";

// Error Pages (eager loaded for immediate display)
import {
  MaintenancePage,
  NotFoundPage,
  UnauthorizedPage,
} from "../pages/Error";

// Loading fallback component
function PageLoader(): ReactNode {
  return (
    <div className="min-h-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    </div>
  );
}

// Lazy load Admin Pages
const DashboardPage = lazy(() => import("../pages/Admin/dashboard/dash-board"));
const UsersPage = lazy(() => import("../pages/Admin/users"));
const UserDetailPage = lazy(() => import("../pages/Admin/users/detail"));
const OrdersPage = lazy(() => import("../pages/Admin/orders"));
const OrderDetailPage = lazy(() => import("../pages/Admin/orders/detail"));
const FeedbackPage = lazy(() => import("../pages/Admin/feedback"));
const FeedbackDetailPage = lazy(() => import("../pages/Admin/feedback/detail"));
const PartnersPage = lazy(() => import("../pages/Admin/partners"));
const StoresPage = lazy(() => import("../pages/Admin/stores"));
const StoreDetailPage = lazy(() => import("../pages/Admin/stores/detail"));
const ServicesPage = lazy(() => import("../pages/Admin/services"));
const PaymentsPage = lazy(() => import("../pages/Admin/payments"));
const LoyaltyPage = lazy(() => import("../pages/Admin/loyalty"));
const SchedulerPage = lazy(() => import("../pages/Admin/scheduler"));
const LockersAdminPage = lazy(() => import("../pages/Admin/lockers"));
const LockerLayoutPage = lazy(() => import("../pages/Admin/lockers/layout-view"));
const MaintenanceAdminPage = lazy(() => import("../pages/Admin/maintenance"));
const NotificationsPage = lazy(() => import("../pages/Admin/notifications"));
const PromotionsPage = lazy(() => import("../pages/Admin/promotions"));
const DronesPage = lazy(() => import("../pages/Admin/drones"));

// Lazy load Auth Pages
const LoginPage = lazy(() => import("~/pages/auth/Login"));

// Lazy load Partner Pages
const PartnerDashboard = lazy(() => import("../pages/Partner/dashboard"));
const PartnerOrders = lazy(() => import("../pages/Partner/orders"));
const PartnerOrderDetail = lazy(() => import("../pages/Partner/orders/detail"));
const PartnerStaff = lazy(() => import("../pages/Partner/staff"));
const PartnerRevenue = lazy(() => import("../pages/Partner/revenue"));
const PartnerStores = lazy(() => import("../pages/Partner/stores"));
const PartnerStoreDetail = lazy(() => import("../pages/Partner/stores/[id]"));
const PartnerServices = lazy(() => import("../pages/Partner/services"));
const PartnerNotifications = lazy(
  () => import("../pages/Partner/notifications"),
);
const PartnerSettings = lazy(() => import("../pages/Partner/settings"));

// Wrapper for lazy components
function LazyWrapper({ children }: { children: ReactNode }): ReactNode {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ============================================
// ROUTE ALIASES - Tự động redirect
// ============================================

const routeAliases: RouteObject[] = [
  // Auth aliases
  { path: "login", element: <Navigate to="/auth/login" replace /> },
  { path: "signin", element: <Navigate to="/auth/login" replace /> },
  { path: "dang-nhap", element: <Navigate to="/auth/login" replace /> },
  { path: "signup", element: <Navigate to="/auth/register" replace /> },
  { path: "register", element: <Navigate to="/auth/register" replace /> },
  { path: "dang-ky", element: <Navigate to="/auth/register" replace /> },

  // Admin aliases - Shortcuts
  { path: "dashboard", element: <Navigate to="/admin/dashboard" replace /> },
  { path: "admin", element: <Navigate to="/admin/dashboard" replace /> },

  // User aliases
  { path: "users", element: <Navigate to="/admin/users" replace /> },
  { path: "user", element: <Navigate to="/admin/users" replace /> },
  { path: "khach-hang", element: <Navigate to="/admin/users" replace /> },

  // Order aliases
  { path: "orders", element: <Navigate to="/admin/orders" replace /> },
  { path: "order", element: <Navigate to="/admin/orders" replace /> },
  { path: "don-hang", element: <Navigate to="/admin/orders" replace /> },

  // Store aliases
  { path: "stores", element: <Navigate to="/admin/stores" replace /> },
  { path: "store", element: <Navigate to="/admin/stores" replace /> },
  { path: "cua-hang", element: <Navigate to="/admin/stores" replace /> },

  // Service aliases
  { path: "services", element: <Navigate to="/admin/services" replace /> },
  { path: "service", element: <Navigate to="/admin/services" replace /> },
  { path: "dich-vu", element: <Navigate to="/admin/services" replace /> },

  // Partner aliases
  { path: "partners", element: <Navigate to="/admin/partners" replace /> },
  { path: "partner-admin", element: <Navigate to="/admin/partners" replace /> },
  { path: "doi-tac", element: <Navigate to="/admin/partners" replace /> },

  // Payment aliases
  { path: "payments", element: <Navigate to="/admin/payments" replace /> },
  { path: "payment", element: <Navigate to="/admin/payments" replace /> },
  { path: "thanh-toan", element: <Navigate to="/admin/payments" replace /> },

  // Scheduler aliases
  { path: "scheduler", element: <Navigate to="/admin/scheduler" replace /> },
  { path: "schedule", element: <Navigate to="/admin/scheduler" replace /> },
  { path: "lap-lich", element: <Navigate to="/admin/scheduler" replace /> },

  // Feedback aliases
  { path: "feedback", element: <Navigate to="/admin/feedback" replace /> },
  { path: "phan-hoi", element: <Navigate to="/admin/feedback" replace /> },

  // Partner portal aliases
  { path: "partner", element: <Navigate to="/partner/dashboard" replace /> },
];

const routesConfig: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/admin/dashboard" replace />,
  },

  // Route Aliases (Shortcuts)
  ...routeAliases,

  // Auth Routes
  {
    path: "auth",
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: (
          <LazyWrapper>
            <LoginPage />
          </LazyWrapper>
        ),
      },
      { path: "register", element: <div>Register Page</div> },
    ],
  },

  // Admin Routes
  {
    path: "admin",
    element: (
      <ProtectedRoute requiredPermission="admin_access">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: (
          <LazyWrapper>
            <DashboardPage />
          </LazyWrapper>
        ),
      },
      {
        path: "users",
        element: (
          <LazyWrapper>
            <UsersPage />
          </LazyWrapper>
        ),
      },
      {
        path: "users/:userId",
        element: (
          <LazyWrapper>
            <UserDetailPage />
          </LazyWrapper>
        ),
      },
      {
        path: "stores",
        element: (
          <LazyWrapper>
            <StoresPage />
          </LazyWrapper>
        ),
      },
      {
        path: "stores/:storeId",
        element: (
          <LazyWrapper>
            <StoreDetailPage />
          </LazyWrapper>
        ),
      },
      {
        path: "services",
        element: (
          <LazyWrapper>
            <ServicesPage />
          </LazyWrapper>
        ),
      },
      {
        path: "lockers",
        element: (
          <LazyWrapper>
            <LockersAdminPage />
          </LazyWrapper>
        ),
      },
      {
        path: "lockers/:lockerId",
        element: (
          <LazyWrapper>
            <LockerLayoutPage />
          </LazyWrapper>
        ),
      },
      {
        path: "maintenance",
        element: (
          <LazyWrapper>
            <MaintenanceAdminPage />
          </LazyWrapper>
        ),
      },
      {
        path: "orders",
        element: (
          <LazyWrapper>
            <OrdersPage />
          </LazyWrapper>
        ),
      },
      {
        path: "orders/:orderId",
        element: (
          <LazyWrapper>
            <OrderDetailPage />
          </LazyWrapper>
        ),
      },
      {
        path: "payments",
        element: (
          <LazyWrapper>
            <PaymentsPage />
          </LazyWrapper>
        ),
      },
      {
        path: "loyalty",
        element: (
          <LazyWrapper>
            <LoyaltyPage />
          </LazyWrapper>
        ),
      },
      {
        path: "partners",
        element: (
          <LazyWrapper>
            <PartnersPage />
          </LazyWrapper>
        ),
      },
      {
        path: "feedback",
        element: (
          <LazyWrapper>
            <FeedbackPage />
          </LazyWrapper>
        ),
      },
      {
        path: "feedback/:feedbackId",
        element: (
          <LazyWrapper>
            <FeedbackDetailPage />
          </LazyWrapper>
        ),
      },
      {
        path: "scheduler",
        element: (
          <LazyWrapper>
            <SchedulerPage />
          </LazyWrapper>
        ),
      },
      {
        path: "notifications",
        element: (
          <LazyWrapper>
            <NotificationsPage />
          </LazyWrapper>
        ),
      },
      {
        path: "promotions",
        element: (
          <LazyWrapper>
            <PromotionsPage />
          </LazyWrapper>
        ),
      },
      {
        path: "drones",
        element: (
          <LazyWrapper>
            <DronesPage />
          </LazyWrapper>
        ),
      },
      // Admin catch-all
      { path: "*", element: <NotFoundPage /> },
    ],
  },

  // Partner Routes
  {
    path: "partner",
    element: (
      <ProtectedRoute requiredPermission="partner_access">
        <PartnerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: (
          <LazyWrapper>
            <PartnerDashboard />
          </LazyWrapper>
        ),
      },
      {
        path: "orders",
        element: (
          <LazyWrapper>
            <PartnerOrders />
          </LazyWrapper>
        ),
      },
      {
        path: "orders/:orderId",
        element: (
          <LazyWrapper>
            <PartnerOrderDetail />
          </LazyWrapper>
        ),
      },
      {
        path: "staff",
        element: (
          <LazyWrapper>
            <PartnerStaff />
          </LazyWrapper>
        ),
      },
      {
        path: "revenue",
        element: (
          <LazyWrapper>
            <PartnerRevenue />
          </LazyWrapper>
        ),
      },
      {
        path: "stores",
        element: (
          <LazyWrapper>
            <PartnerStores />
          </LazyWrapper>
        ),
      },
      {
        path: "stores/:storeId",
        element: (
          <LazyWrapper>
            <PartnerStoreDetail />
          </LazyWrapper>
        ),
      },
      // Backward compatibility redirect
      {
        path: "lockers",
        element: <Navigate to="/partner/stores" replace />,
      },
      {
        path: "services",
        element: (
          <LazyWrapper>
            <PartnerServices />
          </LazyWrapper>
        ),
      },
      {
        path: "notifications",
        element: (
          <LazyWrapper>
            <PartnerNotifications />
          </LazyWrapper>
        ),
      },
      {
        path: "settings",
        element: (
          <LazyWrapper>
            <PartnerSettings />
          </LazyWrapper>
        ),
      },
      { path: "profile", element: <Navigate to="../settings" replace /> },
      // Partner catch-all
      { path: "*", element: <NotFoundPage /> },
    ],
  },

  // Error pages
  { path: "401", element: <UnauthorizedPage /> },
  { path: "403", element: <UnauthorizedPage /> },
  { path: "404", element: <NotFoundPage /> },
  { path: "503", element: <MaintenancePage /> },
  { path: "maintenance", element: <MaintenancePage /> },

  // Catch-all 404
  { path: "*", element: <NotFoundPage /> },
];

export default routesConfig;
