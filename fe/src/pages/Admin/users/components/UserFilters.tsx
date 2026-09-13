import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import { StatusDropdown } from "~/components/shared/status-tabs";
import type { UserStatus } from "../hooks/useUsers";

interface UserFiltersProps {
  status: UserStatus;
  onStatusChange: (status: UserStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: Record<UserStatus, number>;
}

export function UserFilters({
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: UserFiltersProps) {
  const { t } = useTranslation();

  const options = [
    { value: "ALL", label: t("common.all"), count: statusCounts.ALL },
    {
      value: "ACTIVE",
      label: t("admin.users.status.active"),
      color: "green" as const,
      count: statusCounts.ACTIVE,
    },
    {
      value: "INACTIVE",
      label: t("admin.users.status.inactive"),
      color: "red" as const,
      count: statusCounts.INACTIVE,
    },
    {
      value: "PENDING",
      label: t("admin.users.status.pending"),
      color: "yellow" as const,
      count: statusCounts.PENDING,
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <StatusDropdown
        options={options}
        value={status}
        onChange={(value) => onStatusChange(value as UserStatus)}
        placeholder={t("common.status")}
      />

      <div className="relative w-full sm:w-72">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder={t("admin.users.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
