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

const STATUS_OPTIONS = ADMIN_ORDER_STATUSES.map((value) => ({
  value,
  label: orderStatusMeta(value).label,
}));

const TYPE_OPTIONS = ADMIN_ORDER_TYPES.map((value) => ({
  value,
  label: orderTypeMeta(value).label,
}));

const PAYMENT_STATUS_OPTIONS = ADMIN_ORDER_PAYMENT_STATUSES.map((value) => ({
  value,
  label: orderPaymentStatusMeta(value).label,
}));

/** Các trường backend cho phép sắp xếp (§ 1.1 của hợp đồng API). */
const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "Mới tạo trước" },
  { value: "createdAt,asc", label: "Cũ tạo trước" },
  { value: "updatedAt,desc", label: "Vừa cập nhật" },
  { value: "totalPrice,desc", label: "Tiền cao → thấp" },
  { value: "totalPrice,asc", label: "Tiền thấp → cao" },
  { value: "paidAt,desc", label: "Vừa thanh toán" },
  { value: "completedAt,desc", label: "Vừa hoàn thành" },
  { value: "id,desc", label: "Mã đơn giảm dần" },
];

export function OrderFilters({
  filters,
  onFilterChange,
  onDateRangeChange,
}: OrderFiltersProps) {
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
            placeholder="Mã đơn, số điện thoại, tên người nhận…"
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
          label="Loại đơn"
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={(value) => onFilterChange("type", value)}
        />
        <MultiSelectFilter
          label="Thanh toán"
          options={PAYMENT_STATUS_OPTIONS}
          value={filters.paymentStatus}
          onChange={(value) => onFilterChange("paymentStatus", value)}
        />

        <Select
          value={filters.sort}
          onValueChange={(value) => onFilterChange("sort", value)}
        >
          <SelectTrigger className="h-9 w-[180px]">
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
        Khoảng ngày lọc theo thời điểm tạo đơn. Bỏ trống để xem mọi thời điểm.
      </p>
    </div>
  );
}
