import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { StatusDropdown } from "~/components/shared/status-tabs";
import { PartnerStatus } from "~/types/admin/enums";
import type { PartnerStatusFilter } from "../hooks/usePartners";

interface PartnerFiltersProps {
  status: PartnerStatusFilter;
  onStatusChange: (status: PartnerStatusFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: Record<string, number>;
}

const options = [
  { value: "ALL", label: "Tất cả" },
  {
    value: PartnerStatus.PENDING,
    label: "Chờ duyệt",
    color: "yellow" as const,
  },
  { value: PartnerStatus.APPROVED, label: "Đã duyệt", color: "green" as const },
  { value: PartnerStatus.REJECTED, label: "Từ chối", color: "red" as const },
  { value: PartnerStatus.SUSPENDED, label: "Đình chỉ", color: "gray" as const },
];

export function PartnerFilters({
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: PartnerFiltersProps) {
  const optionsWithCounts = options.map((opt) => ({
    ...opt,
    count: statusCounts[opt.value] || 0,
  }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <StatusDropdown
        options={optionsWithCounts}
        value={status}
        onChange={(value) => onStatusChange(value as PartnerStatusFilter)}
        placeholder="Trạng thái"
      />

      <div className="relative w-full sm:w-72">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Tìm kiếm đối tác..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
