import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  { value: "ALL", labelKey: "common.all" },
  { value: LockerStatus.ACTIVE, labelKey: "admin.lockers.status.active", color: "green" as const },
  {
    value: LockerStatus.MAINTENANCE,
    labelKey: "admin.lockers.status.maintenance",
    color: "yellow" as const,
  },
  { value: LockerStatus.INACTIVE, labelKey: "admin.lockers.status.inactive", color: "gray" as const },
];

export function LockerFilters({
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: LockerFiltersProps) {
  const { t } = useTranslation();
  const optionsWithCounts = options.map(({ labelKey, ...opt }) => ({
    ...opt,
    label: t(labelKey),
    count: statusCounts[opt.value] || 0,
  }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <StatusDropdown
        options={optionsWithCounts}
        value={status}
        onChange={(value) => onStatusChange(value as LockerStatusFilter)}
        placeholder={t("common.status")}
      />

      <div className="relative w-full sm:w-72">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder={t("admin.lockers.filters.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
