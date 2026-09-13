import { Copy, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "~/components/ui";
import type { StaffAccessCode } from "@/types/partner.type";
import { copyToClipboard } from "../utils/order-helpers";

interface AccessCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: StaffAccessCode | null;
  action: "COLLECT" | "RETURN";
}

export function AccessCodeModal({ isOpen, onClose, code, action }: AccessCodeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {action === "COLLECT" ? "🔑 Mã lấy đồ cho Staff" : "📦 Mã trả đồ cho Staff"}
          </DialogTitle>
          <DialogDescription className="text-center">
            Gửi mã này cho nhân viên để {action === "COLLECT" ? "lấy đồ" : "trả đồ"} tại tủ locker
          </DialogDescription>
        </DialogHeader>

        {code && (
          <div className="space-y-4">
            {/* Large Code Display */}
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <p className="text-4xl font-mono font-bold tracking-widest text-blue-600">
                {code.code}
              </p>
            </div>

            {/* Copy Button */}
            <Button className="w-full" onClick={() => copyToClipboard(code.code)}>
              <Copy size={16} className="mr-2" />
              Sao chép mã
            </Button>

            {/* Code Details */}
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>
                  Hết hạn: {new Date(code.expiresAt).toLocaleString("vi-VN")}
                </span>
              </div>
              {code.orderLockerName && <p>📍 Tủ: {code.orderLockerName}</p>}
              {code.orderBoxNumbers && <p>📦 Box: {code.orderBoxNumbers}</p>}
              {code.customerName && <p>👤 Khách: {code.customerName}</p>}
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              ⚠️ Mã chỉ sử dụng được 1 lần và sẽ tự động hết hạn sau 24 giờ
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
