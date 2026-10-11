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
import { Input } from "~/components/ui/input";
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
import { ADMIN_ORDER_STATUSES } from "~/types/admin/reporting";
import type { AdminOrder, AdminOrderStatus } from "~/types/admin/reporting";

interface OrderStatusUpdateModalProps {
  order: AdminOrder | null;
  onClose: () => void;
  onUpdated?: () => void;
}

/** Khoá message ghi chú cho từng trạng thái, theo đúng nghiệp vụ tủ Lock.R. */
const STATUS_HINTS: Record<string, string> = {
  INITIALIZED: "admin.orders.statusModal.hint.initialized",
  STORING: "admin.orders.statusModal.hint.storing",
  EXPIRED: "admin.orders.statusModal.hint.expired",
  AWAITING_DISPATCH: "admin.orders.statusModal.hint.awaitingDispatch",
  COMPLETED: "admin.orders.statusModal.hint.completed",
  CANCELED: "admin.orders.statusModal.hint.canceled",
};

/** Trạng thái backend giải phóng ô khi chuyển sang (OrderService.updateStatus) — cần nhắc trước khi bấm. */
const RELEASES_BOX: AdminOrderStatus[] = ["COMPLETED", "CANCELED"];

/** Chỉ RETURNED (giá trị cũ, không còn trong danh sách chọn) mới chiếm ô nhận theo `receiveBoxId`. */
const USES_RECEIVE_BOX: AdminOrderStatus[] = ["RETURNED"];

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
  const [receiveBoxId, setReceiveBoxId] = useState("");

  useEffect(() => {
    setSelected("");
    setReceiveBoxId("");
  }, [order?.id]);

  if (!order) return null;

  const staffId = Number(user?.id);

  const usesReceiveBox = selected !== "" && USES_RECEIVE_BOX.includes(selected);

  const handleSubmit = async () => {
    if (!selected) return;
    const parsedBoxId =
      usesReceiveBox && receiveBoxId.trim() ? Number(receiveBoxId.trim()) : undefined;
    if (parsedBoxId !== undefined && !Number.isInteger(parsedBoxId)) {
      toast.error(t("admin.orders.statusModal.receiveBoxInvalid"));
      return;
    }

    try {
      await updateStatus({
        id: order.id,
        status: selected,
        // Gửi id admin để dòng lịch sử ghi đúng ai đổi trạng thái.
        ...(Number.isFinite(staffId) ? { staffId } : {}),
        ...(parsedBoxId !== undefined ? { receiveBoxId: parsedBoxId } : {}),
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

  const releasesBox = selected !== "" && RELEASES_BOX.includes(selected);

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
                {ADMIN_ORDER_STATUSES.map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    disabled={status === order.status}
                  >
                    {orderStatusMeta(status).label}
                    {status === order.status &&
                      ` ${t("admin.orders.statusModal.currentTag")}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && STATUS_HINTS[selected] && (
              <p className="text-xs text-muted-foreground">
                {t(STATUS_HINTS[selected])}
              </p>
            )}
          </div>

          {usesReceiveBox && (
            <div className="space-y-1.5">
              <Label htmlFor="receive-box">
                {t("admin.orders.statusModal.receiveBox")}
              </Label>
              <Input
                id="receive-box"
                inputMode="numeric"
                placeholder={t("admin.orders.statusModal.receiveBoxPlaceholder")}
                value={receiveBoxId}
                onChange={(e) => setReceiveBoxId(e.target.value)}
              />
            </div>
          )}

          {releasesBox && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t("admin.orders.statusModal.releasesBox")}
            </p>
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
