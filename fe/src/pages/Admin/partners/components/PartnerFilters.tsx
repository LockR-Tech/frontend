import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  { value: "ALL", labelKey: "common.all" },
  {
    value: PartnerStatus.PENDING,
    labelKey: "admin.partners.status.pending",
    color: "yellow" as const,
  },
  { value: PartnerStatus.APPROVED, labelKey: "admin.partners.status.approved", color: "green" as const },
  { value: PartnerStatus.REJECTED, labelKey: "admin.partners.status.rejected", color: "red" as const },
  { value: PartnerStatus.SUSPENDED, labelKey: "admin.partners.status.suspended", color: "gray" as const },
];

export function PartnerFilters({
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: PartnerFiltersProps) {
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
        onChange={(value) => onStatusChange(value as PartnerStatusFilter)}
        placeholder={t("common.status")}
      />

      <div className="relative w-full sm:w-72">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder={t("admin.partners.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
