import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Path mapping (khoá i18n) - no "admin" or "Trang chủ"
const pathMap: Record<string, string> = {
  dashboard: "admin.sidebar.dashboard",
  users: "admin.sidebar.users",
  orders: "admin.sidebar.orders",
  stores: "admin.sidebar.stores",
  lockers: "admin.sidebar.lockers",
  services: "admin.sidebar.services",
  payments: "admin.sidebar.payments",
  refunds: "admin.sidebar.refunds",
  revenue: "admin.sidebar.revenue",
  maintenance: "admin.sidebar.maintenance",
  drones: "admin.sidebar.drones",
  loyalty: "admin.sidebar.loyalty",
  partners: "admin.sidebar.partners",
  feedback: "admin.sidebar.feedback",
  settings: "admin.sidebar.settings",
  scheduler: "admin.sidebar.scheduler",
  detail: "admin.breadcrumb.detail",
  create: "admin.breadcrumb.create",
  edit: "admin.breadcrumb.edit",
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const location = useLocation();
  const { t } = useTranslation();

  // Auto-generate items from path if not provided
  const breadcrumbItems: BreadcrumbItem[] =
    items ||
    (() => {
      const paths = location.pathname.split("/").filter(Boolean);
      
      // Only show breadcrumb for nested pages
      if (paths.length < 2) return [];

      return paths.map((path, index) => {
        const fullPath = "/" + paths.slice(0, index + 1).join("/");
        const isLast = index === paths.length - 1;
        return {
          label: pathMap[path] ? t(pathMap[path]) : path,
          path: isLast ? undefined : fullPath,
        };
      });
    })();

  // Don't render if no items
  if (breadcrumbItems.length === 0) return null;

  return (
    <nav
      className={cn(
        "flex items-center gap-2 text-sm text-gray-500",
        className
      )}
    >
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            {isLast || !item.path ? (
              <span
                className={cn(
                  isLast && "font-medium text-gray-900",
                  "max-w-[200px] truncate"
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-blue-600 transition-colors max-w-[200px] truncate"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
