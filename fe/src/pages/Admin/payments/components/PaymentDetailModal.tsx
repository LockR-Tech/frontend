import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
        `Đã chuyển giao dịch #${paymentId} sang “${paymentStatusMeta(selectedStatus).label}”`,
      );
      onUpdated?.();
    } catch (mutationError) {
      toast.error(
        toReportError(mutationError as Parameters<typeof toReportError>[0])
          ?.message ?? "Không cập nhật được trạng thái",
      );
    }
  };

  const statusChanged = !!payment && selectedStatus !== payment.status;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết giao dịch #{paymentId}</DialogTitle>
          <DialogDescription>
            Thông tin thu tiền, hoàn tiền và biến động ví liên quan tới giao dịch này.
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
            title="Không tải được giao dịch"
          />
        )}

        {payment && detail && (
          <div className="space-y-5">
            <PaymentSummary payment={payment} />

            {payment.order && (
              <section className="space-y-2">
                <SectionTitle icon={Package}>Đơn hàng liên quan</SectionTitle>
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {payment.order.orderCode ?? `#${payment.order.id}`}
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
                      Mở đơn
                      <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <LabelValue label="Loại đơn">{payment.order.type}</LabelValue>
                    <LabelValue label="Tổng tiền đơn">
                      {formatCurrency(payment.order.totalPrice)}
                    </LabelValue>
                    <LabelValue label="Mã tủ" mono>
                      {payment.order.lockerId ? `#${payment.order.lockerId}` : null}
                    </LabelValue>
                    <LabelValue label="Đơn tạo lúc">
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
              <SectionTitle>Cập nhật trạng thái</SectionTitle>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedStatus}
                  onValueChange={(value) =>
                    setSelectedStatus(value as AdminPaymentStatus)
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Chọn trạng thái" />
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
                  {saving ? "Đang lưu…" : "Lưu trạng thái"}
                </Button>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
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
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-secondary/50 border border-border p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Số tiền</p>
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
        <LabelValue label="Khách hàng">
          {payment.customer?.fullName ??
            (payment.userId ? `Khách #${payment.userId}` : null)}
        </LabelValue>
        <LabelValue label="Điện thoại" mono>
          {payment.customer?.phoneNumber}
        </LabelValue>
        <LabelValue label="Tạo lúc">{formatDateTime(payment.createdAt)}</LabelValue>
        <LabelValue label="Thu lúc">
          {payment.paidAt ? formatDateTime(payment.paidAt) : null}
        </LabelValue>
        <LabelValue label="Cập nhật">
          {payment.updatedAt ? formatDateTime(payment.updatedAt) : null}
        </LabelValue>
        <LabelValue label="Đã hoàn">
          {formatCurrency(payment.refundedAmount)}
        </LabelValue>
        <LabelValue label="Mã tham chiếu" mono>
          {payment.referenceId}
        </LabelValue>
        <LabelValue label="Mã giao dịch cổng" mono>
          {payment.referenceTransactionId}
        </LabelValue>
      </div>

      {(payment.description || payment.content) && (
        <LabelValue label="Nội dung">
          {payment.description ?? payment.content}
        </LabelValue>
      )}
    </div>
  );
}

function RefundSection({ refunds }: { refunds: AdminRefund[] }) {
  return (
    <section className="space-y-2">
      <SectionTitle icon={RefreshCcw}>
        Hoàn tiền ({refunds.length})
      </SectionTitle>
      {refunds.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Giao dịch này chưa có lần hoàn tiền nào.
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
                <LabelValue label="Lý do">{refund.reason}</LabelValue>
                <LabelValue label="Mã giao dịch hoàn" mono>
                  {refund.transactionId}
                </LabelValue>
                <LabelValue label="Người xử lý">
                  {refund.processedBy?.fullName ??
                    (refund.processedByUserId
                      ? `#${refund.processedByUserId}`
                      : null)}
                </LabelValue>
              </div>
            </div>
          ))}
          {/* Backend hiện không đổi trạng thái giao dịch hay đơn khi tạo hoàn tiền. */}
          <p className="text-[11px] text-muted-foreground">
            Tạo hoàn tiền không tự đổi trạng thái giao dịch hay tình trạng thanh toán
            của đơn.
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
  return (
    <section className="space-y-2">
      <SectionTitle icon={Wallet}>
        Biến động ví ({transactions.length})
      </SectionTitle>
      {transactions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Giao dịch này không sinh biến động ví.
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
                Số dư sau: {formatCurrency(tx.balanceAfter)}
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
  if (payments.length === 0) return null;

  return (
    <section className="space-y-2">
      <SectionTitle>Giao dịch khác của cùng đơn ({payments.length})</SectionTitle>
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
