import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createColumnHelper } from "@tanstack/react-table";
import { Calendar, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/shared/data-table";
import {
  MetaBadge,
  ReportErrorState,
  orderStatusMeta,
  orderTypeMeta,
} from "~/components/shared/reporting";
import {
  orderManagementApi,
  useSearchAdminOrdersQuery,
} from "~/stores/apis/admin/orders";
import type { AppDispatch } from "~/stores/store";
import { formatDateTime, formatTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency, formatDayLabel, formatNumber } from "~/lib/report-format";
import type { AdminOrder } from "~/types/admin/reporting";

/** Đơn sau một con số trên Dashboard: cùng điều kiện với số đó nên tổng dòng khớp số trên thẻ. */
export interface DashboardOrdersTarget {
  title: string;
  /** Trạng thái đơn; rỗng = mọi trạng thái. */
  status?: string[];
  /** Ngày tạo đơn yyyy-MM-dd (giờ Việt Nam, gồm hai đầu); rỗng = mọi lúc. */
  from?: string;
  to?: string;
  /** Chỉ đơn tạo trong giờ này (0–23, giờ Việt Nam) — biểu đồ khung giờ cao điểm. */
  hour?: number;
}

const PAGE_SIZE_MAX = 100;
const column = createColumnHelper<AdminOrder>();

function orderDetailPath(order: Pick<AdminOrder, "id" | "type">) {
  return order.type === "DRONE_DELIVERY" ? `/admin/drone-orders/${order.id}` : `/admin/orders/${order.id}`;
}

function hourOf(createdAt: AdminOrder["createdAt"]) {
  const time = formatTime(createdAt);
  return time === EMPTY_VALUE ? -1 : Number(time.slice(0, 2));
}

/**
 * Lọc theo giờ không có ở API tìm đơn nên tải hết đơn trong khoảng ngày (tối đa 30 ngày của biểu đồ
 * giờ cao điểm) rồi lọc ở đây, cùng cách đổi sang giờ Việt Nam như báo cáo.
 */
function useOrdersInHour(target: DashboardOrdersTarget | null) {
  const dispatch = useDispatch<AppDispatch>();
  const [state, setState] = useState<{ rows: AdminOrder[]; loading: boolean; error?: unknown }>({
    rows: [],
    loading: false,
  });
  const [attempt, setAttempt] = useState(0);
  const hour = target?.hour;

  useEffect(() => {
    if (!target || hour === undefined) return;
    let cancelled = false;
    setState({ rows: [], loading: true });
    (async () => {
      const all: AdminOrder[] = [];
      try {
        for (let page = 0; ; page++) {
          const request = dispatch(
            orderManagementApi.endpoints.searchAdminOrders.initiate({
              page,
              size: PAGE_SIZE_MAX,
              status: target.status,
              from: target.from,
              to: target.to,
              sort: "createdAt,desc",
            }),
          );
          const result = await request.unwrap();
          request.unsubscribe();
          all.push(...(result.data?.content ?? []));
          if (page + 1 >= (result.data?.totalPages ?? 0)) break;
        }
        if (!cancelled) {
          setState({ rows: all.filter((o) => hourOf(o.createdAt) === hour), loading: false });
        }
      } catch (error) {
        if (!cancelled) setState({ rows: [], loading: false, error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, target, hour, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

export function DashboardOrdersModal({
  target,
  onClose,
}: {
  target: DashboardOrdersTarget | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [target]);

  const byHour = target?.hour !== undefined;
  const server = useSearchAdminOrdersQuery(
    {
      page,
      size: pageSize,
      status: target?.status,
      from: target?.from,
      to: target?.to,
      sort: "createdAt,desc",
    },
    { skip: !target || byHour },
  );
  const inHour = useOrdersInHour(byHour ? target : null);

  const rows = byHour
    ? inHour.rows.slice(page * pageSize, (page + 1) * pageSize)
    : (server.data?.data?.content ?? []);
  const totalRows = byHour ? inHour.rows.length : (server.data?.data?.totalElements ?? 0);
  const pageCount = byHour
    ? Math.max(1, Math.ceil(inHour.rows.length / pageSize))
    : (server.data?.data?.totalPages ?? 0);
  const isLoading = byHour ? inHour.loading : server.isFetching;
  const error = byHour ? inHour.error : server.error;

  const open = (order: AdminOrder) => {
    onClose();
    navigate(orderDetailPath(order));
  };

  const openOrdersPage = () => {
    if (!target) return;
    const params = new URLSearchParams();
    if (target.status?.length) params.set("status", target.status.join(","));
    if (target.from) params.set("from", target.from);
    if (target.to) params.set("to", target.to);
    onClose();
    navigate(`/admin/orders${params.size ? `?${params}` : ""}`);
  };

  const columns = useMemo(
    () => [
      column.accessor("orderCode", {
        header: t("common.order"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-mono font-semibold text-xs text-foreground truncate">
              {row.original.orderCode ?? t("admin.orders.noCode")}
            </p>
            <p className="text-[10px] text-muted-foreground">ID #{row.original.id}</p>
          </div>
        ),
      }),
      column.accessor("customer", {
        header: t("common.customer"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {row.original.customer?.fullName || EMPTY_VALUE}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {row.original.customer?.phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        ),
      }),
      column.accessor("type", {
        header: t("admin.orders.fields.kind"),
        cell: ({ row }) => <MetaBadge meta={orderTypeMeta(row.original.type)} hideIcon />,
      }),
      column.accessor("status", {
        header: t("common.status"),
        cell: ({ row }) => <MetaBadge meta={orderStatusMeta(row.original.status)} hideIcon />,
      }),
      column.accessor("totalPrice", {
        header: t("admin.payments.amount"),
        cell: ({ row }) => (
          <span className="font-semibold text-xs">{formatCurrency(row.original.totalPrice)}</span>
        ),
      }),
      column.accessor("createdAt", {
        header: t("admin.dashboard.drilldown.createdAt"),
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      }),
    ],
    [t],
  );

  const period =
    target?.from && target?.to
      ? target.from === target.to
        ? formatDayLabel(target.from)
        : `${formatDayLabel(target.from)} – ${formatDayLabel(target.to)}`
      : t("admin.dashboard.drilldown.allTime");

  return (
    <Dialog open={!!target} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 space-y-1.5 border-b pb-4">
          <DialogTitle className="text-base sm:text-lg font-bold">{target?.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-muted px-2 py-0.5 rounded">
              <Calendar className="w-3 h-3" />
              {period}
              {byHour && ` · ${String(target?.hour).padStart(2, "0")}:00–${String(target?.hour).padStart(2, "0")}:59`}
            </span>
            <span>{t("admin.dashboard.drilldown.orderCount", { total: formatNumber(totalRows) })}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {error ? (
            <ReportErrorState
              error={error as Parameters<typeof ReportErrorState>[0]["error"]}
              onRetry={byHour ? inHour.retry : server.refetch}
            />
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              isLoading={isLoading}
              onRowClick={open}
              emptyMessage={t("admin.dashboard.drilldown.noOrders")}
              serverPagination={{
                pageIndex: page,
                pageSize,
                pageCount,
                totalRows,
                onPageChange: setPage,
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPage(0);
                },
              }}
            />
          )}
        </div>

        {!byHour && (
          <DialogFooter className="shrink-0 border-t pt-3">
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openOrdersPage}>
              <ExternalLink className="h-3.5 w-3.5" />
              {t("admin.dashboard.drilldown.openOrdersPage")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
