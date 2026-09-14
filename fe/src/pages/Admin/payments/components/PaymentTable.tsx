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
  ArrowUpRight,
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
    { bg: string; text: string; border: string; icon: React.ElementType; label: string }
  > = {
    [PaymentStatus.COMPLETED]: {
      bg: "bg-emerald-50 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200/80 dark:border-emerald-800/50",
      icon: CheckCircle2,
      label: "Thành công",
    },
    [PaymentStatus.PENDING]: {
      bg: "bg-amber-50 hover:bg-amber-100/90 dark:bg-amber-950/40 dark:hover:bg-amber-900/50",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200/80 dark:border-amber-800/50",
      icon: Clock,
      label: "Chờ thanh toán",
    },
    [PaymentStatus.PROCESSING]: {
      bg: "bg-sky-50 hover:bg-sky-100/90 dark:bg-sky-950/40 dark:hover:bg-sky-900/50",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-200/80 dark:border-sky-800/50",
      icon: RotateCcw,
      label: "Đang xử lý",
    },
    [PaymentStatus.FAILED]: {
      bg: "bg-rose-50 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/50",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200/80 dark:border-rose-800/50",
      icon: XCircle,
      label: "Thất bại",
    },
    [PaymentStatus.REFUNDED]: {
      bg: "bg-purple-50 hover:bg-purple-100/90 dark:bg-purple-950/40 dark:hover:bg-purple-900/50",
      text: "text-purple-700 dark:text-purple-300",
      border: "border-purple-200/80 dark:border-purple-800/50",
      icon: Undo2,
      label: "Đã hoàn tiền",
    },
    [PaymentStatus.CANCELED]: {
      bg: "bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800/50 dark:hover:bg-slate-800",
      text: "text-slate-600 dark:text-slate-400",
      border: "border-slate-200 dark:border-slate-700",
      icon: Ban,
      label: "Đã hủy",
    },
  };

  const variant = variants[status] ?? {
    bg: "bg-muted/40 hover:bg-muted/60",
    text: "text-foreground/80",
    border: "border-border",
    icon: Ban,
    label: (status as string) || "—",
  };
  const Icon = variant.icon;
  return (
    <Badge
      variant="outline"
      className={`${variant.bg} ${variant.text} ${variant.border} font-medium px-2.5 py-0.5 text-xs transition-colors`}
    >
      <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
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
        <div>
          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
            {formatCurrency(row.original.amount)}
          </span>
          <div className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
            <ArrowUpRight className="w-3 h-3 shrink-0" />
            <span>+100% thu</span>
          </div>
        </div>
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
      header: "Thời gian (hh:mm:ss)",
      cell: ({ row }) => {
        const rawDate = row.original.createdAt;
        if (!rawDate) return <span className="text-sm text-muted-foreground">—</span>;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return <span className="text-xs font-mono text-muted-foreground">{rawDate}</span>;
        const timeStr = d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const dateStr = d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        return (
          <div className="font-mono text-xs">
            <p className="font-bold text-foreground tracking-tight">{timeStr}</p>
            <p className="text-[11px] text-muted-foreground">{dateStr}</p>
          </div>
        );
      },
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
