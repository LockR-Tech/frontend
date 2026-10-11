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
  paymentMethodMeta,
  paymentStatusMeta,
} from "~/components/shared/reporting";
import {
  ADMIN_PAYMENT_METHODS,
  ADMIN_PAYMENT_STATUSES,
} from "~/types/admin/reporting";
import type { PaymentFilterState, PaymentKindFilter } from "../hooks/usePayments";

interface PaymentFiltersProps {
  filters: PaymentFilterState;
  onFilterChange: <K extends keyof PaymentFilterState>(
    key: K,
    value: PaymentFilterState[K],
  ) => void;
  onDateRangeChange: (range: { from: string; to: string }) => void;
}

/** `kind` quyết định có tính giao dịch nạp ví hay không (§ 2.2 của hợp đồng API). */
const KIND_OPTIONS: { value: PaymentKindFilter; labelKey: string }[] = [
  { value: "ALL", labelKey: "admin.payments.kind.all" },
  { value: "ORDER", labelKey: "admin.payments.kind.order" },
  { value: "TOPUP", labelKey: "admin.payments.kind.topup" },
];

const SORT_OPTIONS = [
  { value: "createdAt,desc", labelKey: "admin.orders.sort.createdDesc" },
  { value: "createdAt,asc", labelKey: "admin.orders.sort.createdAsc" },
  { value: "updatedAt,desc", labelKey: "admin.orders.sort.updatedDesc" },
  { value: "amount,desc", labelKey: "admin.orders.sort.amountDesc" },
  { value: "amount,asc", labelKey: "admin.orders.sort.amountAsc" },
  { value: "id,desc", labelKey: "admin.payments.sort.idDesc" },
];

export function PaymentFilters({
  filters,
  onFilterChange,
  onDateRangeChange,
}: PaymentFiltersProps) {
  const { t } = useTranslation();
  // Nhãn enum dựng mỗi lần render để đổi theo ngôn ngữ đang chọn.
  const statusOptions = ADMIN_PAYMENT_STATUSES.map((value) => ({
    value,
    label: paymentStatusMeta(value).label,
  }));
  const methodOptions = ADMIN_PAYMENT_METHODS.map((value) => ({
    value,
    label: paymentMethodMeta(value).label,
  }));
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
            placeholder={t("admin.payments.filters.searchPlaceholder")}
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
          label={t("admin.payments.method")}
          options={methodOptions}
          value={filters.method}
          onChange={(value) => onFilterChange("method", value)}
        />

        <Select
          value={filters.kind}
          onValueChange={(value) =>
            onFilterChange("kind", value as PaymentKindFilter)
          }
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder={t("admin.payments.filters.kindPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          onValueChange={(value) => onFilterChange("sort", value)}
        >
          <SelectTrigger className="h-9 w-[190px]">
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
        {t("admin.payments.filters.dateHint")}
      </p>
    </div>
  );
}
