import { createColumnHelper } from "@tanstack/react-table";
import { MapPin, Phone, Eye, Store as StoreIcon } from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { PartnerStore } from "~/types/partner.type";

interface StoreTableProps {
  stores: PartnerStore[];
  isLoading: boolean;
  onViewDetail: (storeId: number) => void;
}

const columnHelper = createColumnHelper<PartnerStore>();

const IconWrapper = ({
  children,
  color = "blue",
}: {
  children: React.ReactNode;
  color?: "blue" | "green" | "red" | "amber" | "gray";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-500",
    amber: "bg-amber-50 text-amber-500",
    gray: "bg-muted/30 text-muted-foreground",
  };
  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[color]}`}
    >
      {children}
    </div>
  );
};

const TruncatedText = ({
  text,
  maxLength = 35,
  className = "",
}: {
  text?: string | null;
  maxLength?: number;
  className?: string;
}) => {
  if (!text) return <span className={`${className} text-muted-foreground/70`}>—</span>;
  if (text.length <= maxLength) return <span className={className}>{text}</span>;

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

const getStoreBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "border-green-200 bg-green-50 text-green-700";
    case "INACTIVE":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-border/50 bg-muted/30 text-muted-foreground";
  }
};

const getStoreStatusLabel = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "Đang hoạt động";
    case "INACTIVE":
      return "Ngừng hoạt động";
    default:
      return status;
  }
};

export function StoreTable({
  stores,
  isLoading,
  onViewDetail,
}: StoreTableProps) {
  const columns = [
    columnHelper.accessor("name", {
      header: "Cửa hàng",
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
            <p className="text-xs text-muted-foreground/70 mt-0.5">#{row.original.id}</p>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("address", {
      header: "Địa chỉ",
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <IconWrapper color="red">
            <MapPin size={16} />
          </IconWrapper>
          <div className="min-w-0 pt-1">
            <TruncatedText
              text={row.original.address}
              maxLength={40}
              className="text-sm text-muted-foreground"
            />
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("contactPhone", {
      header: "Số điện thoại",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconWrapper color="gray">
            <Phone size={15} />
          </IconWrapper>
          <span className="text-sm text-muted-foreground">
            {row.original.contactPhone || "—"}
          </span>
        </div>
      ),
    }),

    columnHelper.accessor("status", {
      header: "Trạng thái",
      cell: ({ row }) => (
        <Badge
          className={getStoreBadge(row.original.status)}
          variant="outline"
        >
          {getStoreStatusLabel(row.original.status)}
        </Badge>
      ),
    }),

    columnHelper.display({
      id: "actions",
      header: "Hành động",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetail(row.original.id)}
          className="hover:bg-blue-50 text-blue-600"
        >
          <Eye size={16} className="mr-2" />
          Chi tiết
        </Button>
      ),
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={stores}
      isLoading={isLoading}
      emptyMessage="Không có cửa hàng nào"
    />
  );
}
