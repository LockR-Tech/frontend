import type { Recommendation } from "~/types/dashboard.types";

export type DashboardRecommendation = Recommendation & {
  /** Route admin thật mà thẻ mở ra. */
  href: string;
};

// Lối tắt tới các trang quản trị có sẵn (routes-config.tsx).
export const dashboardRecommendations: DashboardRecommendation[] = [
  {
    id: "maintenance",
    title: "Bảo trì thiết bị",
    description: "Phiếu sự cố, lịch kiểm tra định kỳ và kỹ thuật viên",
    href: "/admin/maintenance",
  },
  {
    id: "view-analysis",
    title: "Báo cáo doanh thu",
    description: "Doanh thu thực thu theo ngày, dịch vụ, cửa hàng và khách hàng",
    href: "/admin/revenue",
  },
  {
    id: "loyalty",
    title: "Khách hàng thân thiết",
    description: "Thống kê thành viên và điểm thưởng",
    href: "/admin/loyalty",
  },
  {
    id: "campaign",
    title: "Khuyến mãi",
    description: "Tạo và quản lý mã khuyến mãi",
    href: "/admin/promotions",
  },
];
