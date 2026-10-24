import { MapPin, Search, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { StatusDropdown } from "~/components/shared/status-tabs";
import { LockerStatus } from "~/types/admin/enums";
import {
  ALL_FILTER,
  UNASSIGNED_FILTER,
  type LockerFilterOption,
  type LockerStatusFilter,
} from "../hooks/useLockers";

interface LockerFiltersProps {
  status: LockerStatusFilter;
  onStatusChange: (status: LockerStatusFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: Record<string, number>;
  storeFilter: string;
  onStoreFilterChange: (value: string) => void;
  storeOptions: LockerFilterOption[];
  technicianFilter: string;
  onTechnicianFilterChange: (value: string) => void;
  technicianOptions: LockerFilterOption[];
  unassignedCount: number;
  totalLockers: number;
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
  storeFilter,
  onStoreFilterChange,
  storeOptions,
  technicianFilter,
  onTechnicianFilterChange,
  technicianOptions,
  unassignedCount,
  totalLockers,
}: LockerFiltersProps) {
  const { t } = useTranslation();
  const optionsWithCounts = options.map(({ labelKey, ...opt }) => ({
    ...opt,
    label: t(labelKey),
    count: statusCounts[opt.value] || 0,
  }));

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-center gap-3">
      <StatusDropdown
        options={optionsWithCounts}
        value={status}
        onChange={(value) => onStatusChange(value as LockerStatusFilter)}
        placeholder={t("common.status")}
      />

      {/* Lọc nhanh theo địa điểm đặt tủ */}
      <Select value={storeFilter} onValueChange={onStoreFilterChange}>
        <SelectTrigger className="h-10 w-full sm:w-60">
          <MapPin size={16} className="mr-1 shrink-0 text-muted-foreground" />
          <SelectValue placeholder={t("admin.lockers.filters.location")} />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value={ALL_FILTER}>
            {t("admin.lockers.filters.allLocations")} ({totalLockers})
          </SelectItem>
          {storeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Lọc nhanh theo KTV phụ trách */}
      <Select value={technicianFilter} onValueChange={onTechnicianFilterChange}>
        <SelectTrigger className="h-10 w-full sm:w-52">
          <UserRound size={16} className="mr-1 shrink-0 text-muted-foreground" />
          <SelectValue placeholder={t("admin.lockers.filters.technician")} />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value={ALL_FILTER}>
            {t("admin.lockers.filters.allTechnicians")} ({totalLockers})
          </SelectItem>
          <SelectItem value={UNASSIGNED_FILTER}>
            {t("common.unassigned")} ({unassignedCount})
          </SelectItem>
          {technicianOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
