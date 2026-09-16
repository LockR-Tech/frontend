import { useEffect, useState } from "react";
import { toast } from "sonner";
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

/** Ghi chú cho từng trạng thái, theo đúng nghiệp vụ tủ Lock.R. */
const STATUS_HINTS: Record<string, string> = {
  INITIALIZED: "Đơn vừa tạo, khách chưa bỏ hàng vào tủ.",
  STORING: "Hàng đang nằm trong ô, người nhận chưa lấy.",
  EXPIRED: "Quá hạn lấy hàng; ô đã được giải phóng nên không còn số ô.",
  AWAITING_DISPATCH: "Chờ điều phối drone cho chặng giao.",
  COMPLETED: "Đã giao xong. Thao tác này giải phóng ô đang giữ.",
  CANCELED: "Huỷ đơn. Thao tác này giải phóng ô đang giữ.",
};

/** Trạng thái backend giải phóng ô khi chuyển sang — cần nhắc trước khi bấm. */
const RELEASES_BOX: AdminOrderStatus[] = ["COMPLETED", "CANCELED"];

export function OrderStatusUpdateModal({
  order,
  onClose,
  onUpdated,
}: OrderStatusUpdateModalProps) {
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

  const handleSubmit = async () => {
    if (!selected) return;
    const parsedBoxId = receiveBoxId.trim() ? Number(receiveBoxId.trim()) : undefined;
    if (parsedBoxId !== undefined && !Number.isInteger(parsedBoxId)) {
      toast.error("Mã ô nhận phải là số nguyên");
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
        `Đã chuyển đơn ${order.orderCode ?? `#${order.id}`} sang “${orderStatusMeta(selected).label}”`,
      );
      onUpdated?.();
      onClose();
    } catch (error) {
      toast.error(
        toReportError(error as Parameters<typeof toReportError>[0])?.message ??
          "Không cập nhật được trạng thái",
      );
    }
  };

  const releasesBox = selected !== "" && RELEASES_BOX.includes(selected);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật trạng thái đơn</DialogTitle>
          <DialogDescription>
            {order.orderCode ?? `Đơn #${order.id}`} — thay đổi được ghi vào lịch sử
            trạng thái kèm tên người thao tác.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Trạng thái hiện tại</Label>
            <div>
              <MetaBadge meta={orderStatusMeta(order.status)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-status">Trạng thái mới</Label>
            <Select
              value={selected}
              onValueChange={(value) => setSelected(value as AdminOrderStatus)}
            >
              <SelectTrigger id="new-status">
                <SelectValue placeholder="Chọn trạng thái mới" />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_ORDER_STATUSES.map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    disabled={status === order.status}
                  >
                    {orderStatusMeta(status).label}
                    {status === order.status && " (hiện tại)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && STATUS_HINTS[selected] && (
              <p className="text-xs text-muted-foreground">
                {STATUS_HINTS[selected]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receive-box">Mã ô nhận (tuỳ chọn)</Label>
            <Input
              id="receive-box"
              inputMode="numeric"
              placeholder="Để trống nếu không gán ô nhận"
              value={receiveBoxId}
              onChange={(e) => setReceiveBoxId(e.target.value)}
            />
          </div>

          {releasesBox && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Trạng thái này giải phóng ô đang giữ của đơn.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Đóng
          </Button>
          <Button onClick={handleSubmit} disabled={!selected || saving}>
            {saving ? "Đang lưu…" : "Cập nhật"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
