import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/shared/data-table";
import {
  MetaBadge,
  ReportErrorState,
  orderPaymentStatusMeta,
  orderStatusMeta,
  orderTypeMeta,
  paymentKindMeta,
  paymentMethodMeta,
  paymentStatusMeta,
  refundStatusMeta,
  walletSourceMeta,
  walletTypeMeta,
} from "~/components/shared/reporting";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { useGetAllFeedbackQuery } from "~/stores/apis/admin/feedbackApi";
import { useGetAssistantConversationsQuery } from "~/stores/apis/admin/knowledge";
import { useGetAllAdminReportsQuery } from "~/stores/apis/admin/lockerOps";
import { useGetAllNotificationsQuery } from "~/stores/apis/admin/notifications";
import { useSearchAdminOrdersQuery } from "~/stores/apis/admin/orders";
import {
  useGetAdminRefundsQuery,
  useGetAdminWalletTransactionsQuery,
  useSearchAdminPaymentsQuery,
} from "~/stores/apis/admin/payments";
import { extractList } from "~/lib/extract-list";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency } from "~/lib/report-format";
import type { AdminNotificationResponse } from "~/types";
import type {
  AdminOrder,
  AdminPayment,
  AdminRefund,
  AdminWalletTransaction,
} from "~/types/admin/reporting";
import type { FeedbackDTO } from "~/types/admin/feedback";
import type { AssistantConversationView } from "~/stores/apis/admin/knowledge";
import type { LockerReportResponse } from "~/stores/apis/admin/lockerOps";
import { ConversationDetailSheet } from "../../knowledge/ConversationDetailSheet";
import { PaymentDetailModal } from "../../payments/components/PaymentDetailModal";
import { UserLoyaltySection } from "./UserLoyaltySection";

const PAGE_SIZE = 10;
const NEWEST_FIRST = "createdAt,desc";
const TAB_IDS = [
  "orders",
  "received",
  "payments",
  "refunds",
  "wallet",
  "loyalty",
  "feedback",
  "reports",
  "notifications",
  "assistant",
] as const;
type TabId = (typeof TAB_IDS)[number];

// Trạng thái lạ hiện nguyên mã.
const REPORT_STATUS_KEY: Record<string, string> = {
  OPEN: "admin.maintenance.status.openAwaitingTech",
  IN_PROGRESS: "admin.maintenance.status.inProgress",
  RESOLVED: "admin.maintenance.status.resolved",
  REJECTED: "admin.maintenance.status.rejected",
};

const LINK_CLASS ="font-mono text-xs font-medium text-primary hover:underline";

function Time({ value }: { value: string | null | undefined }) {
  return <span className="text-xs text-muted-foreground whitespace-nowrap">{value ? formatDateTime(value) : "—"}</span>;
}

function OrderLink({ id, code }: { id: number | null | undefined; code?: string | null }) {
  if (!id) return <span className="text-muted-foreground">—</span>;
  return (
    <Link to={`/admin/orders/${id}`} className={LINK_CLASS}>
      {code || `#${id}`}
    </Link>
  );
}

function usePaging() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(PAGE_SIZE);
  return {
    page,
    size,
    pagination: (total: number, pages: number) => ({
      pageIndex: page,
      pageSize: size,
      pageCount: Math.max(1, pages),
      totalRows: total,
      onPageChange: setPage,
      onPageSizeChange: (next: number) => {
        setSize(next);
        setPage(0);
      },
    }),
  };
}

/** Lỗi của từng tab hiện ngay trong tab đó, không kéo đổ cả trang chi tiết. */
function Panel({
  error,
  onRetry,
  children,
}: {
  error: unknown;
  onRetry: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  if (error) {
    return (
      <ReportErrorState
        error={error as Parameters<typeof ReportErrorState>[0]["error"]}
        onRetry={onRetry}
        title={t("admin.users.activity.loadFailed")}
      />
    );
  }
  return <>{children}</>;
}

function OrdersPanel({ userId, received }: { userId: number; received?: boolean }) {
  const { t } = useTranslation();
  const { page, size, pagination } = usePaging();
  const { data, isLoading, error, refetch } = useSearchAdminOrdersQuery({
    page,
    size,
    sort: NEWEST_FIRST,
    ...(received ? { receiverUserId: userId } : { userId }),
  });
  const result = data?.data;

  const columns = useMemo<ColumnDef<AdminOrder>[]>(
    () => [
      {
        id: "code",
        header: t("admin.users.activity.orderCode"),
        cell: ({ row }) => <OrderLink id={row.original.id} code={row.original.orderCode} />,
      },
      {
        id: "type",
        header: t("admin.users.activity.type"),
        cell: ({ row }) => <MetaBadge meta={orderTypeMeta(row.original.type)} hideIcon />,
      },
      {
        id: "status",
        header: t("common.status"),
        cell: ({ row }) => <MetaBadge meta={orderStatusMeta(row.original.status)} hideIcon />,
      },
      {
        id: "payment",
        header: t("admin.users.activity.paymentStatus"),
        cell: ({ row }) => <MetaBadge meta={orderPaymentStatusMeta(row.original.paymentStatus)} hideIcon />,
      },
      {
        id: "total",
        header: t("admin.users.activity.amount"),
        cell: ({ row }) => formatCurrency(row.original.totalPrice),
      },
      {
        id: "createdAt",
        header: t("common.createdAt"),
        cell: ({ row }) => <Time value={row.original.createdAt} />,
      },
    ],
    [t],
  );

  return (
    <Panel error={error} onRetry={refetch}>
      <DataTable
        columns={columns}
        data={result?.content ?? []}
        isLoading={isLoading}
        emptyMessage={t(received ? "admin.users.activity.emptyReceived" : "admin.users.activity.emptyOrders")}
        serverPagination={pagination(result?.totalElements ?? 0, result?.totalPages ?? 1)}
      />
    </Panel>
  );
}

function PaymentsPanel({ userId, onOpenPayment }: { userId: number; onOpenPayment: (id: number) => void }) {
  const { t } = useTranslation();
  const { page, size, pagination } = usePaging();
  const { data, isLoading, error, refetch } = useSearchAdminPaymentsQuery({
    page,
    size,
    userId,
    includeTopups: true,
    sort: NEWEST_FIRST,
  });
  const result = data?.data;

  const columns = useMemo<ColumnDef<AdminPayment>[]>(
    () => [
      {
        id: "code",
        header: t("admin.users.activity.paymentCode"),
        cell: ({ row }) => (
          <button type="button" className={LINK_CLASS} onClick={() => onOpenPayment(row.original.id)}>
            {row.original.referenceId || `#${row.original.id}`}
          </button>
        ),
      },
      {
        id: "order",
        header: t("common.order"),
        cell: ({ row }) => (
          <OrderLink id={row.original.order?.id ?? row.original.orderId} code={row.original.order?.orderCode} />
        ),
      },
      {
        id: "kind",
        header: t("admin.users.activity.type"),
        cell: ({ row }) => <MetaBadge meta={paymentKindMeta(row.original.kind)} hideIcon />,
      },
      {
        id: "method",
        header: t("admin.users.activity.method"),
        cell: ({ row }) => <MetaBadge meta={paymentMethodMeta(row.original.method)} hideIcon />,
      },
      {
        id: "amount",
        header: t("admin.users.activity.amount"),
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        id: "status",
        header: t("common.status"),
        cell: ({ row }) => <MetaBadge meta={paymentStatusMeta(row.original.status)} hideIcon />,
      },
      {
        id: "createdAt",
        header: t("common.createdAt"),
        cell: ({ row }) => <Time value={row.original.createdAt} />,
      },
    ],
    [t, onOpenPayment],
  );

  return (
    <Panel error={error} onRetry={refetch}>
      <DataTable
        columns={columns}
        data={result?.content ?? []}
        isLoading={isLoading}
        emptyMessage={t("admin.users.activity.emptyPayments")}
        serverPagination={pagination(result?.totalElements ?? 0, result?.totalPages ?? 1)}
      />
    </Panel>
  );
}

function RefundsPanel({ userId, onOpenPayment }: { userId: number; onOpenPayment: (id: number) => void }) {
  const { t } = useTranslation();
  const { page, size, pagination } = usePaging();
  const { data, isLoading, error, refetch } = useGetAdminRefundsQuery({ page, size, userId });
  const result = data?.data;

  const columns = useMemo<ColumnDef<AdminRefund>[]>(
    () => [
      {
        id: "code",
        header: t("admin.users.activity.refundCode"),
        cell: ({ row }) =>
          row.original.orderId ? (
            <Link to={`/admin/refunds?orderId=${row.original.orderId}`} className={LINK_CLASS}>
              #{row.original.id}
            </Link>
          ) : (
            <span className="font-mono text-xs">#{row.original.id}</span>
          ),
      },
      {
        id: "payment",
        header: t("admin.users.activity.paymentCode"),
        cell: ({ row }) => (
          <button type="button" className={LINK_CLASS} onClick={() => onOpenPayment(row.original.paymentId)}>
            {row.original.paymentReferenceId || `#${row.original.paymentId}`}
          </button>
        ),
      },
      {
        id: "order",
        header: t("common.order"),
        cell: ({ row }) => (
          <OrderLink id={row.original.order?.id ?? row.original.orderId} code={row.original.order?.orderCode} />
        ),
      },
      {
        id: "amount",
        header: t("admin.users.activity.amount"),
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        id: "status",
        header: t("common.status"),
        cell: ({ row }) => <MetaBadge meta={refundStatusMeta(row.original.status)} hideIcon />,
      },
      {
        id: "reason",
        header: t("admin.users.activity.reason"),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[260px] text-xs">{row.original.reason || "—"}</span>
        ),
      },
      {
        id: "requestedAt",
        header: t("admin.users.activity.requestedAt"),
        cell: ({ row }) => <Time value={row.original.requestedAt} />,
      },
    ],
    [t, onOpenPayment],
  );

  return (
    <Panel error={error} onRetry={refetch}>
      <DataTable
        columns={columns}
        data={result?.content ?? []}
        isLoading={isLoading}
        emptyMessage={t("admin.users.activity.emptyRefunds")}
        serverPagination={pagination(result?.totalElements ?? 0, result?.totalPages ?? 1)}
      />
    </Panel>
  );
}

function WalletPanel({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const { page, size, pagination } = usePaging();
  const { data, isLoading, error, refetch } = useGetAdminWalletTransactionsQuery({
    page,
    size,
    userId,
    sort: NEWEST_FIRST,
  });
  const result = data?.data;

  const columns = useMemo<ColumnDef<AdminWalletTransaction>[]>(
    () => [
      {
        id: "source",
        header: t("admin.users.activity.source"),
        cell: ({ row }) => <MetaBadge meta={walletSourceMeta(row.original.source)} hideIcon />,
      },
      {
        id: "type",
        header: t("admin.users.activity.type"),
        cell: ({ row }) => <MetaBadge meta={walletTypeMeta(row.original.type)} hideIcon />,
      },
      {
        id: "amount",
        header: t("admin.users.activity.amount"),
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        id: "balanceAfter",
        header: t("admin.users.activity.balanceAfter"),
        cell: ({ row }) => formatCurrency(row.original.balanceAfter),
      },
      {
        id: "order",
        header: t("common.order"),
        cell: ({ row }) => <OrderLink id={row.original.relatedOrderId} code={row.original.orderCode} />,
      },
      {
        id: "description",
        header: t("admin.users.activity.description"),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[260px] text-xs">{row.original.description || "—"}</span>
        ),
      },
      {
        id: "createdAt",
        header: t("common.time"),
        cell: ({ row }) => <Time value={row.original.createdAt} />,
      },
    ],
    [t],
  );

  return (
    <Panel error={error} onRetry={refetch}>
      <DataTable
        columns={columns}
        data={result?.content ?? []}
        isLoading={isLoading}
        emptyMessage={t("admin.users.activity.emptyWallet")}
        serverPagination={pagination(result?.totalElements ?? 0, result?.totalPages ?? 1)}
      />
    </Panel>
  );
}

function FeedbackPanel({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const { page, size, pagination } = usePaging();
  const { data, isLoading, error, refetch } = useGetAllFeedbackQuery({ page, size, userId });
  const result = data?.data;

  const columns = useMemo<ColumnDef<FeedbackDTO>[]>(
    () => [
      {
        id: "code",
        header: t("admin.users.activity.feedbackCode"),
        cell: ({ row }) => (
          <Link to={`/admin/feedback/${row.original.id}`} className={LINK_CLASS}>
            #{row.original.id}
          </Link>
        ),
      },
      {
        id: "rating",
        header: t("admin.users.activity.rating"),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-sm font-medium">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {row.original.rating}
          </span>
        ),
      },
      {
        id: "comment",
        header: t("admin.users.activity.comment"),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[320px] text-xs">{row.original.comment || "—"}</span>
        ),
      },
      {
        id: "order",
        header: t("common.order"),
        cell: ({ row }) => <OrderLink id={row.original.relatedOrderId} code={row.original.orderCode} />,
      },
      {
        id: "status",
        header: t("common.status"),
        cell: ({ row }) => (
          <Badge variant="outline">
            {t(row.original.isResolved ? "admin.users.activity.resolved" : "admin.users.activity.unresolved")}
          </Badge>
        ),
      },
      {
        id: "createdAt",
        header: t("common.createdAt"),
        cell: ({ row }) => <Time value={row.original.createdAt} />,
      },
    ],
    [t],
  );

  return (
    <Panel error={error} onRetry={refetch}>
      <DataTable
        columns={columns}
        data={result?.content ?? []}
        isLoading={isLoading}
        emptyMessage={t("admin.users.activity.emptyFeedback")}
        serverPagination={pagination(result?.totalElements ?? 0, result?.totalPages ?? 1)}
      />
    </Panel>
  );
}

function ReportsPanel({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useGetAllAdminReportsQuery({ userId });
  const reports = useMemo(() => extractList<LockerReportResponse>(data?.data), [data]);

  const columns = useMemo<ColumnDef<LockerReportResponse>[]>(
    () => [
      {
        id: "code",
        header: t("admin.users.activity.reportCode"),
        cell: ({ row }) => (
          <Link to={`/admin/maintenance?reportId=${row.original.id}`} className={LINK_CLASS}>
            #{row.original.id}
          </Link>
        ),
      },
      {
        id: "title",
        header: t("admin.users.activity.reportTitle"),
        cell: ({ row }) => <span className="line-clamp-2 max-w-[320px] text-xs">{row.original.title}</span>,
      },
      {
        id: "locker",
        header: t("admin.users.activity.locker"),
        cell: ({ row }) => (
          <Link to={`/admin/lockers/${row.original.lockerId}`} className={LINK_CLASS}>
            {row.original.lockerCode || row.original.lockerName || `#${row.original.lockerId}`}
            {row.original.boxNumber != null &&
              ` · ${t("admin.users.activity.box", { number: row.original.boxNumber })}`}
          </Link>
        ),
      },
      {
        id: "status",
        header: t("common.status"),
        cell: ({ row }) => {
          const key = REPORT_STATUS_KEY[row.original.status];
          return <Badge variant="outline">{key ? t(key) : row.original.status}</Badge>;
        },
      },
      {
        id: "createdAt",
        header: t("common.createdAt"),
        cell: ({ row }) => <Time value={row.original.createdAt} />,
      },
    ],
    [t],
  );

  return (
    <Panel error={error} onRetry={refetch}>
      <DataTable
        columns={columns}
        data={reports}
        isLoading={isLoading}
        pageSize={PAGE_SIZE}
        emptyMessage={t("admin.users.activity.emptyReports")}
      />
    </Panel>
  );
}

function NotificationsPanel({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useGetAllNotificationsQuery({ userId });
  const notifications = useMemo(() => extractList<AdminNotificationResponse>(data?.data), [data]);

  const columns = useMemo<ColumnDef<AdminNotificationResponse>[]>(
    () => [
      {
        id: "title",
        header: t("admin.users.activity.notificationTitle"),
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.title}</span>,
      },
      {
        id: "message",
        header: t("admin.users.activity.notificationMessage"),
        cell: ({ row }) => <span className="line-clamp-2 max-w-[420px] text-xs">{row.original.message}</span>,
      },
      {
        id: "order",
        header: t("common.order"),
        cell: ({ row }) => {
          const { referenceId, referenceType, relatedOrderId } = row.original;
          const isOrder = referenceType === "ORDER" || referenceType === "DELIVERY";
          return <OrderLink id={relatedOrderId ?? (isOrder ? referenceId : null)} />;
        },
      },
      {
        id: "createdAt",
        header: t("common.time"),
        cell: ({ row }) => <Time value={row.original.sentAt ?? row.original.createdAt} />,
      },
    ],
    [t],
  );

  return (
    <Panel error={error} onRetry={refetch}>
      <DataTable
        columns={columns}
        data={notifications}
        isLoading={isLoading}
        pageSize={PAGE_SIZE}
        emptyMessage={t("admin.users.activity.emptyNotifications")}
      />
    </Panel>
  );
}

function AssistantPanel({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data, isLoading, error, refetch } = useGetAssistantConversationsQuery({ userId, size: 100 });
  const conversations = useMemo(() => extractList<AssistantConversationView>(data?.data), [data]);

  const columns = useMemo<ColumnDef<AssistantConversationView>[]>(
    () => [
      {
        id: "code",
        header: t("admin.users.activity.conversationCode"),
        cell: ({ row }) => (
          <button
            type="button"
            className={LINK_CLASS}
            onClick={() => {
              setOpenId(row.original.id);
              setSheetOpen(true);
            }}
          >
            #{row.original.id}
          </button>
        ),
      },
      {
        id: "title",
        header: t("admin.users.activity.conversationTitle"),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[420px] text-xs">{row.original.title || "—"}</span>
        ),
      },
      {
        id: "messages",
        header: t("admin.users.activity.messageCount"),
        cell: ({ row }) => row.original.messageCount,
      },
      {
        id: "updatedAt",
        header: t("admin.users.detail.lastUpdated"),
        cell: ({ row }) => <Time value={row.original.updatedAt ?? row.original.createdAt} />,
      },
    ],
    [t],
  );

  return (
    <Panel error={error} onRetry={refetch}>
      <DataTable
        columns={columns}
        data={conversations}
        isLoading={isLoading}
        pageSize={PAGE_SIZE}
        emptyMessage={t("admin.users.activity.emptyAssistant")}
      />
      <ConversationDetailSheet open={sheetOpen} conversationId={openId} onClose={() => setSheetOpen(false)} />
    </Panel>
  );
}

/**
 * Mọi dữ liệu gắn với người dùng, mỗi loại một tab. Tab chỉ gọi API khi được mở;
 * tab đang xem nằm trên URL để bấm sang đơn rồi quay lại vẫn đúng chỗ.
 */
export function UserActivityTabs({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const requested = searchParams.get("tab") as TabId | null;
  const tab: TabId = requested && TAB_IDS.includes(requested) ? requested : "orders";

  return (
    <>
      <Tabs
        value={tab}
        onValueChange={(next) =>
          setSearchParams(
            (prev) => {
              const params = new URLSearchParams(prev);
              params.set("tab", next);
              return params;
            },
            { replace: true },
          )
        }
      >
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          {TAB_IDS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {t(`admin.users.activity.tabs.${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="orders" className="mt-4">
          <OrdersPanel userId={userId} />
        </TabsContent>
        <TabsContent value="received" className="mt-4">
          <OrdersPanel userId={userId} received />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsPanel userId={userId} onOpenPayment={setPaymentId} />
        </TabsContent>
        <TabsContent value="refunds" className="mt-4">
          <RefundsPanel userId={userId} onOpenPayment={setPaymentId} />
        </TabsContent>
        <TabsContent value="wallet" className="mt-4">
          <WalletPanel userId={userId} />
        </TabsContent>
        <TabsContent value="loyalty" className="mt-4">
          <UserLoyaltySection userId={userId} />
        </TabsContent>
        <TabsContent value="feedback" className="mt-4">
          <FeedbackPanel userId={userId} />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ReportsPanel userId={userId} />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationsPanel userId={userId} />
        </TabsContent>
        <TabsContent value="assistant" className="mt-4">
          <AssistantPanel userId={userId} />
        </TabsContent>
      </Tabs>
      <PaymentDetailModal paymentId={paymentId} onClose={() => setPaymentId(null)} />
    </>
  );
}
