import { useState } from "react";
import {
  Coins,
  TrendingUp,
  History,
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  useGetUserLoyaltySummaryQuery,
  useAdjustUserPointsMutation,
  useGetUserLoyaltyHistoryQuery,
} from "~/stores/apis/admin";
import type { PointTransactionDTO } from "~/types/admin/loyalty";
import { extractList } from "~/lib/extract-list";
import { formatDateTime } from "~/lib/datetime";

interface Props {
  userId: number;
}

const PAGE_SIZE = 10;
// loyalty-service ghi "ADJUSTMENT" cho mọi lần điều chỉnh không kèm type.
const ADJUST_TYPE = "ADJUSTMENT";

const TIER_META: Record<string, { label: string; cls: string }> = {
  BRONZE: { label: "Đồng", cls: "bg-secondary text-foreground border-border" },
  SILVER: { label: "Bạc", cls: "bg-secondary text-foreground border-border" },
  GOLD: {
    label: "Vàng",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  PLATINUM: { label: "Bạch kim", cls: "bg-primary text-primary-foreground border-primary" },
};

// Loại giao dịch backend thực sự ghi: ADJUSTMENT (admin), REDEEM (đổi điểm).
const TX_LABEL: Record<string, string> = {
  ADJUSTMENT: "Điều chỉnh",
  REDEEM: "Đổi điểm",
};

function errorMessage(err: unknown, fallback: string) {
  const e = err as { data?: { message?: unknown } } | undefined;
  return typeof e?.data?.message === "string" && e.data.message.trim()
    ? e.data.message
    : fallback;
}

export function UserLoyaltySection({ userId }: Props) {
  const {
    data: loyaltyData,
    isLoading: loyaltyLoading,
    isError: loyaltyError,
  } = useGetUserLoyaltySummaryQuery(userId, { skip: !userId });
  const loyalty = loyaltyData?.data;

  const [adjustUserPoints, { isLoading: adjusting }] = useAdjustUserPointsMutation();
  const [historyPage, setHistoryPage] = useState(0);
  const { data: historyData, isLoading: historyLoading } =
    useGetUserLoyaltyHistoryQuery(userId, { skip: !userId });
  // Backend trả cả danh sách (mới nhất trước) — phân trang tại client.
  const historyList = extractList<PointTransactionDTO>(historyData?.data);
  const historyTotal = historyList.length;
  const historyPageItems = historyList.slice(
    historyPage * PAGE_SIZE,
    (historyPage + 1) * PAGE_SIZE,
  );

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjustError, setAdjustError] = useState<string | null>(null);

  async function handleAdjust() {
    const value = Math.abs(Math.trunc(Number(amount)));
    if (!value) {
      setAdjustError("Vui lòng nhập số điểm lớn hơn 0.");
      return;
    }
    // Backend không chặn số dư âm nên kiểm tra tại đây.
    if (direction === "DEDUCT" && value > (loyalty?.points ?? 0)) {
      setAdjustError("Không thể trừ nhiều hơn số điểm hiện có.");
      return;
    }
    setAdjustError(null);
    try {
      await adjustUserPoints({
        userId,
        points: direction === "ADD" ? value : -value,
        type: ADJUST_TYPE,
      }).unwrap();
      toast.success(direction === "ADD" ? `Đã cộng ${value} điểm` : `Đã trừ ${value} điểm`);
      setAmount("");
      setHistoryPage(0);
    } catch (err) {
      const msg = errorMessage(err, "Không thể điều chỉnh điểm. Vui lòng thử lại.");
      setAdjustError(msg);
      toast.error(msg);
    }
  }

  const tier = loyalty?.tier ? TIER_META[loyalty.tier] : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Coins size={15} className="text-muted-foreground" /> Tóm tắt điểm thưởng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loyaltyLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded" />
                ))}
              </div>
            ) : loyaltyError ? (
              <p className="text-sm text-destructive">Không tải được thông tin tích điểm.</p>
            ) : loyalty ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hạng thành viên</span>
                  {loyalty.tier ? (
                    <Badge variant="outline" className={`text-xs ${tier?.cls ?? ""}`}>
                      {tier?.label ?? loyalty.tier}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Điểm hiện tại</span>
                  <span className="font-semibold text-foreground">
                    {(loyalty.points ?? 0).toLocaleString("vi-VN")} điểm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tem tích luỹ</span>
                  <span className="font-semibold text-foreground">
                    {(loyalty.stamps ?? 0).toLocaleString("vi-VN")}
                  </span>
                </div>
                {loyalty.id == null && (
                  <p className="text-xs text-muted-foreground/80">
                    Người dùng chưa có tài khoản tích điểm — sẽ được tạo ở lần điều chỉnh đầu tiên.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có thông tin tích điểm.</p>
            )}
          </CardContent>
        </Card>

        {/* Adjust Points Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={15} className="text-muted-foreground" /> Điều chỉnh điểm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {adjustError && (
              <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive">
                <AlertCircle size={14} /> {adjustError}
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">
                Số điểm
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Nhập số điểm..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">
                Loại điều chỉnh
              </label>
              <div className="flex gap-2">
                {(["ADD", "DEDUCT"] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={direction === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDirection(d)}
                    className="flex-1 gap-1.5 h-9"
                  >
                    {d === "ADD" ? <Plus size={14} /> : <Minus size={14} />}
                    {d === "ADD" ? "Cộng điểm" : "Trừ điểm"}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground/80">
              Giao dịch được ghi với loại «Điều chỉnh»; hạng thành viên tự tính lại theo tổng điểm.
            </p>
            <Button onClick={handleAdjust} disabled={adjusting} className="w-full">
              {adjusting ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Points History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History size={15} className="text-muted-foreground" /> Lịch sử giao dịch điểm
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : historyTotal === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Chưa có giao dịch điểm nào.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      {["Loại", "Điểm", "Đơn hàng", "Thời gian"].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2.5 px-3 text-xs text-muted-foreground font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyPageItems.map((tx) => {
                      const points = tx.points ?? 0;
                      return (
                        <tr
                          key={tx.id}
                          className="border-b border-border/40 hover:bg-secondary/40 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-xs">
                              {TX_LABEL[tx.type] ?? tx.type ?? "—"}
                            </Badge>
                          </td>
                          <td
                            className={`py-2.5 px-3 font-semibold ${
                              points >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-destructive"
                            }`}
                          >
                            {points > 0 ? "+" : ""}
                            {points.toLocaleString("vi-VN")}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs font-mono">
                            {tx.orderId ? `#${tx.orderId}` : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs whitespace-nowrap">
                            {formatDateTime(tx.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {historyTotal > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-muted-foreground">
                    {historyTotal} giao dịch
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={historyPage === 0}
                      onClick={() => setHistoryPage((p) => p - 1)}
                    >
                      Trước
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(historyPage + 1) * PAGE_SIZE >= historyTotal}
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
