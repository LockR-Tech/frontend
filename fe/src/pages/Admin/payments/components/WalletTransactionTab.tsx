import { useCallback, useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { DataTable } from "~/components/shared/data-table";
import {
  DateRangeFilter,
  MetaBadge,
  MultiSelectFilter,
  ReportErrorState,
  walletSourceMeta,
  walletTypeMeta,
} from "~/components/shared/reporting";
import { useGetAdminWalletTransactionsQuery } from "~/stores/apis/admin/payments";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency, formatNumber } from "~/lib/report-format";
import type { AdminWalletTransaction } from "~/types/admin/reporting";

const columnHelper = createColumnHelper<AdminWalletTransaction>();

const TYPE_OPTIONS = (["CREDIT", "DEBIT"] as const).map((value) => ({
  value,
  label: walletTypeMeta(value).label,
}));

const SOURCE_OPTIONS = (
  ["TOPUP", "ORDER_PAYMENT", "REFUND", "ADJUST"] as const
).map((value) => ({ value, label: walletSourceMeta(value).label }));

/** Biến động ví của mọi khách (`GET /api/admin/payments/wallet-transactions`, § 2.5). */
export function WalletTransactionTab() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [range, setRange] = useState({ from: "", to: "" });
  const [types, setTypes] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
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

  const { data, isLoading, isFetching, error, refetch } =
    useGetAdminWalletTransactionsQuery(
      useMemo(
        () => ({
          page,
          size: pageSize,
          sort: "createdAt,desc",
          ...(types.length ? { type: types } : {}),
          ...(sources.length ? { source: sources } : {}),
          ...(range.from ? { from: range.from } : {}),
          ...(range.to ? { to: range.to } : {}),
          ...(search.trim() ? { q: search.trim() } : {}),
        }),
        [page, pageSize, types, sources, range, search],
      ),
    );

  const handleRangeChange = useCallback((next: { from: string; to: string }) => {
    setRange(next);
    setPage(0);
  }, []);

  const pageData = data?.data;
  const transactions = pageData?.content ?? [];

  const columns = [
    columnHelper.accessor("id", {
      header: "Biến động",
      cell: ({ row }) => (
        <div>
          <p className="font-mono font-semibold text-sm">#{row.original.id}</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            Ví #{row.original.walletId ?? "?"}
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
              {customer?.fullName || (userId ? `Khách #${userId}` : EMPTY_VALUE)}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer?.phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("type", {
      header: "Chiều",
      cell: ({ row }) => <MetaBadge meta={walletTypeMeta(row.original.type)} hideIcon />,
    }),
    columnHelper.accessor("source", {
      header: "Nguồn",
      cell: ({ row }) => <MetaBadge meta={walletSourceMeta(row.original.source)} hideIcon />,
    }),
    columnHelper.accessor("amount", {
      header: "Số tiền",
      cell: ({ row }) => {
        const isCredit = row.original.type === "CREDIT";
        return (
          <div className="text-right">
            <p
              className={`font-semibold text-sm ${
                isCredit
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isCredit ? "+" : "−"} {formatCurrency(row.original.amount)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Số dư {formatCurrency(row.original.balanceAfter)}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("relatedOrderId", {
      header: "Đơn liên quan",
      cell: ({ row }) => {
        // Backend chỉ gán đơn cho biến động nguồn ORDER_PAYMENT.
        const orderId = row.original.relatedOrderId;
        if (!orderId) return <span className="text-xs">{EMPTY_VALUE}</span>;
        return (
          <button
            type="button"
            onClick={() => navigate(`/admin/orders/${orderId}`)}
            className="font-mono text-xs hover:underline"
          >
            #{orderId}
          </button>
        );
      },
    }),
    columnHelper.accessor("referenceId", {
      header: "Tham chiếu",
      cell: ({ row }) => (
        <p className="font-mono text-[11px] text-muted-foreground max-w-[200px] truncate">
          {row.original.referenceId ?? EMPTY_VALUE}
        </p>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Thời điểm",
      cell: ({ row }) => (
        <p className="font-mono text-xs whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </p>
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
            placeholder="Mã tham chiếu hoặc nội dung…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <MultiSelectFilter
          label="Chiều"
          options={TYPE_OPTIONS}
          value={types}
          onChange={(value) => {
            setTypes(value);
            setPage(0);
          }}
        />
        <MultiSelectFilter
          label="Nguồn"
          options={SOURCE_OPTIONS}
          value={sources}
          onChange={(value) => {
            setSources(value);
            setPage(0);
          }}
        />
      </div>

      <DateRangeFilter value={range} onChange={handleRangeChange} allowEmpty />
      <p className="text-[11px] text-muted-foreground">
        {isFetching
          ? "Đang tải…"
          : `${formatNumber(pageData?.totalElements ?? 0)} biến động ví.`}
      </p>

      {error && <ReportErrorState error={error} onRetry={refetch} />}

      <DataTable
        columns={columns}
        data={transactions}
        isLoading={isLoading}
        emptyMessage="Không có biến động ví nào khớp bộ lọc"
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
