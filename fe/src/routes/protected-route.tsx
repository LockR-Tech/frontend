import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { JSX } from "react/jsx-dev-runtime";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/auth-context";
import { AppLoading } from "~/components/ui/app-loading";

interface ProtectedRouteProps {
  requiredPermission?: string; 
  children?: JSX.Element;      
}

const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <AppLoading size={140} message={t("shared.route.checkingAccess")} />
      </div>
    );
  }

  // Redirect to login if not authenticated — giữ trang đang mở để đăng nhập xong quay lại
  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/403" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
