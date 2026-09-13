import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { AlertTriangle, Box, Unlock } from "lucide-react";
import { BoxStatus } from "~/types/admin/enums";

interface Box {
  id: number;
  number: number;
  status: BoxStatus;
  orderId?: string;
  size: string;
}

interface BoxForceOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  box: Box | null;
  onConfirm: (boxId: number) => void;
}

export function BoxForceOpenModal({
  isOpen,
  onClose,
  box,
  onConfirm,
}: BoxForceOpenModalProps) {
  if (!box) return null;

  const handleConfirm = () => {
    onConfirm(box.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Unlock className="h-5 w-5" />
            Mở tủ khẩn cấp
          </DialogTitle>
          <DialogDescription>
            Bạn đang yêu cầu mở ngăn tủ thủ công. Hành động này sẽ được ghi lại.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Box className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">Ngăn #{box.number}</p>
                <p className="text-sm text-muted-foreground">Kích thước: {box.size}</p>
              </div>
            </div>
          </div>

          {box.orderId && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Đơn hàng:</span> {box.orderId}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <p className="text-sm text-yellow-700">
              Lệnh mở tủ sẽ được gửi qua MQTT đến thiết bị. Đảm bảo có nhân viên
              tại chỗ trước khi thực hiện.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Unlock className="mr-2 h-4 w-4" />
            Xác nhận mở tủ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
