import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { StatusDropdown } from "~/components/shared/status-tabs";
import type { StoreStatus } from "../hooks/useStores";

interface StoreFiltersProps {
  status: StoreStatus;
  onStatusChange: (status: StoreStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: Record<StoreStatus, number>;
}

const options = [
  { value: "ALL", label: "Tất cả" },
  { value: "ACTIVE", label: "Hoạt động", color: "green" as const },
  { value: "INACTIVE", label: "Vô hiệu", color: "gray" as const },
];

export function StoreFilters({
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: StoreFiltersProps) {
  const optionsWithCounts = options.map((opt) => ({
    ...opt,
    count: statusCounts[opt.value as StoreStatus],
  }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <StatusDropdown
        options={optionsWithCounts}
        value={status}
        onChange={(value) => onStatusChange(value as StoreStatus)}
        placeholder="Trạng thái"
      />

      <div className="relative w-full sm:w-72">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Tìm kiếm cửa hàng..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
