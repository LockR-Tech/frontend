import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { LabelValue } from "~/components/shared/reporting";
import { useAuth } from "~/context/auth-context";
import { useUpdateAdminOrderStatusMutation } from "~/stores/apis/admin/orders";
import { toReportError } from "~/lib/report-error";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency } from "~/lib/report-format";
import type { AdminOrder } from "~/types/admin/reporting";
import { outstandingOf, storedAtOf } from "../storage-utils";

interface HandOverDialogProps {
  order: AdminOrder | null;
  onClose: () => void;
  onDone?: () => void;
}

/**
 * Trao trả đồ trong kho tại quầy: chốt đơn EXPIRED → COMPLETED (backend `checkout`, ô đã nhả từ
 * lúc vào kho). Backend không chặn khi khách còn nợ phí quá hạn — hộp này nhắc thu trước khi trao.
 */
export function HandOverDialog({ order, onClose, onDone }: HandOverDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [updateStatus, { isLoading: saving }] = useUpdateAdminOrderStatusMutation();

  if (!order) return null;

  const owed = outstandingOf(order);
  const receiver = order.receiver;
  const staffId = Number(user?.id);
  const code = order.orderCode ?? t("admin.orders.noCodeInline");

  const handleConfirm = async () => {
    try {
      await updateStatus({
        id: order.id,
        status: "COMPLETED",
        ...(Number.isFinite(staffId) ? { staffId } : {}),
      }).unwrap();
      toast.success(t("admin.storage.handOver.done", { code }));
      onDone?.();
      onClose();
    } catch (error) {
      toast.error(
        toReportError(error as Parameters<typeof toReportError>[0])?.message ??
          t("admin.storage.handOver.failed"),
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.storage.handOver.title")}</DialogTitle>
          <DialogDescription>{t("admin.storage.handOver.description", { code })}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <LabelValue label={t("admin.orders.table.senderCustomer")}>
            {order.customer?.fullName || EMPTY_VALUE}
            {order.customer?.phoneNumber ? ` · ${order.customer.phoneNumber}` : ""}
          </LabelValue>
          <LabelValue label={t("admin.orders.fields.receiver")}>
            {receiver?.name || receiver?.accountFullName || EMPTY_VALUE}
            {receiver?.phone || receiver?.accountPhoneNumber
              ? ` · ${receiver?.phone || receiver?.accountPhoneNumber}`
              : ""}
          </LabelValue>
          <LabelValue label={t("admin.storage.table.storedAt")} mono>
            {formatDateTime(storedAtOf(order))}
          </LabelValue>
          <LabelValue label={t("admin.storage.table.overtimeFee")}>
            {formatCurrency(order.fees?.overtimeFee ?? order.extraFee ?? 0)}
          </LabelValue>
        </div>

        {owed > 0 ? (
          <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>{t("admin.storage.handOver.owedWarning", { amount: formatCurrency(owed) })}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("admin.storage.handOver.checkIdentity")}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("button.close")}
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? t("admin.orders.saving") : t("admin.storage.handOver.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
