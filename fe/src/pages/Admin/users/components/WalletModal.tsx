import { useState } from "react";
import { Wallet, Loader2, Plus, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  useGetUserWalletQuery,
  useAdjustUserWalletMutation,
} from "~/stores/apis/admin";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: number;
  userName?: string;
}

const formatVnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export function WalletModal({ open, onClose, userId, userName }: Props) {
  const { data, isLoading, refetch } = useGetUserWalletQuery(userId, { skip: !open });
  const [adjust, { isLoading: isAdjusting }] = useAdjustUserWalletMutation();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const balance = data?.data?.balance ?? 0;

  const handleAdjust = async (sign: 1 | -1) => {
    setError(null);
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Nhập số tiền hợp lệ (> 0).");
      return;
    }
    try {
      await adjust({ userId, amount: sign * value, reason: reason || undefined }).unwrap();
      setAmount("");
      setReason("");
      refetch();
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? "Điều chỉnh số dư thất bại.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wallet size={18} className="text-blue-600" />
            Ví của {userName || `user #${userId}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs text-muted-foreground">Số dư hiện tại</p>
            <p className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : formatVnd(balance)}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Số tiền điều chỉnh
            </label>
            <Input
              type="number"
              min={0}
              placeholder="50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Lý do (tuỳ chọn)
            </label>
            <Input
              placeholder="Hoàn tiền / khuyến mãi / điều chỉnh..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleAdjust(-1)}
            disabled={isAdjusting}
            className="text-red-600"
          >
            {isAdjusting ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Minus size={15} className="mr-2" />}
            Trừ tiền
          </Button>
          <Button
            onClick={() => handleAdjust(1)}
            disabled={isAdjusting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isAdjusting ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Plus size={15} className="mr-2" />}
            Cộng tiền
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
