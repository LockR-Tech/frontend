import { createColumnHelper } from "@tanstack/react-table";
import {
  MoreHorizontal,
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  RefreshCcw,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Undo2,
  Ban,
  Eye,
} from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { PaymentStatus, PaymentMethod } from "~/types/admin/enums";
import type { PaymentResponse } from "~/types/admin/payment";

interface PaymentTableProps {
  payments: PaymentResponse[];
  isLoading: boolean;
  onViewDetail: (id: number) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<PaymentResponse>();

const getStatusBadge = (status: PaymentStatus) => {
  const variants: Record<
    PaymentStatus,
    { bg: string; text: string; icon: React.ElementType; label: string }
  > = {
    [PaymentStatus.COMPLETED]: {
      bg: "bg-green-50",
      text: "text-green-700",
      icon: CheckCircle2,
      label: "Thành công",
    },
    [PaymentStatus.PENDING]: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      icon: Clock,
      label: "Chờ thanh toán",
    },
    [PaymentStatus.PROCESSING]: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: RotateCcw,
      label: "Đang xử lý",
    },
    [PaymentStatus.FAILED]: {
      bg: "bg-red-50",
      text: "text-red-700",
      icon: XCircle,
      label: "Thất bại",
    },
    [PaymentStatus.REFUNDED]: {
      bg: "bg-muted/30",
      text: "text-foreground/80",
      icon: Undo2,
      label: "Đã hoàn tiền",
    },
    [PaymentStatus.CANCELED]: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      icon: Ban,
      label: "Đã hủy",
    },
  };

  const variant = variants[status] ?? {
    bg: "bg-muted/30",
    text: "text-foreground/80",
    icon: Ban,
    label: (status as string) || "—",
  };
  const Icon = variant.icon;
  return (
    <Badge className={`${variant.bg} ${variant.text} border-0 font-medium`}>
      <Icon className="mr-1 h-3 w-3" />
      {variant.label}
    </Badge>
  );
};

const getMethodIcon = (method: PaymentMethod) => {
  switch (method) {
    case PaymentMethod.MOMO:
    case PaymentMethod.ZALOPAY:
      return <Smartphone size={18} className="text-pink-500" />;
    case PaymentMethod.VNPAY:
      return <CreditCard size={18} className="text-blue-500" />;
    case PaymentMethod.BANK_TRANSFER:
      return <Banknote size={18} className="text-green-500" />;
    case PaymentMethod.WALLET:
      return <Wallet size={18} className="text-purple-500" />;
    default:
      return <Banknote size={18} className="text-muted-foreground" />;
  }
};

const getMethodLabel = (method: PaymentMethod) => {
  const labels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: "Tiền mặt",
    [PaymentMethod.WALLET]: "Ví điện tử",
    [PaymentMethod.BANK_TRANSFER]: "Chuyển khoản",
    [PaymentMethod.MOMO]: "MoMo",
    [PaymentMethod.VNPAY]: "VNPay",
    [PaymentMethod.ZALOPAY]: "ZaloPay",
  };
  return labels[method] || method;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export function PaymentTable({
  payments,
  isLoading,
  onViewDetail,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: PaymentTableProps) {
  const columns = [
    columnHelper.accessor("id", {
      header: "Mã thanh toán",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-green-50 to-emerald-50 flex items-center justify-center shadow-sm">
            <CreditCard size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-mono font-semibold text-foreground text-sm">
              #{row.original.id}
            </p>
            <p className="text-xs text-muted-foreground">#{row.original.orderId}</p>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("customerName", {
      header: "Khách hàng",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.customerName || `Khách #${row.original.userId ?? "?"}`}
        </span>
      ),
    }),

    columnHelper.accessor("amount", {
      header: "Số tiền",
      cell: ({ row }) => (
        <span className="text-lg font-bold text-green-600">
          {formatCurrency(row.original.amount)}
        </span>
      ),
    }),

    columnHelper.accessor("method", {
      header: "Phương thức",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {getMethodIcon(row.original.method)}
          <Badge variant="outline" className="bg-muted/30 font-medium">
            {getMethodLabel(row.original.method)}
          </Badge>
        </div>
      ),
    }),

    columnHelper.accessor("status", {
      header: "Trạng thái",
      cell: ({ row }) => getStatusBadge(row.original.status),
    }),

    columnHelper.accessor("createdAt", {
      header: "Thời gian",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-"}
        </span>
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
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onViewDetail(row.original.id)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              📄 Xem hóa đơn
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-orange-600 focus:text-orange-600">
              <RefreshCcw size={14} className="mr-2" />
              Hoàn tiền
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={payments}
      isLoading={isLoading}
      emptyMessage="Không tìm thấy giao dịch nào"
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
