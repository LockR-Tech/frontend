import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Label,
  Input,
} from "~/components/ui";
import type { PartnerOrder } from "@/types/partner.type";

interface WeightUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PartnerOrder | null;
  weight: string;
  onWeightChange: (weight: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function WeightUpdateModal({
  isOpen,
  onClose,
  order,
  weight,
  onWeightChange,
  onSubmit,
  isLoading,
}: WeightUpdateModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật cân nặng</DialogTitle>
          <DialogDescription>
            Nhập cân nặng thực tế sau khi cân đồ của khách
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Cân nặng (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="VD: 3.5"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
            />
          </div>

          {order && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p>
                <strong>Mã đơn:</strong> {order.orderCode}
              </p>
              <p>
                <strong>Khách hàng:</strong> {order.customerName}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
