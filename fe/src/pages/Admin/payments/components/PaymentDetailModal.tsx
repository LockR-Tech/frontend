import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ExternalLink, Package, RefreshCcw, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  LabelValue,
  MetaBadge,
  ReportErrorState,
  orderPaymentStatusMeta,
  orderStatusMeta,
  paymentKindMeta,
  paymentMethodMeta,
  paymentStatusMeta,
  refundStatusMeta,
  walletSourceMeta,
  walletTypeMeta,
} from "~/components/shared/reporting";
import {
  useGetAdminPaymentDetailQuery,
  useUpdateAdminPaymentStatusMutation,
} from "~/stores/apis/admin/payments";
import { formatDateTime } from "~/lib/datetime";
import { toReportError } from "~/lib/report-error";
import { EMPTY_VALUE, formatCurrency } from "~/lib/report-format";
import {
  ADMIN_PAYMENT_STATUSES,
  type AdminPayment,
  type AdminPaymentStatus,
  type AdminRefund,
  type AdminWalletTransaction,
} from "~/types/admin/reporting";

interface PaymentDetailModalProps {
  paymentId: number | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function PaymentDetailModal({
  paymentId,
  onClose,
  onUpdated,
}: PaymentDetailModalProps) {
  const { t } = useTranslation();
  const open = paymentId !== null;
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useGetAdminPaymentDetailQuery(
    paymentId!,
    { skip: paymentId === null },
  );

  const [updateStatus, { isLoading: saving }] =
    useUpdateAdminPaymentStatusMutation();
  const [selectedStatus, setSelectedStatus] = useState<AdminPaymentStatus | "">("");

  const detail = data?.data;
  const payment = detail?.payment;

  useEffect(() => {
    setSelectedStatus(payment?.status ?? "");
  }, [payment?.status, paymentId]);

  const handleSave = async () => {
    if (!paymentId || !selectedStatus) return;
    try {
      await updateStatus({ paymentId, status: selectedStatus }).unwrap();
      toast.success(
        t("admin.payments.detail.statusUpdated", {
          ref: payment?.referenceId ?? paymentId,
          status: paymentStatusMeta(selectedStatus).label,
        }),
      );
      onUpdated?.();
    } catch (mutationError) {
      toast.error(
        toReportError(mutationError as Parameters<typeof toReportError>[0])
          ?.message ?? t("admin.orders.statusModal.updateFailed"),
      );
    }
  };

  const statusChanged = !!payment && selectedStatus !== payment.status;
  const editLock = payment ? statusEditLock(payment, t) : null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.payments.detail.title", { id: paymentId })}</DialogTitle>
          <DialogDescription>
            {t("admin.payments.detail.description")}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3 py-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-5 w-full rounded" />
            ))}
          </div>
        )}

        {error && (
          <ReportErrorState
            error={error}
            onRetry={refetch}
            title={t("admin.payments.detail.loadFailed")}
          />
        )}

        {payment && detail && (
          <div className="space-y-5">
            <PaymentSummary payment={payment} />

            {payment.order && (
              <section className="space-y-2">
                <SectionTitle icon={Package}>{t("admin.payments.detail.relatedOrder")}</SectionTitle>
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {payment.order.orderCode ?? t("admin.orders.noCode")}
                    </span>
                    <MetaBadge meta={orderStatusMeta(payment.order.status)} hideIcon />
                    <MetaBadge
                      meta={orderPaymentStatusMeta(payment.order.paymentStatus)}
                      hideIcon
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-7 text-xs"
                      onClick={() => navigate(`/admin/orders/${payment.order!.id}`)}
                    >
                      {t("admin.payments.detail.openOrder")}
                      <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <LabelValue label={t("admin.orders.fields.orderType")}>{payment.order.type}</LabelValue>
                    <LabelValue label={t("admin.payments.detail.orderTotal")}>
                      {formatCurrency(payment.order.totalPrice)}
                    </LabelValue>
                    <LabelValue label={t("admin.payments.detail.orderCreatedAt")}>
                      {payment.order.createdAt
                        ? formatDateTime(payment.order.createdAt)
                        : null}
                    </LabelValue>
                  </div>
                </div>
              </section>
            )}

            <RefundSection refunds={detail.refunds} />
            <WalletSection transactions={detail.walletTransactions} />
            <OtherPaymentsSection payments={detail.orderPayments} />

            <Separator />

            <section className="space-y-2">
              <SectionTitle>{t("admin.orders.updateStatus")}</SectionTitle>
              {editLock ? (
                <p className="text-xs text-muted-foreground">{editLock}</p>
              ) : (
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedStatus}
                    onValueChange={(value) =>
                      setSelectedStatus(value as AdminPaymentStatus)
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("admin.payments.detail.selectStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_PAYMENT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {paymentStatusMeta(status).label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!statusChanged || saving}
                    onClick={handleSave}
                  >
                    {saving ? t("admin.orders.saving") : t("admin.payments.detail.saveStatus")}
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Trạng thái cuối — backend không hoàn tác tiền khi đổi tay nên không cho sửa. */
const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "REFUNDED"];

/**
 * Lý do khoá ô đổi trạng thái, `null` = được sửa. Nạp ví chỉ được ghi nhận qua callback
 * cổng thanh toán: đổi tay sang "Thành công" không cộng tiền vào ví khách.
 */
function statusEditLock(payment: AdminPayment, t: TFunction): string | null {
  if (payment.kind === "TOPUP" || payment.method?.endsWith("_TOPUP")) {
    return t("admin.payments.detail.lockTopup");
  }
  if (TERMINAL_STATUSES.includes(payment.status)) {
    return t("admin.payments.detail.lockTerminal", {
      status: paymentStatusMeta(payment.status).label,
    });
  }
  return null;
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </p>
  );
}

function PaymentSummary({ payment }: { payment: AdminPayment }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-secondary/50 border border-border p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("admin.payments.amount")}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(payment.amount)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MetaBadge meta={paymentStatusMeta(payment.status)} />
          <MetaBadge meta={paymentMethodMeta(payment.method)} />
          <MetaBadge meta={paymentKindMeta(payment.kind)} hideIcon />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <LabelValue label={t("common.customer")}>
          {payment.customer?.fullName ??
            t("admin.orders.lookup.customerName")}
        </LabelValue>
        <LabelValue label={t("common.phoneShort")} mono>
          {payment.customer?.phoneNumber}
        </LabelValue>
        <LabelValue label={t("common.createdAtTime")}>{formatDateTime(payment.createdAt)}</LabelValue>
        <LabelValue label={t("admin.payments.paidAt")}>
          {payment.paidAt ? formatDateTime(payment.paidAt) : null}
        </LabelValue>
        <LabelValue label={t("admin.orders.detail.updatedAt")}>
          {payment.updatedAt ? formatDateTime(payment.updatedAt) : null}
        </LabelValue>
        <LabelValue label={t("admin.orders.detail.payment.refunded")}>
          {formatCurrency(payment.refundedAmount)}
        </LabelValue>
        <LabelValue label={t("admin.payments.detail.referenceId")} mono>
          {payment.referenceId}
        </LabelValue>
        <LabelValue label={t("admin.payments.detail.gatewayTxnId")} mono>
          {payment.referenceTransactionId}
        </LabelValue>
      </div>

      {(payment.description || payment.content) && (
        <LabelValue label={t("admin.payments.detail.content")}>
          {payment.description ?? payment.content}
        </LabelValue>
      )}
    </div>
  );
}

function RefundSection({ refunds }: { refunds: AdminRefund[] }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-2">
      <SectionTitle icon={RefreshCcw}>
        {t("admin.payments.detail.refundsCount", { count: refunds.length })}
      </SectionTitle>
      {refunds.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("admin.payments.detail.noRefunds")}
        </p>
      ) : (
        <div className="space-y-2">
          {refunds.map((refund) => (
            <div
              key={refund.id}
              className="rounded-lg border border-border p-3 space-y-1.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <MetaBadge meta={refundStatusMeta(refund.status)} hideIcon />
                <span className="font-semibold text-sm">
                  {formatCurrency(refund.amount)}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono ml-auto">
                  {refund.processedAt
                    ? formatDateTime(refund.processedAt)
                    : formatDateTime(refund.requestedAt)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <LabelValue label={t("admin.payments.detail.reason")}>{refund.reason}</LabelValue>
                <LabelValue label={t("admin.payments.detail.refundTxnId")} mono>
                  {refund.transactionId}
                </LabelValue>
                <LabelValue label={t("admin.payments.detail.processedBy")}>
                  {refund.processedBy?.fullName ??
                    (refund.processedByUserId ? t("admin.orders.lookup.name") : null)}
                </LabelValue>
              </div>
            </div>
          ))}
          {/* Backend hiện không đổi trạng thái giao dịch hay đơn khi tạo hoàn tiền. */}
          <p className="text-[11px] text-muted-foreground">
            {t("admin.payments.detail.refundNote")}
          </p>
        </div>
      )}
    </section>
  );
}

function WalletSection({
  transactions,
}: {
  transactions: AdminWalletTransaction[];
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-2">
      <SectionTitle icon={Wallet}>
        {t("admin.payments.detail.walletCount", { count: transactions.length })}
      </SectionTitle>
      {transactions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("admin.payments.detail.noWallet")}
        </p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-lg border border-border p-3 flex flex-wrap items-center gap-2"
            >
              <MetaBadge meta={walletTypeMeta(tx.type)} hideIcon />
              <MetaBadge meta={walletSourceMeta(tx.source)} hideIcon />
              <span className="font-semibold text-sm">
                {formatCurrency(tx.amount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("admin.payments.detail.balanceAfter", {
                  amount: formatCurrency(tx.balanceAfter),
                })}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono ml-auto">
                {formatDateTime(tx.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function OtherPaymentsSection({ payments }: { payments: AdminPayment[] }) {
  const { t } = useTranslation();
  if (payments.length === 0) return null;

  return (
    <section className="space-y-2">
      <SectionTitle>
        {t("admin.payments.detail.otherPayments", { count: payments.length })}
      </SectionTitle>
      <div className="space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="rounded-lg border border-border p-3 flex flex-wrap items-center gap-2"
          >
            <span className="font-mono text-xs">#{payment.id}</span>
            <MetaBadge meta={paymentStatusMeta(payment.status)} hideIcon />
            <MetaBadge meta={paymentMethodMeta(payment.method)} hideIcon />
            <span className="font-semibold text-sm">
              {formatCurrency(payment.amount)}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono ml-auto">
              {payment.paidAt
                ? formatDateTime(payment.paidAt)
                : payment.createdAt
                  ? formatDateTime(payment.createdAt)
                  : EMPTY_VALUE}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
