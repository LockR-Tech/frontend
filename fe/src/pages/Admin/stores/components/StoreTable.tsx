import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal,
  MapPin,
  Phone,
  Clock,
  Store as StoreIcon,
  CheckCircle2,
  XCircle,
  User,
  Eye,
} from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import type { AdminStoreResponse } from "~/types/admin/store";

interface StoreTableProps {
  stores: AdminStoreResponse[];
  isLoading: boolean;
  onEdit: (store: AdminStoreResponse) => void;
  onDelete: (storeId: number) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<AdminStoreResponse>();

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
      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}
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
                  <p className="font-semibold text-foreground truncate max-w-[180px] cursor-help">
                    {row.original.name}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{row.original.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <MapPin size={14} className="text-muted-foreground/70 flex-shrink-0" />
              <span className="truncate max-w-[150px]">
                {row.original.description || "—"}
              </span>
            </p>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("phone", {
      header: t("admin.stores.columns.contact"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconWrapper color="green">
            <Phone size={16} />
          </IconWrapper>
          <div className="min-w-0">
            <p className="font-medium text-foreground/80">{row.original.phone}</p>
          </div>
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

    columnHelper.accessor("openTime", {
      header: t("admin.stores.columns.hours"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconWrapper color="amber">
            <Clock size={16} />
          </IconWrapper>
          <span className="font-medium text-foreground/80">
            {row.original.openTime && row.original.closeTime
              ? `${row.original.openTime} - ${row.original.closeTime}`
              : "—"}
          </span>
        </div>
      ),
    }),

    columnHelper.accessor("lockerCount", {
      header: t("admin.stores.columns.lockers"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground/80">
            {row.original.lockerCount ?? 0}
          </span>
          <span className="text-xs text-muted-foreground/70">tủ</span>
        </div>
      ),
    }),

    columnHelper.accessor("active", {
      header: t("admin.stores.columns.status"),
      cell: ({ row }) => (
        <Badge
          className={
            row.original.active
              ? "bg-green-50 text-green-700 border-green-200 font-medium"
              : "bg-muted/50 text-muted-foreground border-border/50 font-medium"
          }
          variant="outline"
        >
          {row.original.active ? (
            <>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              {t("admin.stores.status.active")}
            </>
          ) : (
            <>
              <XCircle className="mr-1 h-3.5 w-3.5" />
              {t("admin.stores.status.inactive")}
            </>
          )}
        </Badge>
      ),
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
              <span className="mr-2">✏️</span> {t("dropdown.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(row.original.id)}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <span className="mr-2">🗑️</span> {t("dropdown.delete")}
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
