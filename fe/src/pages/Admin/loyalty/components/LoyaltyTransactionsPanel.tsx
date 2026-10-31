import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "~/components/shared/data-table";
import { DateRangeFilter, MetaBadge, orderTypeMeta, type DateRangeValue } from "~/components/shared/reporting";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useGetLoyaltyTransactionsQuery } from "~/stores/apis/admin";
import { formatDateTime } from "~/lib/datetime";
import { TX_LABEL_KEY } from "~/pages/Admin/users/components/UserLoyaltySection";
import type { LoyaltyTransactionRow, LoyaltyTransactionScope } from "~/types/admin/loyalty";
import { FilterChip, UserCell, fmtNum, type UserInfo } from "./loyalty-shared";

const SCOPES: { value: LoyaltyTransactionScope; labelKey: string }[] = [
  { value: "ALL", labelKey: "common.all" },
  { value: "ISSUED", labelKey: "admin.loyalty.list.plusPoints" },
  { value: "REDEEMED", labelKey: "admin.loyalty.list.minusPoints" },
];

const ALL_ORDER_TYPES = "ALL";
// Khớp RevenueReportService.serviceType.
const ORDER_TYPES = ["SEND", "RENTAL", "DRONE_DELIVERY", "STORAGE"];

function orderPath(row: LoyaltyTransactionRow) {
  return row.orderType === "DRONE_DELIVERY" ? `/admin/drone-orders/${row.orderId}` : `/admin/orders/${row.orderId}`;
}

interface LoyaltyTransactionsPanelProps {
  /** Chỉ giao dịch của một thành viên; không truyền = mọi thành viên. */
  userId?: number;
  initialScope?: LoyaltyTransactionScope;
  initialRange?: DateRangeValue;
  userById: Map<number, UserInfo>;
}

/** Từng giao dịch cộng/trừ điểm kèm đơn hoặc voucher tạo ra nó, lọc theo ngày, loại đơn và chiều +/−. */
export function LoyaltyTransactionsPanel({
  userId,
  initialScope = "ALL",
  initialRange = { from: "", to: "" },
  userById,
}: LoyaltyTransactionsPanelProps) {
  const { t } = useTranslation();
  const [scope, setScope] = useState(initialScope);
  const [range, setRange] = useState<DateRangeValue>(initialRange);
  const [orderType, setOrderType] = useState(ALL_ORDER_TYPES);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useGetLoyaltyTransactionsQuery({
    scope,
    userId,
    from: range.from || undefined,
    to: range.to || undefined,
    orderType: orderType === ALL_ORDER_TYPES ? undefined : orderType,
    page,
    size: pageSize,
  });
  const result = data?.data;

  const column = createColumnHelper<LoyaltyTransactionRow>();
  const columns = [
    column.accessor("createdAt", {
      header: t("admin.loyalty.list.time"),
      cell: ({ row }) => <span className="whitespace-nowrap text-xs">{formatDateTime(row.original.createdAt)}</span>,
    }),
    ...(userId === undefined
      ? [
          column.accessor("userId", {
            header: t("admin.loyalty.list.member"),
            cell: ({ row }) => <UserCell userId={row.original.userId} user={userById.get(row.original.userId)} />,
          }),
        ]
      : []),
    column.accessor("type", {
      header: t("admin.loyalty.list.source"),
      cell: ({ row }) => (TX_LABEL_KEY[row.original.type] ? t(TX_LABEL_KEY[row.original.type]) : row.original.type),
    }),
    column.accessor("orderCode", {
      header: t("common.order"),
      cell: ({ row }) => {
        const item = row.original;
        if (item.orderId) {
          return (
            <Link to={orderPath(item)} className="font-mono text-xs font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400">
              {item.orderCode ?? `#${item.orderId}`}
            </Link>
          );
        }
        return item.reference ? (
          <span className="font-mono text-xs text-muted-foreground">{item.reference}</span>
        ) : (
          "—"
        );
      },
    }),
    column.accessor("orderType", {
      header: t("admin.orders.fields.kind"),
      cell: ({ row }) =>
        row.original.orderType ? <MetaBadge meta={orderTypeMeta(row.original.orderType)} hideIcon /> : "—",
    }),
    column.accessor("points", {
      header: t("admin.loyalty.list.points"),
      cell: ({ row }) => (
        <span className={`font-semibold ${row.original.points < 0 ? "text-rose-600" : "text-emerald-600"}`}>
          {row.original.points > 0 ? "+" : ""}
          {fmtNum(row.original.points)}
        </span>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <DateRangeFilter
        value={range}
        allowEmpty
        onChange={(next) => {
          setRange(next);
          setPage(0);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        {SCOPES.map(({ value, labelKey }) => (
          <FilterChip
            key={value}
            active={scope === value}
            label={t(labelKey)}
            onClick={() => {
              setScope(value);
              setPage(0);
            }}
          />
        ))}
        <Select
          value={orderType}
          onValueChange={(value) => {
            setOrderType(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ORDER_TYPES}>{t("admin.loyalty.list.allOrderTypes")}</SelectItem>
            {ORDER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {orderTypeMeta(type).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("admin.loyalty.list.transactionsSummary", {
          count: result?.totalElements ?? 0,
          points: fmtNum(result?.totalPoints),
        })}
      </p>

      <div className={`grid gap-4 ${userId === undefined ? "lg:grid-cols-2" : ""}`}>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t("admin.loyalty.list.bySource")}</p>
          {(result?.byType ?? []).map((row) => (
            <div key={row.type} className="flex items-center justify-between gap-3 border-b border-border/20 py-1.5 text-sm last:border-0">
              <span>{TX_LABEL_KEY[row.type] ? t(TX_LABEL_KEY[row.type]) : row.type}</span>
              <span className="text-muted-foreground">
                {t("admin.loyalty.list.transactionCount", { count: row.transactions })} ·{" "}
                <span className="font-semibold text-foreground">{fmtNum(row.points)}</span>
              </span>
            </div>
          ))}
        </div>
        {userId === undefined && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t("admin.loyalty.list.byMember")}</p>
            <div className="max-h-56 overflow-y-auto pr-1">
              {(result?.topUsers ?? []).map((row) => (
                <div key={row.userId} className="flex items-center justify-between gap-3 border-b border-border/20 py-1.5 text-sm last:border-0">
                  <UserCell userId={row.userId} user={userById.get(row.userId)} />
                  <span className="shrink-0 font-semibold">{fmtNum(row.points)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DataTable
        columns={columns as never}
        data={result?.content ?? []}
        isLoading={isLoading}
        emptyMessage={t("common.noData")}
        serverPagination={{
          pageIndex: page,
          pageSize,
          pageCount: Math.max(1, result?.totalPages ?? 1),
          totalRows: result?.totalElements ?? 0,
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
