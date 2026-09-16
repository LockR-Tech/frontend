import { useEffect, useState } from "react";
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

const STATUS_OPTIONS = ADMIN_PAYMENT_STATUSES.map((value) => ({
  value,
  label: paymentStatusMeta(value).label,
}));

const METHOD_OPTIONS = ADMIN_PAYMENT_METHODS.map((value) => ({
  value,
  label: paymentMethodMeta(value).label,
}));

/** `kind` quyết định có tính giao dịch nạp ví hay không (§ 2.2 của hợp đồng API). */
const KIND_OPTIONS: { value: PaymentKindFilter; label: string }[] = [
  { value: "ALL", label: "Đơn và nạp ví" },
  { value: "ORDER", label: "Chỉ thu theo đơn" },
  { value: "TOPUP", label: "Chỉ nạp ví" },
];

const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "Mới tạo trước" },
  { value: "createdAt,asc", label: "Cũ tạo trước" },
  { value: "updatedAt,desc", label: "Vừa cập nhật" },
  { value: "amount,desc", label: "Tiền cao → thấp" },
  { value: "amount,asc", label: "Tiền thấp → cao" },
  { value: "id,desc", label: "Mã giao dịch giảm dần" },
];

export function PaymentFilters({
  filters,
  onFilterChange,
  onDateRangeChange,
}: PaymentFiltersProps) {
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
            placeholder="Mã tham chiếu, mô tả, mã giao dịch hoặc mã đơn…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <MultiSelectFilter
          label="Trạng thái"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(value) => onFilterChange("status", value)}
        />
        <MultiSelectFilter
          label="Phương thức"
          options={METHOD_OPTIONS}
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
            <SelectValue placeholder="Loại giao dịch" />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
        Khoảng ngày lọc theo thời điểm tạo giao dịch. Bỏ trống để xem mọi thời điểm.
      </p>
    </div>
  );
}
