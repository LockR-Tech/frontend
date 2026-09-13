import { createColumnHelper } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Building2,
  Phone,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  MapPin,
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
import { PartnerStatus } from "~/types/admin/enums";

// Partner row data type (mapped from API response)
interface PartnerRowData {
  id: number;
  name: string;
  email: string;
  phone: string;
  representativeName: string;
  representativePhone: string;
  status: PartnerStatus;
  address: string;
  createdAt: string;
  storeCount: number;
  staffCount: number;
  revenueSharePercent: number | null;
}

interface PartnerTableProps {
  partners: PartnerRowData[];
  isLoading: boolean;
  onViewDetail: (id: number) => void;
  onEdit: (partner: PartnerRowData) => void;
  onApprove: (partnerId: number) => void;
  onReject: (partnerId: number) => void;
  onSuspend: (partnerId: number) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<PartnerRowData>();

// Unified icon wrapper
const IconWrapper = ({
  children,
  color = "blue",
}: {
  children: React.ReactNode;
  color?: "blue" | "green" | "purple" | "indigo";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
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
  maxLength = 25,
  className = "",
}: {
  text: string;
  maxLength?: number;
  className?: string;
}) => {
  if (!text || text.length <= maxLength)
    return <span className={className}>{text || "Chưa cập nhật"}</span>;

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

const getStatusBadge = (status: PartnerStatus, t: (key: string) => string) => {
  const variants: Record<
    PartnerStatus,
    { className: string; icon: React.ReactNode; labelKey: string }
  > = {
    [PartnerStatus.APPROVED]: {
      className: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle size={14} className="text-green-600" />,
      labelKey: "admin.partners.status.approved",
    },
    [PartnerStatus.PENDING]: {
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock size={14} className="text-amber-600" />,
      labelKey: "admin.partners.status.pending",
    },
    [PartnerStatus.REJECTED]: {
      className: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle size={14} className="text-red-600" />,
      labelKey: "admin.partners.status.rejected",
    },
    [PartnerStatus.SUSPENDED]: {
      className: "bg-muted/30 text-foreground/80 border-border/50",
      icon: <AlertCircle size={14} className="text-muted-foreground" />,
      labelKey: "admin.partners.status.suspended",
    },
  };

  const variant = variants[status];
  return (
    <Badge className={`${variant.className} font-medium`} variant="outline">
      <span className="mr-1.5">{variant.icon}</span>
      {t(variant.labelKey)}
    </Badge>
  );
};

export function PartnerTable({
  partners,
  isLoading,
  onViewDetail,
  onEdit,
  onApprove,
  onReject,
  onSuspend,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: PartnerTableProps) {
  const { t } = useTranslation();
  const columns = [
    columnHelper.accessor("name", {
      header: t("admin.partners.columns.partner"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <IconWrapper color="purple">
            <Building2 size={18} />
          </IconWrapper>
          <div className="min-w-0">
            <TruncatedText
              text={row.original.name}
              maxLength={22}
              className="font-semibold text-foreground"
            />
            <p className="text-sm text-muted-foreground truncate max-w-[180px]">
              {row.original.email}
            </p>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("representativeName", {
      header: t("admin.partners.columns.representative"),
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <div className="pt-0.5">
            <IconWrapper color="blue">
              <User size={16} />
            </IconWrapper>
          </div>
          <div className="min-w-0">
            <TruncatedText
              text={row.original.representativeName}
              maxLength={18}
              className="font-medium text-foreground/80"
            />
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
              <Phone size={14} className="text-muted-foreground/70 flex-shrink-0" />
              <span>{row.original.representativePhone}</span>
            </div>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("address", {
      header: t("admin.partners.columns.address"),
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-muted-foreground/70 flex-shrink-0 mt-0.5" />
          <TruncatedText
            text={row.original.address || "Chưa cập nhật"}
            maxLength={30}
            className="text-sm text-muted-foreground"
          />
        </div>
      ),
    }),

    columnHelper.accessor("storeCount", {
      header: t("admin.partners.columns.stores"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconWrapper color="indigo">
            <Building2 size={16} />
          </IconWrapper>
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
            {row.original.storeCount || 0} cửa hàng
          </Badge>
        </div>
      ),
    }),

    columnHelper.accessor("status", {
      header: t("admin.partners.columns.status"),
      cell: ({ row }) => getStatusBadge(row.original.status, t),
    }),

    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => {
        const partner = row.original;
        return (
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
              className="w-44 bg-popover border border-border/50"
            >
              <DropdownMenuItem
                onClick={() => onViewDetail(partner.id)}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Xem chi tiết
              </DropdownMenuItem>
              {partner.status === PartnerStatus.PENDING && (
                <>
                  <DropdownMenuItem
                    onClick={() => onApprove(partner.id)}
                    className="cursor-pointer text-green-600 focus:text-green-600"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Phê duyệt
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onReject(partner.id)}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <XCircle size={16} className="mr-2" />
                    Từ chối
                  </DropdownMenuItem>
                </>
              )}
              {partner.status === PartnerStatus.APPROVED && (
                <DropdownMenuItem
                  onClick={() => onSuspend(partner.id)}
                  className="cursor-pointer text-amber-600 focus:text-amber-600"
                >
                  <AlertCircle size={16} className="mr-2" />
                  Đình chỉ
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={partners}
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
