import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { JSX } from "react/jsx-dev-runtime";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/auth-context";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("shared.route.checkingAccess")}</p>
        </div>
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
