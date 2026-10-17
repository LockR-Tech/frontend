import {
  Plus,
  Tag,
  CheckCircle2,
  Clock,
  Calendar,
  PackageX,
  PowerOff,
  MapPin,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { TableToolbar } from "~/components/shared/data-table";
import { ConfirmActionDialog } from "~/pages/Admin/knowledge/ConfirmActionDialog";
import { PromotionTable } from "./components/PromotionTable";
import { PromotionModal } from "./components/PromotionModal";
import { usePromotions } from "./hooks/usePromotions";
import { PromotionStatus } from "~/types/admin/enums";
import type { PromotionLockerFilter, PromotionStatusFilter } from "./hooks/usePromotions";
import { promotionLockerLabel } from "./promotion-status";

const STATUS_TABS: {
  value: PromotionStatusFilter;
  labelKey: string;
  icon: React.ElementType;
}[] = [
  {
    value: "ALL",
    labelKey: "admin.promotions.status.all",
    icon: Tag,
  },
  {
    value: PromotionStatus.ACTIVE,
    labelKey: "admin.promotions.status.active",
    icon: CheckCircle2,
  },
  {
    value: PromotionStatus.UPCOMING,
    labelKey: "admin.promotions.status.upcoming",
    icon: Clock,
  },
  {
    value: PromotionStatus.EXPIRED,
    labelKey: "admin.promotions.status.expired",
    icon: Calendar,
  },
  {
    value: PromotionStatus.DEPLETED,
    labelKey: "admin.promotions.status.depleted",
    icon: PackageX,
  },
  {
    value: PromotionStatus.INACTIVE,
    labelKey: "admin.promotions.status.inactive",
    icon: PowerOff,
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
    lockerFilter,
    setLockerFilter,
    lockerFilterOptions,
    lockers,
    isLoadingLockers,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    setIsModalOpen,
    editingPromotion,
    refetch,
    handleCreate,
    handleEdit,
    handleSave,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    isDeleting,
    deactivateTarget,
    setDeactivateTarget,
    confirmDeactivate,
    isUpdating,
    setStoredStatus,
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
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background text-muted-foreground border-border/60 hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <Icon size={12} />
              {t(tab.labelKey)}
              <Badge
                className={`ml-1 h-4 px-1.5 text-xs border-0 ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <Input
                placeholder={t("admin.promotions.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full sm:w-64 text-sm"
              />
              <Select
                value={lockerFilter}
                onValueChange={(v) => setLockerFilter(v as PromotionLockerFilter)}
              >
                <SelectTrigger
                  className="h-9 w-full sm:w-64 text-sm"
                  aria-label={t("admin.promotions.scope.filterLabel")}
                  title={t("admin.promotions.scope.filterLabel")}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      <SelectValue />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="ALL">{t("admin.promotions.scope.filterAll")}</SelectItem>
                  <SelectItem value="GLOBAL">{t("admin.promotions.scope.global")}</SelectItem>
                  {lockerFilterOptions.length > 0 && <SelectSeparator />}
                  {lockerFilterOptions.map((locker) => (
                    <SelectItem key={locker.id} value={String(locker.id)}>
                      {promotionLockerLabel(locker)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            onDelete={setDeleteTarget}
            onSetStoredStatus={(promotion, status) => void setStoredStatus(promotion, status)}
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
        lockers={lockers}
        isLoadingLockers={isLoadingLockers}
      />

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("admin.promotions.deleteDialog.title")}
        description={
          <p>
            <Trans
              i18nKey="admin.promotions.deleteDialog.desc"
              values={{ code: deleteTarget?.code }}
              components={{ b: <span className="font-mono font-semibold text-foreground" /> }}
            />
          </p>
        }
        actionLabel={t("common.delete")}
        destructive
        loading={isDeleting}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmActionDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={t("admin.promotions.historyDialog.title")}
        description={
          <>
            <p>
              <Trans
                i18nKey="admin.promotions.historyDialog.desc"
                values={{ code: deactivateTarget?.code }}
                components={{ b: <span className="font-mono font-semibold text-foreground" /> }}
              />
            </p>
            <p>{t("admin.promotions.historyDialog.hint")}</p>
          </>
        }
        actionLabel={t("admin.promotions.actions.deactivate")}
        loading={isUpdating}
        onConfirm={() => void confirmDeactivate()}
      />
    </div>
  );
}
