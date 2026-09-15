import { useState } from "react";
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
import { OrderStatus } from "~/types/admin/enums";
import {
  Clock,
  Package,
  Truck,
  CheckCircle2,
  RotateCcw,
  Box,
  XCircle,
} from "lucide-react";

interface OrderStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: OrderStatus;
  onUpdate: (status: OrderStatus) => void;
}

const statusOptions = [
  {
    value: OrderStatus.INITIALIZED,
    label: "Khởi tạo",
    icon: Clock,
    description: "Đơn hàng vừa được tạo",
  },
  {
    value: OrderStatus.WAITING,
    label: "Chờ thu gom",
    icon: Truck,
    description: "Chờ staff đến thu gom đồ",
  },
  {
    value: OrderStatus.COLLECTED,
    label: "Đã thu gom",
    icon: CheckCircle2,
    description: "Nhân viên/Shipper đã lấy kiện hàng từ Kiosk",
  },
  {
    value: OrderStatus.PROCESSING,
    label: "Đang xử lý",
    icon: RotateCcw,
    description: "Đang xử lý / vận chuyển kiện hàng",
  },
  {
    value: OrderStatus.READY,
    label: "Sẵn sàng",
    icon: CheckCircle2,
    description: "Đã tới Kiosk đích, chờ trả vào ô",
  },
  {
    value: OrderStatus.RETURNED,
    label: "Đã trả vào Kiosk",
    icon: Box,
    description: "Đã lưu vào ngăn Kiosk, sẵn sàng cho khách",
  },
  {
    value: OrderStatus.COMPLETED,
    label: "Hoàn thành",
    icon: CheckCircle2,
    description: "Khách đã nhận kiện hàng thành công",
  },
  {
    value: OrderStatus.CANCELED,
    label: "Đã hủy",
    icon: XCircle,
    description: "Đơn hàng bị hủy",
  },
];

export function OrderStatusUpdateModal({
  isOpen,
  onClose,
  currentStatus,
  onUpdate,
}: OrderStatusUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");

  const handleSubmit = () => {
    if (selectedStatus) {
      onUpdate(selectedStatus);
      setSelectedStatus("");
    }
  };

  const handleClose = () => {
    setSelectedStatus("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
          <DialogDescription>
            Chọn trạng thái mới cho đơn hàng. Hành động này sẽ được ghi lại
            trong lịch sử.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Trạng thái hiện tại</Label>
            <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground flex items-center gap-2">
              {(() => {
                const current = statusOptions.find(
                  (s) => s.value === currentStatus
                );
                const Icon = current?.icon || Clock;
                return (
                  <>
                    <Icon className="h-4 w-4" />
                    {current?.label || currentStatus}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Trạng thái mới</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setSelectedStatus(value as OrderStatus)
              }
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Chọn trạng thái mới" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => {
                  const Icon = status.icon;
                  const isCurrent = status.value === currentStatus;
                  return (
                    <SelectItem
                      key={status.value}
                      value={status.value}
                      disabled={isCurrent}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{status.label}</span>
                        {isCurrent && (
                          <span className="text-xs text-muted-foreground/70 ml-2">
                            (hiện tại)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedStatus && (
            <div className="p-3 bg-secondary/60 border border-border rounded-md">
              <p className="text-xs text-foreground">
                {statusOptions.find((s) => s.value === selectedStatus)?.description}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStatus || selectedStatus === currentStatus}
          >
            Cập nhật
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
