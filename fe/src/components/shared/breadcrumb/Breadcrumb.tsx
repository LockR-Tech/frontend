import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "~/lib/utils";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Path mapping - no "admin" or "Trang chủ"
const pathMap: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Người dùng",
  orders: "Đơn hàng",
  stores: "Cửa hàng",
  lockers: "Tủ đồ",
  services: "Dịch vụ",
  payments: "Thanh toán",
  loyalty: "Khách hàng thân thiết",
  partners: "Đối tác",
  feedback: "Phản hồi",
  settings: "Cài đặt",
  scheduler: "Lập lịch",
  detail: "Chi tiết",
  create: "Tạo mới",
  edit: "Chỉnh sửa",
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const location = useLocation();

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
          label: pathMap[path] || path,
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
