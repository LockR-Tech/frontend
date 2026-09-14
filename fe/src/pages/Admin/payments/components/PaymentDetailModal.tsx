import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Undo2,
  Ban,
  AlertCircle,
} from "lucide-react";
import {
  useGetPaymentByIdQuery,
  useUpdatePaymentStatusMutation,
} from "~/stores/apis/admin";
import { PaymentStatus, PaymentMethod } from "~/types/admin/enums";

function fmtDate(d?: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const dateStr = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${timeStr} ${dateStr}`;
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; icon: React.ElementType; label: string }
> = {
  [PaymentStatus.COMPLETED]: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
    label: "Thành công",
  },
  [PaymentStatus.PENDING]: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    icon: Clock,
    label: "Chờ thanh toán",
  },
  [PaymentStatus.PROCESSING]: {
    bg: "bg-secondary",
    text: "text-foreground",
    icon: RotateCcw,
    label: "Đang xử lý",
  },
  [PaymentStatus.FAILED]: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    icon: XCircle,
    label: "Thất bại",
  },
  [PaymentStatus.REFUNDED]: {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    icon: Undo2,
    label: "Đã hoàn tiền",
  },
  [PaymentStatus.CANCELED]: {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    icon: Ban,
    label: "Đã hủy",
  },
};

const METHOD_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  [PaymentMethod.MOMO]: {
    icon: Smartphone,
    label: "MoMo",
  },
  [PaymentMethod.ZALOPAY]: {
    icon: Smartphone,
    label: "ZaloPay",
  },
  [PaymentMethod.VNPAY]: {
    icon: CreditCard,
    label: "VNPay",
  },
  [PaymentMethod.BANK_TRANSFER]: {
    icon: Banknote,
    label: "Chuyển khoản",
  },
  [PaymentMethod.WALLET]: {
    icon: Wallet,
    label: "Ví điện tử",
  },
  [PaymentMethod.CASH]: {
    icon: Banknote,
    label: "Tiền mặt",
  },
};

function LabelValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PaymentDetailModalProps {
  paymentId: number | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PaymentDetailModal({
  paymentId,
  onClose,
}: PaymentDetailModalProps) {
  const open = paymentId !== null;

  const { data, isLoading, isError } = useGetPaymentByIdQuery(paymentId!, {
    skip: paymentId === null,
  });

  const [updateStatus, { isLoading: saving }] =
    useUpdatePaymentStatusMutation();
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | "">("");

  const payment = data?.data;

  // Sync dropdown when payment loads
  useEffect(() => {
    if (payment?.status) setSelectedStatus(payment.status);
  }, [payment?.status]);

  async function handleSave() {
    if (!paymentId || !selectedStatus) return;
    await updateStatus({ paymentId, status: selectedStatus as PaymentStatus });
  }

  const statusChanged = !!payment && selectedStatus !== payment.status;

  const statusCfg = selectedStatus ? STATUS_CONFIG[selectedStatus] : null;
  const methodCfg = payment ? METHOD_CONFIG[payment.method] : null;
  const MethodIcon = methodCfg?.icon ?? Banknote;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CreditCard size={18} className="text-muted-foreground" />
            Chi tiết thanh toán #{paymentId}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertCircle size={36} className="text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Không tìm thấy thanh toán.</p>
          </div>
        )}

        {payment && (
          <div className="space-y-5">
            {/* Amount highlight */}
            <div className="rounded-xl bg-secondary/50 border border-border p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Số tiền</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {fmtCurrency(payment.amount)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MethodIcon size={18} className="text-muted-foreground" />
                <Badge
                  variant="outline"
                  className="font-medium text-xs bg-card"
                >
                  {methodCfg?.label ?? payment.method}
                </Badge>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <LabelValue label="Mã thanh toán">#{payment.id}</LabelValue>
              <LabelValue label="Mã đơn hàng">#{payment.orderId}</LabelValue>
              <LabelValue label="Khách hàng">{payment.customerName || `Khách #${payment.userId ?? "?"}`}</LabelValue>
              <LabelValue label="Thời gian tạo">
                {fmtDate(payment.createdAt)}
              </LabelValue>
              {payment.referenceId && (
                <LabelValue label="Mã tham chiếu">
                  <span className="font-mono text-xs break-all">
                    {payment.referenceId}
                  </span>
                </LabelValue>
              )}
              {payment.referenceTransactionId && (
                <LabelValue label="Mã giao dịch">
                  <span className="font-mono text-xs break-all">
                    {payment.referenceTransactionId}
                  </span>
                </LabelValue>
              )}
            </div>

            {payment.description && (
              <LabelValue label="Mô tả">
                <span className="text-muted-foreground font-normal">
                  {payment.description}
                </span>
              </LabelValue>
            )}

            <Separator />

            {/* Status update */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Cập nhật trạng thái
              </p>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => setSelectedStatus(v as PaymentStatus)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Chọn trạng thái">
                      {statusCfg && (
                        <span className={`font-medium ${statusCfg.text}`}>
                          {statusCfg.label}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <SelectItem key={val} value={val}>
                          <div className="flex items-center gap-2">
                            <Icon size={14} className={cfg.text} />
                            <span>{cfg.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  disabled={!statusChanged || saving}
                  onClick={handleSave}
                  className="whitespace-nowrap"
                >
                  {saving ? "Đang lưu…" : "Lưu trạng thái"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
