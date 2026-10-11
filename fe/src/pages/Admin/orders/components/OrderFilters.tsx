import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownUp, Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  DateRangeFilter,
  MultiSelectFilter,
  orderPaymentStatusMeta,
  orderStatusMeta,
  orderTypeMeta,
} from "~/components/shared/reporting";
import {
  ADMIN_ORDER_PAYMENT_STATUSES,
  ADMIN_ORDER_STATUSES,
  ADMIN_ORDER_TYPES,
} from "~/types/admin/reporting";
import type { OrderFilterState } from "../hooks/useOrders";

interface OrderFiltersProps {
  filters: OrderFilterState;
  onFilterChange: <K extends keyof OrderFilterState>(
    key: K,
    value: OrderFilterState[K],
  ) => void;
  onDateRangeChange: (range: { from: string; to: string }) => void;
}

/** Các trường backend cho phép sắp xếp (§ 1.1 của hợp đồng API). */
const SORT_OPTIONS = [
  { value: "createdAt,desc", labelKey: "admin.orders.sort.createdDesc" },
  { value: "createdAt,asc", labelKey: "admin.orders.sort.createdAsc" },
  { value: "updatedAt,desc", labelKey: "admin.orders.sort.updatedDesc" },
  { value: "totalPrice,desc", labelKey: "admin.orders.sort.amountDesc" },
  { value: "totalPrice,asc", labelKey: "admin.orders.sort.amountAsc" },
  { value: "paidAt,desc", labelKey: "admin.orders.sort.paidDesc" },
  { value: "completedAt,desc", labelKey: "admin.orders.sort.completedDesc" },
  { value: "id,desc", labelKey: "admin.orders.sort.idDesc" },
];

export function OrderFilters({
  filters,
  onFilterChange,
  onDateRangeChange,
}: OrderFiltersProps) {
  const { t } = useTranslation();
  // Nhãn enum dựng mỗi lần render để đổi theo ngôn ngữ đang chọn.
  const statusOptions = ADMIN_ORDER_STATUSES.map((value) => ({
    value,
    label: orderStatusMeta(value).label,
  }));
  const typeOptions = ADMIN_ORDER_TYPES.map((value) => ({
    value,
    label: orderTypeMeta(value).label,
  }));
  const paymentStatusOptions = ADMIN_ORDER_PAYMENT_STATUSES.map((value) => ({
    value,
    label: orderPaymentStatusMeta(value).label,
  }));
  // Ô tìm kiếm gõ tới đâu hiện tới đó, nhưng chỉ gọi API sau khi ngừng gõ.
  const [searchDraft, setSearchDraft] = useState(filters.q);

  useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (searchDraft === filters.q) return;
    const timer = setTimeout(() => onFilterChange("q", searchDraft), 400);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.q, onFilterChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={t("admin.orders.filters.searchPlaceholder")}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <MultiSelectFilter
          label={t("common.status")}
          options={statusOptions}
          value={filters.status}
          onChange={(value) => onFilterChange("status", value)}
        />
        <MultiSelectFilter
          label={t("admin.orders.fields.orderType")}
          options={typeOptions}
          value={filters.type}
          onChange={(value) => onFilterChange("type", value)}
        />
        <MultiSelectFilter
          label={t("common.payment")}
          options={paymentStatusOptions}
          value={filters.paymentStatus}
          onChange={(value) => onFilterChange("paymentStatus", value)}
        />

        <Select
          value={filters.sort}
          onValueChange={(value) => onFilterChange("sort", value)}
        >
          <SelectTrigger className="h-9 w-[180px]">
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

      <DateRangeFilter
        value={{ from: filters.from, to: filters.to }}
        onChange={onDateRangeChange}
        allowEmpty
      />
      <p className="text-[11px] text-muted-foreground">
        {t("admin.orders.filters.dateHint")}
      </p>
    </div>
  );
}
