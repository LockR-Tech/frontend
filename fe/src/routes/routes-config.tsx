import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProtectedRoute from "./protected-route";
import AuthLayout from "../pages/auth/layout";
import AdminLayout from "../pages/Admin/layout";

// Error Pages (eager loaded for immediate display)
import {
  MaintenancePage,
  NotFoundPage,
  UnauthorizedPage,
} from "../pages/Error";

// Loading fallback component
function PageLoader(): ReactNode {
  const { t } = useTranslation();
  return (
    <div className="min-h-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">{t("common.loading")}</p>
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
const StoresPage = lazy(() => import("../pages/Admin/stores"));
const StoreDetailPage = lazy(() => import("../pages/Admin/stores/detail"));
const ServicesPage = lazy(() => import("../pages/Admin/services"));
const PaymentsPage = lazy(() => import("../pages/Admin/payments"));
const RefundsPage = lazy(() => import("../pages/Admin/refunds"));
const RevenuePage = lazy(() => import("../pages/Admin/revenue"));
const RevenueDetailPage = lazy(() => import("../pages/Admin/revenue/detail"));
const LoyaltyPage = lazy(() => import("../pages/Admin/loyalty"));
const SchedulerPage = lazy(() => import("../pages/Admin/scheduler"));
const LockersAdminPage = lazy(() => import("../pages/Admin/lockers"));
const CabinetControlPage = lazy(() => import("../pages/Admin/cabinet-control"));
const LockerLayoutPage = lazy(() => import("../pages/Admin/lockers/layout-view"));
const OpenBoxByQrPage = lazy(() => import("../pages/Admin/lockers/open-box"));
const MaintenanceAdminPage = lazy(() => import("../pages/Admin/maintenance"));
const TechniciansPage = lazy(() => import("../pages/Admin/technicians"));
const TechnicianDetailPage = lazy(() => import("../pages/Admin/maintenance/technician-detail"));
const NotificationsPage = lazy(() => import("../pages/Admin/notifications"));
const PromotionsPage = lazy(() => import("../pages/Admin/promotions"));
const DronesPage = lazy(() => import("../pages/Admin/drones"));
const DroneDetailPage = lazy(() => import("../pages/Admin/drones/detail"));
const DroneOrdersPage = lazy(() => import("../pages/Admin/drone-orders"));
const DroneOrderDetailPage = lazy(() => import("../pages/Admin/drone-orders/detail"));
const FlightControlPage = lazy(() => import("../pages/Admin/flight-control"));
const DroneIncidentsPage = lazy(() => import("../pages/Admin/drone-incidents"));
const DroneIncidentDetailPage = lazy(() => import("../pages/Admin/drone-incidents/detail"));
const DroneLogsPage = lazy(() => import("../pages/Admin/drone-logs"));
const BusinessSettingsPage = lazy(() => import("../pages/Admin/settings"));
const KnowledgePage = lazy(() => import("../pages/Admin/knowledge"));

// Lazy load Auth Pages
const LoginPage = lazy(() => import("~/pages/auth/Login"));

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

  // Payment aliases
  { path: "payments", element: <Navigate to="/admin/payments" replace /> },
  { path: "payment", element: <Navigate to="/admin/payments" replace /> },
  { path: "thanh-toan", element: <Navigate to="/admin/payments" replace /> },

  // Refund aliases
  { path: "refunds", element: <Navigate to="/admin/refunds" replace /> },
  { path: "refund", element: <Navigate to="/admin/refunds" replace /> },
  { path: "hoan-tien", element: <Navigate to="/admin/refunds" replace /> },

  // Scheduler aliases
  { path: "scheduler", element: <Navigate to="/admin/scheduler" replace /> },
  { path: "schedule", element: <Navigate to="/admin/scheduler" replace /> },
  { path: "lap-lich", element: <Navigate to="/admin/scheduler" replace /> },

  // Feedback aliases
  { path: "feedback", element: <Navigate to="/admin/feedback" replace /> },
  { path: "drone-logs", element: <Navigate to="/admin/drone-logs" replace /> },
  { path: "nhat-ky-drone", element: <Navigate to="/admin/drone-logs" replace /> },
  { path: "phan-hoi", element: <Navigate to="/admin/feedback" replace /> },

  // Business settings aliases
  { path: "cau-hinh", element: <Navigate to="/admin/settings" replace /> },
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
        // Đích của mã QR mở ô để thử tủ (tờ QR ở trang chi tiết tủ).
        path: "lockers/:lockerId/open/:boxId",
        element: (
          <LazyWrapper>
            <OpenBoxByQrPage />
          </LazyWrapper>
        ),
      },
      {
        path: "cabinet-control",
        element: (
          <LazyWrapper>
            <CabinetControlPage />
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
        path: "technicians",
        element: (
          <LazyWrapper>
            <TechniciansPage />
          </LazyWrapper>
        ),
      },
      {
        path: "technicians/:technicianId",
        element: (
          <LazyWrapper>
            <TechnicianDetailPage />
          </LazyWrapper>
        ),
      },
      {
        path: "maintenance/technicians",
        element: <Navigate to="/admin/technicians" replace />,
      },
      {
        path: "maintenance/technicians/:technicianId",
        element: (
          <LazyWrapper>
            <TechnicianDetailPage />
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
        path: "refunds",
        element: (
          <LazyWrapper>
            <RefundsPage />
          </LazyWrapper>
        ),
      },
      {
        path: "revenue",
        element: (
          <LazyWrapper>
            <RevenuePage />
          </LazyWrapper>
        ),
      },
      {
        path: "revenue/:id",
        element: (
          <LazyWrapper>
            <RevenueDetailPage />
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
      {
        path: "drones/:droneId",
        element: (
          <LazyWrapper>
            <DroneDetailPage />
          </LazyWrapper>
        ),
      },
      {
        path: "drone-orders",
        element: (
          <LazyWrapper>
            <DroneOrdersPage />
          </LazyWrapper>
        ),
      },
      {
        path: "flight-control",
        element: (
          <LazyWrapper>
            <FlightControlPage />
          </LazyWrapper>
        ),
      },
      {
        path: "drone-orders/:orderId",
        element: (
          <LazyWrapper>
            <DroneOrderDetailPage />
          </LazyWrapper>
        ),
      },
      {
        path: "drone-incidents",
        element: (
          <LazyWrapper>
            <DroneIncidentsPage />
          </LazyWrapper>
        ),
      },
      {
        path: "drone-incidents/:id",
        element: (
          <LazyWrapper>
            <DroneIncidentDetailPage />
          </LazyWrapper>
        ),
      },
      {
        path: "drone-logs",
        element: (
          <LazyWrapper>
            <DroneLogsPage />
          </LazyWrapper>
        ),
      },
      {
        path: "settings",
        element: (
          <LazyWrapper>
            <BusinessSettingsPage />
          </LazyWrapper>
        ),
      },
      { path: "business-settings", element: <Navigate to="/admin/settings" replace /> },
      {
        path: "knowledge",
        element: (
          <LazyWrapper>
            <KnowledgePage />
          </LazyWrapper>
        ),
      },
      // Admin catch-all
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
