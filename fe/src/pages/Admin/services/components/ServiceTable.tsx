import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal, Clock, CheckCircle2, XCircle } from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { AdminServiceResponse } from "~/types/admin/service";

interface ServiceTableProps {
  services: AdminServiceResponse[];
  isLoading: boolean;
  onEdit: (service: AdminServiceResponse) => void;
  onDelete: (serviceId: number) => void;
  onToggleStatus: (serviceId: number, currentActive: boolean) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<AdminServiceResponse>();

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const getServiceIcon = (name: string) => {
  if (name.includes("hấp")) return "👔";
  if (name.includes("giày")) return "👟";
  if (name.includes("túi")) return "👜";
  if (name.includes("chăn") || name.includes("mền")) return "🛏️";
  return "👕";
};

export function ServiceTable({
  services,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: ServiceTableProps) {
  const columns = [
    columnHelper.accessor("name", {
      header: "Dịch vụ",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-2xl shadow-sm">
            {getServiceIcon(row.original.name)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{row.original.name}</p>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {row.original.description}
            </p>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("price", {
      header: "Giá",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-blue-600">
            {formatCurrency(row.original.price)}
          </span>
        </div>
      ),
    }),

    columnHelper.accessor("unit", {
      header: "Đơn vị",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="bg-muted/30 text-foreground/80 font-medium px-3"
        >
          /{row.original.unit}
        </Badge>
      ),
    }),

    columnHelper.accessor("estimatedMinutes", {
      header: "Thời gian",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <Clock size={16} className="text-orange-500" />
          </div>
          <span className="font-medium">
            {row.original.estimatedMinutes >= 60
              ? `${Math.round(row.original.estimatedMinutes / 60)} giờ`
              : `${row.original.estimatedMinutes} phút`}
          </span>
        </div>
      ),
    }),

    columnHelper.accessor("active", {
      header: "Trạng thái",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Switch
            checked={row.original.active}
            onCheckedChange={() =>
              onToggleStatus(row.original.id, row.original.active)
            }
          />
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
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Hoạt động
              </>
            ) : (
              <>
                <XCircle className="mr-1 h-3 w-3" />
                Vô hiệu
              </>
            )}
          </Badge>
        </div>
      ),
    }),

    columnHelper.display({
      id: "actions",
      header: "",
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
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => onEdit(row.original)}
              className="cursor-pointer"
            >
              ✏️ Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(row.original.id)}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              🗑️ Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={services}
      isLoading={isLoading}
      emptyMessage="Không tìm thấy dịch vụ nào"
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
