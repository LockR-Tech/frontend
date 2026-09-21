import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  actionLabel: string;
  /** Nút xác nhận màu đỏ (xoá, thao tác tốn phí…). */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

/** Hộp xác nhận giữ nguyên khi đang xử lý (AlertDialogAction mặc định tự đóng ngay). */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  destructive,
  loading,
  onConfirm,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Huỷ</AlertDialogCancel>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={destructive ? "bg-rose-600 text-white hover:bg-rose-700" : undefined}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
