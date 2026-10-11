import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  { value: "ALL", labelKey: "common.all" },
  { value: "ACTIVE", labelKey: "admin.stores.status.active", color: "green" as const },
  { value: "INACTIVE", labelKey: "admin.stores.status.inactive", color: "gray" as const },
];

export function StoreFilters({
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: StoreFiltersProps) {
  const { t } = useTranslation();
  const optionsWithCounts = options.map(({ labelKey, ...opt }) => ({
    ...opt,
    label: t(labelKey),
    count: statusCounts[opt.value as StoreStatus],
  }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <StatusDropdown
        options={optionsWithCounts}
        value={status}
        onChange={(value) => onStatusChange(value as StoreStatus)}
        placeholder={t("common.status")}
      />

      <div className="relative w-full sm:w-72">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder={t("admin.stores.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
