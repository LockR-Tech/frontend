import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownUp, CircleDollarSign, PackageCheck, Search, Warehouse } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { TableToolbar } from "~/components/shared/data-table";
import {
  MultiSelectFilter,
  ReportErrorState,
  ReportStatCard,
  orderTypeMeta,
} from "~/components/shared/reporting";
import { formatNumber } from "~/lib/report-format";
import { cn } from "~/lib/utils";
import { ADMIN_ORDER_TYPES } from "~/types/admin/reporting";
import type { AdminOrder } from "~/types/admin/reporting";
import { StorageOrderTable } from "./components/StorageOrderTable";
import { HandOverDialog } from "./components/HandOverDialog";
import { useStorageOrders, type StoragePaymentFilter } from "./hooks/useStorageOrders";

const SORT_OPTIONS = [
  { value: "pickupDeadline,asc", labelKey: "admin.storage.sort.oldestFirst" },
  { value: "pickupDeadline,desc", labelKey: "admin.storage.sort.newestFirst" },
  { value: "totalPrice,desc", labelKey: "admin.orders.sort.amountDesc" },
];

/**
 * Đồ lưu kho: đơn quá hạn lấy hàng quá `overdue-release-hours` giờ bị dời đồ vào kho (EXPIRED),
 * ô đã nhả. Nhân viên tra theo mã đơn / SĐT, thu phí quá hạn rồi trao trả và chốt đơn.
 */
export default function StoragePage() {
  const { t } = useTranslation();
  const {
    orders,
    isLoading,
    isFetching,
    error,
    refetch,
    filters,
    setFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalElements,
    hasActiveFilters,
    clearFilters,
    stats,
    releaseHours,
  } = useStorageOrders();
  const [handingOver, setHandingOver] = useState<AdminOrder | null>(null);

  const [searchDraft, setSearchDraft] = useState(filters.q);
  useEffect(() => setSearchDraft(filters.q), [filters.q]);
  useEffect(() => {
    if (searchDraft === filters.q) return;
    const timer = setTimeout(() => setFilter("q", searchDraft), 400);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.q, setFilter]);

  const typeOptions = ADMIN_ORDER_TYPES.map((value) => ({
    value,
    label: orderTypeMeta(value).label,
  }));

  const statCards: {
    key: StoragePaymentFilter;
    label: string;
    value: number;
    hint: string;
    icon: React.ElementType;
  }[] = [
    {
      key: "ALL",
      label: t("admin.storage.stats.total"),
      value: stats.total,
      hint: t("admin.storage.stats.totalHint"),
      icon: Warehouse,
    },
    {
      key: "UNPAID",
      label: t("admin.storage.stats.unpaid"),
      value: stats.unpaid,
      hint: t("admin.storage.stats.unpaidHint"),
      icon: CircleDollarSign,
    },
    {
      key: "PAID",
      label: t("admin.storage.stats.paid"),
      value: stats.paid,
      hint: t("admin.storage.stats.paidHint"),
      icon: PackageCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.storage.title")}
        description={
          releaseHours !== null && releaseHours > 0
            ? t("admin.storage.descriptionWithHours", { hours: releaseHours })
            : t("admin.storage.description")
        }
      />

      {error && <ReportErrorState error={error} onRetry={refetch} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <ReportStatCard
            key={card.key}
            label={card.label}
            value={formatNumber(card.value)}
            hint={card.hint}
            icon={card.icon}
            isLoading={stats.isLoading}
            onClick={() => setFilter("payment", card.key)}
            className={cn(filters.payment === card.key && "ring-2 ring-primary border-primary/50")}
          />
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-80">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder={t("admin.storage.searchPlaceholder")}
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <MultiSelectFilter
                label={t("admin.orders.fields.orderType")}
                options={typeOptions}
                value={filters.type}
                onChange={(value) => setFilter("type", value)}
              />
              <Select value={filters.sort} onValueChange={(value) => setFilter("sort", value)}>
                <SelectTrigger className="h-9 w-[200px]">
                  <ArrowDownUp className="h-3.5 w-3.5 opacity-60 shrink-0" />
                  <SelectValue placeholder={t("common.sort")} />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
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

          <p className="text-xs text-muted-foreground">
            {isFetching
              ? t("common.loadingEllipsis")
              : t("admin.storage.matchCount", { total: formatNumber(totalElements) })}
          </p>

          <StorageOrderTable
            orders={orders}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onHandOver={setHandingOver}
          />
        </CardContent>
      </Card>

      <HandOverDialog
        order={handingOver}
        onClose={() => setHandingOver(null)}
        onDone={refetch}
      />
    </div>
  );
}
