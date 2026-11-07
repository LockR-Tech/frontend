import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import { StatusDropdown } from "~/components/shared/status-tabs";
import { AREA_ALL, AREA_UNKNOWN, type StoreStatus } from "../hooks/useStores";

interface StoreFiltersProps {
  status: StoreStatus;
  onStatusChange: (status: StoreStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: Record<StoreStatus, number>;
  area: string;
  onAreaChange: (area: string) => void;
  areaCounts: { value: string; count: number }[];
  totalCount: number;
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
  area,
  onAreaChange,
  areaCounts,
  totalCount,
}: StoreFiltersProps) {
  const { t } = useTranslation();
  const optionsWithCounts = options.map(({ labelKey, ...opt }) => ({
    ...opt,
    label: t(labelKey),
    count: statusCounts[opt.value as StoreStatus],
  }));

  const areaOptions = [
    { value: AREA_ALL, label: t("admin.stores.area.all"), count: totalCount },
    ...areaCounts.map(({ value, count }) => ({
      value,
      label: value === AREA_UNKNOWN ? t("admin.stores.area.unknown") : value,
      count,
    })),
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <StatusDropdown
        options={optionsWithCounts}
        value={status}
        onChange={(value) => onStatusChange(value as StoreStatus)}
        placeholder={t("common.status")}
      />

      <StatusDropdown
        options={areaOptions}
        value={area}
        onChange={onAreaChange}
        placeholder={t("admin.stores.area.label")}
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
          className={`pl-10 h-10 ${searchQuery ? "pr-9" : ""}`}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
