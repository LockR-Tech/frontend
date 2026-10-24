import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { MetaBadge, orderStatusMeta } from "~/components/shared/reporting";
import { useAuth } from "~/context/auth-context";
import { useUpdateAdminOrderStatusMutation } from "~/stores/apis/admin/orders";
import { toReportError } from "~/lib/report-error";
import { adminOrderNextStatuses } from "~/types/admin/reporting";
import type { AdminOrder, AdminOrderStatus } from "~/types/admin/reporting";

interface OrderStatusUpdateModalProps {
  order: AdminOrder | null;
  onClose: () => void;
  onUpdated?: () => void;
}

/** Khoá message ghi chú cho từng trạng thái đích admin được chọn. */
const STATUS_HINTS: Record<string, string> = {
  EXPIRED: "admin.orders.statusModal.hint.expired",
  COMPLETED: "admin.orders.statusModal.hint.completed",
  CANCELED: "admin.orders.statusModal.hint.canceled",
};

export function OrderStatusUpdateModal({
  order,
  onClose,
  onUpdated,
}: OrderStatusUpdateModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [updateStatus, { isLoading: saving }] =
    useUpdateAdminOrderStatusMutation();
  const [selected, setSelected] = useState<AdminOrderStatus | "">("");

  useEffect(() => {
    setSelected("");
  }, [order?.id]);

  if (!order) return null;

  const staffId = Number(user?.id);
  // Chỉ các bước backend cho phép từ trạng thái hiện tại (OrderService.STAFF_TRANSITIONS).
  const nextStatuses = adminOrderNextStatuses(order.status);

  const handleSubmit = async () => {
    if (!selected) return;
    try {
      await updateStatus({
        id: order.id,
        status: selected,
        // Gửi id admin để dòng lịch sử ghi đúng ai đổi trạng thái.
        ...(Number.isFinite(staffId) ? { staffId } : {}),
      }).unwrap();
      toast.success(
        t("admin.orders.statusModal.updated", {
          code: order.orderCode ?? t("admin.orders.noCodeInline"),
          status: orderStatusMeta(selected).label,
        }),
      );
      onUpdated?.();
      onClose();
    } catch (error) {
      toast.error(
        toReportError(error as Parameters<typeof toReportError>[0])?.message ??
          t("admin.orders.statusModal.updateFailed"),
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.orders.statusModal.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.orders.statusModal.description", {
              code: order.orderCode ?? t("admin.orders.noCode"),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("admin.orders.statusModal.currentStatus")}</Label>
            <div>
              <MetaBadge meta={orderStatusMeta(order.status)} />
            </div>
          </div>

          {nextStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.orders.statusModal.noTransitions")}
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="new-status">{t("admin.orders.statusModal.newStatus")}</Label>
              <Select
                value={selected}
                onValueChange={(value) => setSelected(value as AdminOrderStatus)}
              >
                <SelectTrigger id="new-status">
                  <SelectValue placeholder={t("admin.orders.statusModal.newStatusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {nextStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {orderStatusMeta(status).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected && STATUS_HINTS[selected] && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t(STATUS_HINTS[selected])}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("button.close")}
          </Button>
          <Button onClick={handleSubmit} disabled={!selected || saving}>
            {saving ? t("admin.orders.saving") : t("common.update")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
