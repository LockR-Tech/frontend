import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { ArrowDownUp, Eye, Search } from "lucide-react";
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

interface CustomerRevenueTabProps {
  range: DateRangeValue;
  skip: boolean;
}

const columnHelper = createColumnHelper<CustomerRevenue>();

/** Các trường backend cho phép sắp xếp (§ 3.8). */
const SORT_OPTIONS = [
  { value: "totalSpent,desc", label: "Chi nhiều nhất" },
  { value: "netSpent,desc", label: "Thực chi nhiều nhất" },
  { value: "orderCount,desc", label: "Nhiều đơn nhất" },
  { value: "paidOrderCount,desc", label: "Nhiều đơn đã trả nhất" },
  { value: "averageOrderValue,desc", label: "Giá trị đơn trung bình cao" },
  { value: "lastOrderAt,desc", label: "Đặt đơn gần đây" },
  { value: "lastPaidAt,desc", label: "Thanh toán gần đây" },
];

/**
 * Bảng khách hàng theo doanh thu (§ 3.8). Một khách có mặt nếu tạo đơn trong kỳ
 * HOẶC có lần thu tiền trong kỳ — nên `orderCount` có thể bằng 0 mà vẫn có tiền.
 */
export function CustomerRevenueTab({ range, skip }: CustomerRevenueTabProps) {
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
      header: "Khách hàng",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <button
            type="button"
            onClick={() => openCustomer(customer.userId)}
            className="text-left min-w-0 hover:underline"
          >
            <p className="text-sm font-medium truncate">
              {customer.fullName || "Chưa tra được tên khách"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer.phoneNumber || customer.email || EMPTY_VALUE}
            </p>
          </button>
        );
      },
    }),
    columnHelper.accessor("totalSpent", {
      header: "Đã chi",
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.totalSpent)}</span>
      ),
    }),
    columnHelper.accessor("refundAmount", {
      header: "Hoàn tiền",
      cell: ({ row }) => formatCurrency(row.original.refundAmount),
    }),
    columnHelper.accessor("netSpent", {
      header: "Thực chi",
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.netSpent)}</span>
      ),
    }),
    columnHelper.accessor("averageOrderValue", {
      header: "Giá trị đơn TB",
      cell: ({ row }) => formatCurrency(row.original.averageOrderValue),
    }),
    columnHelper.accessor("orderCount", {
      header: "Đơn tạo mới",
      cell: ({ row }) => formatNumber(row.original.orderCount),
    }),
    columnHelper.accessor("paidOrderCount", {
      header: "Đơn đã trả",
      cell: ({ row }) => formatNumber(row.original.paidOrderCount),
    }),
    columnHelper.accessor("lastOrderAt", {
      header: "Đơn gần nhất",
      cell: ({ row }) => (
        <p className="font-mono text-xs whitespace-nowrap">
          {row.original.lastOrderAt
            ? formatDateTime(row.original.lastOrderAt)
            : EMPTY_VALUE}
        </p>
      ),
    }),
    columnHelper.accessor("lastPaidAt", {
      header: "Thu gần nhất",
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
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => openCustomer(row.original.userId)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Chi tiết
        </Button>
      ),
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
            placeholder="Tên, email, số điện thoại hoặc mã khách…"
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
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground ml-auto">
          {isFetching
            ? "Đang tải…"
            : `${formatNumber(pageData?.totalElements ?? 0)} khách trong kỳ`}
        </p>
      </div>

      {error && <ReportErrorState error={error} onRetry={refetch} />}

      <DataTable
        columns={columns}
        data={pageData?.content ?? []}
        isLoading={isLoading}
        emptyMessage="Chưa có khách hàng nào phát sinh trong khoảng đã chọn"
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
        Khách có mặt nếu tạo đơn trong kỳ hoặc có lần thu tiền trong kỳ, nên số đơn tạo
        mới có thể bằng 0 mà vẫn ghi nhận tiền.
      </p>
    </div>
  );
}
