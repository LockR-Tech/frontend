import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { StatusDropdown } from "~/components/shared/status-tabs";
import { PaymentStatus } from "~/types/admin/enums";
import type { PaymentStatusFilter } from "../hooks/usePayments";

interface PaymentFiltersProps {
  status: PaymentStatusFilter;
  onStatusChange: (status: PaymentStatusFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: Record<string, number>;
}

const options = [
  { value: "ALL", label: "Tất cả" },
  {
    value: PaymentStatus.COMPLETED,
    label: "Thành công",
    color: "green" as const,
  },
  {
    value: PaymentStatus.PENDING,
    label: "Chờ xử lý",
    color: "yellow" as const,
  },
  {
    value: PaymentStatus.PROCESSING,
    label: "Đang xử lý",
    color: "purple" as const,
  },
  { value: PaymentStatus.FAILED, label: "Thất bại", color: "red" as const },
];

export function PaymentFilters({
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: PaymentFiltersProps) {
  const optionsWithCounts = options.map((opt) => ({
    ...opt,
    count: statusCounts[opt.value] || 0,
  }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <StatusDropdown
        options={optionsWithCounts}
        value={status}
        onChange={(value) => onStatusChange(value as PaymentStatusFilter)}
        placeholder="Trạng thái"
      />

      <div className="relative w-full sm:w-72">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Tìm kiếm giao dịch..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
