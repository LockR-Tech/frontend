import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import { StatusDropdown } from "~/components/shared/status-tabs";
import { OrderStatus } from "~/types/admin/enums";

interface OrderFiltersProps {
  status: "ALL" | OrderStatus;
  onStatusChange: (status: "ALL" | OrderStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: Record<string, number>;
}

export function OrderFilters({
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: OrderFiltersProps) {
  const { t } = useTranslation();

  const options = [
    { value: "ALL", label: t("common.all"), count: statusCounts.ALL },
    {
      value: OrderStatus.INITIALIZED,
      label: t("admin.orders.status.initialized"),
      color: "gray" as const,
      count: statusCounts[OrderStatus.INITIALIZED],
    },
    {
      value: OrderStatus.PROCESSING,
      label: t("admin.orders.status.processing"),
      color: "purple" as const,
      count: statusCounts[OrderStatus.PROCESSING],
    },
    {
      value: OrderStatus.READY,
      label: t("admin.orders.status.ready"),
      color: "blue" as const,
      count: statusCounts[OrderStatus.READY],
    },
    {
      value: OrderStatus.COMPLETED,
      label: t("admin.orders.status.completed"),
      color: "green" as const,
      count: statusCounts[OrderStatus.COMPLETED],
    },
    {
      value: OrderStatus.CANCELED,
      label: t("admin.orders.status.canceled"),
      color: "red" as const,
      count: statusCounts[OrderStatus.CANCELED],
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <StatusDropdown
        options={options}
        value={status}
        onChange={(value) => onStatusChange(value as "ALL" | OrderStatus)}
        placeholder={t("common.status")}
      />

      <div className="relative w-full sm:w-72">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder={t("admin.orders.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
