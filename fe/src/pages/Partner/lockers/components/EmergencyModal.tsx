import { Unlock, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from "~/components/ui";
import type { LockerBox } from "@/types/partner.type";
import { getBoxStatusBadge, getBoxStatusLabel } from "../utils/locker-helpers";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  box: LockerBox | null;
  onUnlock: () => void;
  onReport: () => void;
}

export function EmergencyModal({ isOpen, onClose, box, onUnlock, onReport }: EmergencyModalProps) {
  if (!box) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Mở tủ khẩn cấp
          </DialogTitle>
          <DialogDescription>
            Bạn đang yêu cầu mở khẩn cấp ô {box.boxNumber}. Hành động này sẽ được ghi log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2">
            <p>
              <strong>Ô:</strong> {box.boxNumber}
            </p>
            <p>
              <strong>Trạng thái:</strong>{" "}
              <Badge variant="outline" className={getBoxStatusBadge(box.status)}>
                {getBoxStatusLabel(box.status)}
              </Badge>
            </p>
            {box.description && (
              <p>
                <strong>Mô tả:</strong> {box.description}
              </p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            ⚠️ Chỉ sử dụng khi có sự cố khẩn cấp. Mọi hành động sẽ được ghi nhận và báo cáo cho Admin.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="outline" onClick={onReport}>
            <AlertTriangle size={16} className="mr-2" />
            Báo lỗi
          </Button>
          <Button onClick={onUnlock} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Unlock size={16} className="mr-2" />
            Mở khẩn cấp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
