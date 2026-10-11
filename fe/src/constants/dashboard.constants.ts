import type { Recommendation } from "~/types/dashboard.types";
import i18n from "~/utils/i18n";

export type DashboardRecommendation = Recommendation & {
  /** Route admin thật mà thẻ mở ra. */
  href: string;
};

// Lối tắt tới các trang quản trị có sẵn (routes-config.tsx).
// `title`/`description` là getter: dịch lúc đọc để theo ngôn ngữ hiện tại.
export const dashboardRecommendations: DashboardRecommendation[] = [
  {
    id: "maintenance",
    get title() {
      return i18n.t("admin.sidebar.maintenance");
    },
    get description() {
      return i18n.t("admin.dashboard.recommendations.maintenanceDescription");
    },
    href: "/admin/maintenance",
  },
  {
    id: "view-analysis",
    get title() {
      return i18n.t("admin.dashboard.recommendations.revenueTitle");
    },
    get description() {
      return i18n.t("admin.dashboard.recommendations.revenueDescription");
    },
    href: "/admin/revenue",
  },
  {
    id: "loyalty",
    get title() {
      return i18n.t("admin.sidebar.loyalty");
    },
    get description() {
      return i18n.t("admin.dashboard.recommendations.loyaltyDescription");
    },
    href: "/admin/loyalty",
  },
  {
    id: "campaign",
    get title() {
      return i18n.t("admin.sidebar.promotions");
    },
    get description() {
      return i18n.t("admin.dashboard.recommendations.promotionsDescription");
    },
    href: "/admin/promotions",
  },
];
