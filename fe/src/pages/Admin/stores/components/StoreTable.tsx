import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal,
  MapPin,
  Phone,
  Store as StoreIcon,
  Eye,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { isStoreActive, type StoreRecord } from "~/stores/apis/admin/stores";
import type { RevenueByStoreItem } from "~/types/admin/reporting";

interface StoreTableProps {
  stores: StoreRecord[];
  isLoading: boolean;
  onEdit: (store: StoreRecord) => void;
  onDelete: (store: StoreRecord) => void;
  onToggleStatus: (store: StoreRecord) => void;
  statusPendingIds: Set<number>;
  /** Số tủ/đơn theo cửa hàng (báo cáo by-store); rỗng khi báo cáo lỗi. */
  revenueByStoreId: Map<number, RevenueByStoreItem>;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<StoreRecord>();

// Unified icon wrapper
const IconWrapper = ({
  children,
  color = "blue",
}: {
  children: React.ReactNode;
  color?: "blue" | "green" | "red" | "amber";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-500",
    amber: "bg-amber-50 text-amber-500",
  };
  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[color]}`}
    >
      {children}
    </div>
  );
};

// Truncated text with tooltip
const TruncatedText = ({
  text,
  maxLength = 30,
  className = "",
}: {
  text?: string | null;
  maxLength?: number;
  className?: string;
}) => {
  if (!text || text.length <= maxLength)
    return <span className={className}>{text || "—"}</span>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className}`}>
            {text.slice(0, maxLength)}...
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function StoreTable({
  stores,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  statusPendingIds,
  revenueByStoreId,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: StoreTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const columns = [
    columnHelper.accessor("name", {
      header: t("admin.stores.columns.store"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <IconWrapper color="blue">
            <StoreIcon size={18} />
          </IconWrapper>
          <div className="min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="font-semibold text-foreground truncate max-w-45 cursor-help">
                    {row.original.name}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{row.original.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-45">
              {row.original.description || "—"}
            </p>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("contactPhone", {
      header: t("admin.stores.columns.contact"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconWrapper color="green">
            <Phone size={16} />
          </IconWrapper>
          <p className="font-medium text-foreground/80">
            {row.original.contactPhone || "—"}
          </p>
        </div>
      ),
    }),

    columnHelper.accessor("address", {
      header: t("admin.stores.columns.address"),
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <IconWrapper color="red">
            <MapPin size={16} />
          </IconWrapper>
          <div className="min-w-0 pt-1">
            <TruncatedText
              text={row.original.address}
              maxLength={35}
              className="text-sm text-muted-foreground"
            />
          </div>
        </div>
      ),
    }),

    columnHelper.display({
      id: "lockers",
      header: t("admin.stores.columns.lockers"),
      cell: ({ row }) => {
        const stats = revenueByStoreId.get(row.original.id);
        if (!stats) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="text-sm">
            <p>
              <span className="font-semibold text-foreground/80">{stats.lockerCount}</span>{" "}
              <span className="text-xs text-muted-foreground/70">tủ</span>
              <span className="text-xs text-muted-foreground/70"> · {stats.boxCount} ô</span>
            </p>
            <p className="text-xs text-muted-foreground/70">{stats.orderCount} đơn / 12 tháng</p>
          </div>
        );
      },
    }),

    columnHelper.display({
      id: "status",
      header: t("admin.stores.columns.status"),
      cell: ({ row }) => {
        const store = row.original;
        const active = isStoreActive(store);
        const pending = statusPendingIds.has(store.id);
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={active}
              disabled={pending}
              onCheckedChange={() => onToggleStatus(store)}
              className="data-[state=checked]:bg-green-500"
            />
            {pending ? (
              <Loader2 size={12} className="animate-spin text-muted-foreground/70" />
            ) : (
              <span
                className={`text-xs font-medium ${active ? "text-green-600" : "text-muted-foreground/70"}`}
              >
                {active ? t("admin.stores.status.active") : t("admin.stores.status.inactive")}
              </span>
            )}
          </div>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
            >
              <MoreHorizontal size={16} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40 bg-popover border border-border/50"
          >
            <DropdownMenuItem
              onClick={() => navigate(`/admin/stores/${row.original.id}`)}
              className="cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" />
              {t("dropdown.viewDetail")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(row.original)}
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" /> {t("dropdown.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(row.original)}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t("dropdown.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={stores}
      isLoading={isLoading}
      emptyMessage={t("common.noData")}
      serverPagination={{
        pageIndex: page,
        pageSize,
        pageCount: totalPages,
        totalRows: totalElements,
        onPageChange,
        onPageSizeChange,
      }}
    />
  );
}
