import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowDownUp, ExternalLink, Eye, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DataTable } from "~/components/shared/data-table";
import { ReportErrorState } from "~/components/shared/reporting";
import { useGetRevenueByCustomerQuery } from "~/stores/apis/admin/revenue";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency, formatNumber } from "~/lib/report-format";
import type { DateRangeValue } from "~/components/shared/reporting";
import type { CustomerRevenue } from "~/types/admin/reporting";
import type { RevenueOrdersTarget } from "./RevenueOrdersModal";

interface CustomerRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
  onViewOrders?: (target: RevenueOrdersTarget) => void;
}

const columnHelper = createColumnHelper<CustomerRevenue>();

/** Các trường backend cho phép sắp xếp (§ 3.8). */
const SORT_OPTIONS = [
  { value: "totalSpent,desc", labelKey: "admin.revenue.customer.sort.totalSpent" },
  { value: "netSpent,desc", labelKey: "admin.revenue.customer.sort.netSpent" },
  { value: "orderCount,desc", labelKey: "admin.revenue.customer.sort.orderCount" },
  { value: "paidOrderCount,desc", labelKey: "admin.revenue.customer.sort.paidOrderCount" },
  { value: "averageOrderValue,desc", labelKey: "admin.revenue.customer.sort.aov" },
  { value: "lastOrderAt,desc", labelKey: "admin.revenue.customer.sort.lastOrder" },
  { value: "lastPaidAt,desc", labelKey: "admin.revenue.customer.sort.lastPaid" },
];

/**
 * Bảng khách hàng theo doanh thu (§ 3.8). Một khách có mặt nếu tạo đơn trong kỳ
 * HOẶC có lần thu tiền trong kỳ — nên `orderCount` có thể bằng 0 mà vẫn có tiền.
 */
export function CustomerRevenueTab({
  range,
  skip,
  onViewOrders,
}: CustomerRevenueTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState("totalSpent,desc");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (searchDraft === search) return;
    const timer = setTimeout(() => {
      setSearch(searchDraft);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchDraft, search]);

  // Đổi khoảng ngày thì quay lại trang đầu, tránh đứng ở trang trống.
  useEffect(() => {
    setPage(0);
  }, [range.from, range.to]);

  const { data, isLoading, isFetching, error, refetch } =
    useGetRevenueByCustomerQuery(
      useMemo(
        () => ({
          ...range,
          page,
          size: pageSize,
          sort,
          ...(search.trim() ? { q: search.trim() } : {}),
        }),
        [range, page, pageSize, sort, search],
      ),
      { skip },
    );

  const pageData = data?.data;

  const openCustomer = (userId: number) =>
    navigate(`/admin/revenue/${userId}?from=${range.from}&to=${range.to}`);

  const columns = [
    columnHelper.accessor("fullName", {
      header: t("common.customer"),
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <button
            type="button"
            onClick={() => openCustomer(customer.userId)}
            className="text-left min-w-0 hover:underline"
          >
            <p className="text-sm font-medium truncate">
              {customer.fullName || t("admin.orders.lookup.customerName")}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer.phoneNumber || customer.email || EMPTY_VALUE}
            </p>
          </button>
        );
      },
    }),
    columnHelper.accessor("totalSpent", {
      header: t("admin.revenue.customer.columns.spent"),
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.totalSpent)}</span>
      ),
    }),
    columnHelper.accessor("refundAmount", {
      header: t("admin.payments.refunds"),
      cell: ({ row }) => formatCurrency(row.original.refundAmount),
    }),
    columnHelper.accessor("netSpent", {
      header: t("admin.revenue.customer.columns.netSpent"),
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.netSpent)}</span>
      ),
    }),
    columnHelper.accessor("averageOrderValue", {
      header: t("admin.revenue.customer.columns.aov"),
      cell: ({ row }) => formatCurrency(row.original.averageOrderValue),
    }),
    columnHelper.accessor("orderCount", {
      header: t("admin.revenue.columns.newOrders"),
      cell: ({ row }) => formatNumber(row.original.orderCount),
    }),
    columnHelper.accessor("paidOrderCount", {
      header: t("admin.revenue.customer.columns.paidOrders"),
      cell: ({ row }) => formatNumber(row.original.paidOrderCount),
    }),
    columnHelper.accessor("lastOrderAt", {
      header: t("admin.revenue.customer.columns.lastOrder"),
      cell: ({ row }) => (
        <p className="font-mono text-xs whitespace-nowrap">
          {row.original.lastOrderAt
            ? formatDateTime(row.original.lastOrderAt)
            : EMPTY_VALUE}
        </p>
      ),
    }),
    columnHelper.accessor("lastPaidAt", {
      header: t("admin.revenue.customer.columns.lastPaid"),
      cell: ({ row }) => (
        <p className="font-mono text-xs whitespace-nowrap text-muted-foreground">
          {row.original.lastPaidAt
            ? formatDateTime(row.original.lastPaidAt)
            : EMPTY_VALUE}
        </p>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => (
        <span className="text-right block">
          {t("admin.revenue.actions.header", "Hành động")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
              disabled={item.paidOrderCount === 0 && item.orderCount === 0}
              onClick={() =>
                onViewOrders?.({
                  type: "CUSTOMER",
                  userId: item.userId,
                  label: item.fullName || t("admin.orders.lookup.customerName"),
                  paidOrderCount: item.paidOrderCount,
                })
              }
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{t("admin.revenue.actions.viewOrders", "Xem đơn")}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => openCustomer(item.userId)}
              title={t("button.detail")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={t("admin.revenue.customer.searchPlaceholder")}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="h-9 w-[220px]">
            <ArrowDownUp className="h-3.5 w-3.5 opacity-60 shrink-0" />
            <SelectValue placeholder={t("common.sort")} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground ml-auto">
          {isFetching
            ? t("common.loadingEllipsis")
            : t("admin.revenue.customer.count", {
                total: formatNumber(pageData?.totalElements ?? 0),
              })}
        </p>
      </div>

      {error && <ReportErrorState error={error} onRetry={refetch} />}

      <DataTable
        columns={columns}
        data={pageData?.content ?? []}
        isLoading={isLoading}
        emptyMessage={t("admin.revenue.customer.empty")}
        serverPagination={{
          pageIndex: page,
          pageSize,
          pageCount: pageData?.totalPages ?? 0,
          totalRows: pageData?.totalElements ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(0);
          },
        }}
      />

      <p className="text-[11px] text-muted-foreground">
        {t("admin.revenue.customer.note")}
      </p>
    </div>
  );
}
