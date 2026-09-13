import {
  Plus,
  Tag,
  CheckCircle2,
  Clock,
  Calendar,
  PackageX,
  PowerOff,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { TableToolbar } from "~/components/shared/data-table";
import { PromotionTable } from "./components/PromotionTable";
import { PromotionModal } from "./components/PromotionModal";
import { usePromotions } from "./hooks/usePromotions";
import { PromotionStatus } from "~/types/admin/enums";
import type { PromotionStatusFilter } from "./hooks/usePromotions";

const STATUS_TABS: {
  value: PromotionStatusFilter;
  labelKey: string;
  icon: React.ElementType;
  activeClass: string;
}[] = [
  {
    value: "ALL",
    labelKey: "admin.promotions.status.all",
    icon: Tag,
    activeClass: "bg-gray-800 text-white",
  },
  {
    value: PromotionStatus.ACTIVE,
    labelKey: "admin.promotions.status.active",
    icon: CheckCircle2,
    activeClass: "bg-green-600 text-white",
  },
  {
    value: PromotionStatus.UPCOMING,
    labelKey: "admin.promotions.status.upcoming",
    icon: Clock,
    activeClass: "bg-blue-600 text-white",
  },
  {
    value: PromotionStatus.EXPIRED,
    labelKey: "admin.promotions.status.expired",
    icon: Calendar,
    activeClass: "bg-muted/300 text-white",
  },
  {
    value: PromotionStatus.DEPLETED,
    labelKey: "admin.promotions.status.depleted",
    icon: PackageX,
    activeClass: "bg-orange-600 text-white",
  },
  {
    value: PromotionStatus.INACTIVE,
    labelKey: "admin.promotions.status.inactive",
    icon: PowerOff,
    activeClass: "bg-red-600 text-white",
  },
];

export default function PromotionsPage() {
  const { t } = useTranslation();
  const {
    promotions,
    totalElements,
    isLoading,
    isSaving,
    statusFilter,
    setStatusFilter,
    statusCounts,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    setIsModalOpen,
    editingPromotion,
    refetch,
    handleCreate,
    handleEdit,
    handleSave,
    handleDelete,
    clearFilters,
    hasActiveFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
  } = usePromotions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t("admin.promotions.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.promotions.description")} • {totalElements}{" "}
            {t("admin.promotions.title").toLowerCase()}
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-1.5">
          <Plus size={14} />
          {t("admin.promotions.createBtn")}
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = statusCounts[tab.value] ?? 0;
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isActive
                  ? `${tab.activeClass} border-transparent shadow-sm`
                  : "bg-background text-muted-foreground border-border/50 hover:border-border/70"
              }`}
            >
              <Icon size={12} />
              {t(tab.labelKey)}
              <Badge
                className={`ml-1 h-4 px-1.5 text-xs border-0 ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <Input
              placeholder={t("admin.promotions.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full sm:w-64 text-sm"
            />
            <TableToolbar
              onRefresh={refetch}
              onClearFilters={clearFilters}
              canClearFilters={hasActiveFilters}
            />
          </div>

          <PromotionTable
            promotions={promotions}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <PromotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        promotion={editingPromotion}
        mode={editingPromotion ? "edit" : "create"}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
