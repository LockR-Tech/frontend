import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  PackageX,
  PowerOff,
  Tag,
  Percent,
  DollarSign,
} from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { DiscountType, PromotionStatus } from "~/types/admin/enums";
import type { PromotionResponse } from "~/types/admin/promotion";

interface PromotionTableProps {
  promotions: PromotionResponse[];
  isLoading: boolean;
  onEdit?: (promotion: PromotionResponse) => void;
  onDelete?: (id: number) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<PromotionResponse>();

const getStatusBadge = (
  status: PromotionStatus,
  t: (key: string) => string,
) => {
  const variants: Record<
    PromotionStatus,
    { bg: string; text: string; icon: React.ElementType; labelKey: string }
  > = {
    [PromotionStatus.ACTIVE]: {
      bg: "bg-green-50",
      text: "text-green-700",
      icon: CheckCircle2,
      labelKey: "admin.promotions.status.active",
    },
    [PromotionStatus.UPCOMING]: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: Clock,
      labelKey: "admin.promotions.status.upcoming",
    },
    [PromotionStatus.EXPIRED]: {
      bg: "bg-muted/30",
      text: "text-muted-foreground",
      icon: Calendar,
      labelKey: "admin.promotions.status.expired",
    },
    [PromotionStatus.DEPLETED]: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      icon: PackageX,
      labelKey: "admin.promotions.status.depleted",
    },
    [PromotionStatus.INACTIVE]: {
      bg: "bg-red-50",
      text: "text-red-600",
      icon: PowerOff,
      labelKey: "admin.promotions.status.inactive",
    },
  };

  const variant = variants[status] ?? variants[PromotionStatus.INACTIVE];
  const Icon = variant.icon;
  return (
    <Badge
      className={`${variant.bg} ${variant.text} border-0 font-medium text-xs`}
    >
      <Icon className="mr-1 h-3 w-3" />
      {t(variant.labelKey)}
    </Badge>
  );
};

const formatDiscount = (
  promotion: PromotionResponse,
  t: (key: string) => string,
) => {
  if (promotion.discountType === DiscountType.PERCENTAGE) {
    return (
      <div className="flex items-center gap-1 text-sm font-semibold text-blue-700">
        <Percent size={13} />
        {promotion.discountValue}%
        {promotion.maxDiscountAmount && (
          <span className="text-xs font-normal text-muted-foreground/70">
            (max {(promotion.maxDiscountAmount / 1000).toFixed(0)}K)
          </span>
        )}
      </div>
    );
  }
  if (promotion.discountType === DiscountType.FIXED_AMOUNT) {
    return (
      <div className="flex items-center gap-1 text-sm font-semibold text-green-700">
        <DollarSign size={13} />
        {(promotion.discountValue / 1000).toFixed(0)}K
      </div>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">
      {t("admin.promotions.discount.freeService")}
    </span>
  );
};

export function PromotionTable({
  promotions,
  isLoading,
  onEdit,
  onDelete,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: PromotionTableProps) {
  const { t } = useTranslation();
  const columns = [
    columnHelper.accessor("code", {
      header: t("admin.promotions.columns.code"),
      cell: (info) => (
        <div className="flex items-center gap-1.5">
          <Tag size={13} className="text-orange-500 shrink-0" />
          <span className="font-mono font-semibold text-xs text-foreground tracking-wide">
            {info.getValue()}
          </span>
        </div>
      ),
      size: 130,
    }),

    columnHelper.accessor("title", {
      header: t("admin.promotions.columns.title"),
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="max-w-48">
            <p className="font-medium text-sm text-foreground truncate">
              {info.getValue()}
            </p>
            {row.description && (
              <p className="text-xs text-muted-foreground/70 truncate">
                {row.description}
              </p>
            )}
          </div>
        );
      },
    }),

    columnHelper.accessor("discountValue", {
      header: t("admin.promotions.columns.discount"),
      cell: (info) => formatDiscount(info.row.original, t),
    }),

    columnHelper.accessor("minOrderAmount", {
      header: t("admin.promotions.columns.minOrder"),
      cell: (info) => {
        const val = info.getValue();
        return val ? (
          <span className="text-sm text-muted-foreground">
            {(val / 1000).toFixed(0)}K
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/70">
            {t("admin.promotions.discount.noLimit")}
          </span>
        );
      },
    }),

    columnHelper.accessor("startDate", {
      header: t("admin.promotions.columns.period"),
      cell: (info) => {
        const row = info.row.original;
        const start = new Date(row.startDate).toLocaleDateString("vi-VN");
        const end = new Date(row.endDate).toLocaleDateString("vi-VN");
        return (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>{start}</p>
            <p className="text-muted-foreground/70">→ {end}</p>
          </div>
        );
      },
    }),

    columnHelper.accessor("currentUsageCount", {
      header: t("admin.promotions.columns.usage"),
      cell: (info) => {
        const row = info.row.original;
        const current = info.getValue();
        const total = row.totalUsageLimit;
        const pct = total ? Math.min((current / total) * 100, 100) : null;
        return (
          <div className="space-y-1 min-w-20">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium">{current}</span>
              <span className="text-muted-foreground/70">/ {total ?? "∞"}</span>
            </div>
            {pct !== null && (
              <div className="h-1.5 w-full rounded-full bg-muted/50">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    pct >= 100
                      ? "bg-red-400"
                      : pct >= 80
                        ? "bg-orange-400"
                        : "bg-blue-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    }),

    columnHelper.accessor("status", {
      header: t("admin.promotions.columns.status"),
      cell: (info) => getStatusBadge(info.getValue(), t),
    }),

    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const row = info.row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(row)}
                  className="text-xs"
                >
                  <Pencil size={13} className="mr-2" />
                  {t("dropdown.edit")}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(row.id)}
                    className="text-xs text-red-600 focus:text-red-600"
                  >
                    <Trash2 size={13} className="mr-2" />
                    {t("dropdown.delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={promotions}
      isLoading={isLoading}
      emptyMessage={t("admin.promotions.emptyMessage")}
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
