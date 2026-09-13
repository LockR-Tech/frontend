import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { StatusDropdown } from "~/components/shared/status-tabs";
import { LockerStatus } from "~/types/admin/enums";
import type { LockerStatusFilter } from "../hooks/useLockers";

interface LockerFiltersProps {
  status: LockerStatusFilter;
  onStatusChange: (status: LockerStatusFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: Record<string, number>;
}

const options = [
  { value: "ALL", label: "Tất cả" },
  { value: LockerStatus.ACTIVE, label: "Hoạt động", color: "green" as const },
  {
    value: LockerStatus.MAINTENANCE,
    label: "Bảo trì",
    color: "yellow" as const,
  },
  { value: LockerStatus.INACTIVE, label: "Vô hiệu", color: "gray" as const },
  {
    value: LockerStatus.DISCONNECTED,
    label: "Mất kết nối",
    color: "red" as const,
  },
];

export function LockerFilters({
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: LockerFiltersProps) {
  const optionsWithCounts = options.map((opt) => ({
    ...opt,
    count: statusCounts[opt.value] || 0,
  }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <StatusDropdown
        options={optionsWithCounts}
        value={status}
        onChange={(value) => onStatusChange(value as LockerStatusFilter)}
        placeholder="Trạng thái"
      />

      <div className="relative w-full sm:w-72">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Tìm kiếm tủ đồ..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
