import { useCallback, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { DataTable } from "~/components/shared/data-table";
import {
  DateRangeFilter,
  MetaBadge,
  ReportErrorState,
  refundStatusMeta,
  paymentMethodMeta,
} from "~/components/shared/reporting";
import { useGetAdminRefundsQuery } from "~/stores/apis/admin/payments";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency, formatNumber } from "~/lib/report-format";
import type { AdminRefund } from "~/types/admin/reporting";

const columnHelper = createColumnHelper<AdminRefund>();

/** Danh sách hoàn tiền của toàn hệ thống (`GET /api/admin/payments/refunds`, § 2.4). */
export function RefundTab() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [range, setRange] = useState({ from: "", to: "" });

  const { data, isLoading, isFetching, error, refetch } = useGetAdminRefundsQuery(
    useMemo(
      () => ({
        page,
        size: pageSize,
        sort: "requestedAt,desc",
        ...(range.from ? { from: range.from } : {}),
        ...(range.to ? { to: range.to } : {}),
      }),
      [page, pageSize, range],
    ),
  );

  const handleRangeChange = useCallback((next: { from: string; to: string }) => {
    setRange(next);
    setPage(0);
  }, []);

  const pageData = data?.data;
  const refunds = pageData?.content ?? [];

  const columns = [
    columnHelper.accessor("id", {
      header: "Phiếu hoàn",
      cell: ({ row }) => (
        <div>
          <p className="font-mono font-semibold text-sm">#{row.original.id}</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            GD #{row.original.paymentId}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("customer", {
      header: "Khách hàng",
      cell: ({ row }) => {
        const { customer, userId } = row.original;
        return (
          <div className="min-w-0">
            <p className="text-sm truncate">
              {customer?.fullName || "Chưa tra được tên khách"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer?.phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("orderId", {
      header: "Đơn hàng",
      cell: ({ row }) => {
        const { order, orderId } = row.original;
        if (!orderId) return <span className="text-xs">{EMPTY_VALUE}</span>;
        return (
          <button
            type="button"
            onClick={() => navigate(`/admin/orders/${orderId}`)}
            className="font-mono text-xs hover:underline"
          >
            {order?.orderCode ?? "Chưa tra được đơn"}
          </button>
        );
      },
    }),
    columnHelper.accessor("amount", {
      header: "Số tiền hoàn",
      cell: ({ row }) => (
        <div className="text-right">
          <p className="font-semibold text-sm">
            {formatCurrency(row.original.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            / {formatCurrency(row.original.paymentAmount)}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("paymentMethod", {
      header: "Phương thức gốc",
      cell: ({ row }) =>
        row.original.paymentMethod ? (
          <MetaBadge meta={paymentMethodMeta(row.original.paymentMethod)} hideIcon />
        ) : (
          <span className="text-xs text-muted-foreground">{EMPTY_VALUE}</span>
        ),
    }),
    columnHelper.accessor("status", {
      header: "Trạng thái",
      cell: ({ row }) => <MetaBadge meta={refundStatusMeta(row.original.status)} />,
    }),
    columnHelper.accessor("reason", {
      header: "Lý do",
      cell: ({ row }) => (
        <p className="text-xs text-foreground/80 max-w-[220px] truncate">
          {row.original.reason ?? EMPTY_VALUE}
        </p>
      ),
    }),
    columnHelper.accessor("requestedAt", {
      header: "Yêu cầu lúc",
      cell: ({ row }) => (
        <p className="font-mono text-xs whitespace-nowrap">
          {formatDateTime(row.original.requestedAt)}
        </p>
      ),
    }),
    columnHelper.accessor("processedAt", {
      header: "Xử lý lúc",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <p className="font-mono text-xs">
            {row.original.processedAt
              ? formatDateTime(row.original.processedAt)
              : EMPTY_VALUE}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {row.original.processedBy?.fullName ??
              (row.original.processedByUserId ? "Chưa tra được tên" : "")}
          </p>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-3">
      <DateRangeFilter value={range} onChange={handleRangeChange} allowEmpty />
      <p className="text-[11px] text-muted-foreground">
        Khoảng ngày lọc theo thời điểm yêu cầu hoàn.{" "}
        {isFetching
          ? "Đang tải…"
          : `${formatNumber(pageData?.totalElements ?? 0)} phiếu hoàn.`}
      </p>

      {error && <ReportErrorState error={error} onRetry={refetch} />}

      <DataTable
        columns={columns}
        data={refunds}
        isLoading={isLoading}
        emptyMessage="Chưa có phiếu hoàn tiền nào"
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
    </div>
  );
}
