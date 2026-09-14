import { useState } from "react";
import {
  Coins,
  TrendingUp,
  History,
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";
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
import type {
  LoyaltyTier,
  AdjustmentType,
  PointsHistoryItemDTO,
} from "~/types/admin/loyalty";
import { extractList } from "~/lib/extract-list";

interface Props {
  userId: number;
}

const TIER_META: Record<LoyaltyTier, { label: string; cls: string }> = {
  BRONZE: {
    label: "Đồng",
    cls: "bg-secondary text-foreground border-border",
  },
  SILVER: {
    label: "Bạc",
    cls: "bg-secondary text-foreground border-border",
  },
  GOLD: {
    label: "Vàng",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  PLATINUM: {
    label: "Bạch kim",
    cls: "bg-primary text-primary-foreground border-primary",
  },
};

const TX_META: Record<string, { label: string; sign: string; cls: string }> = {
  EARNED: { label: "Tích điểm", sign: "+", cls: "text-emerald-600 dark:text-emerald-400" },
  REDEEMED: { label: "Đổi thưởng", sign: "-", cls: "text-destructive" },
  ADD: { label: "Cộng điểm", sign: "+", cls: "text-emerald-600 dark:text-emerald-400" },
  DEDUCT: { label: "Trừ điểm", sign: "-", cls: "text-destructive" },
  REFUND: { label: "Hoàn điểm", sign: "+", cls: "text-foreground" },
  EXPIRED: { label: "Hết hạn", sign: "-", cls: "text-muted-foreground" },
};

export function UserLoyaltySection({ userId }: Props) {
  const { data: loyaltyData, isLoading: loyaltyLoading } =
    useGetUserLoyaltySummaryQuery(userId, { skip: !userId });
  const loyalty = loyaltyData?.data;

  const [adjustUserPoints] = useAdjustUserPointsMutation();
  const [historyPage, setHistoryPage] = useState(0);
  const { data: historyData, isLoading: historyLoading } =
    useGetUserLoyaltyHistoryQuery(
      { userId, page: historyPage, size: 10 },
      { skip: !userId },
    );
  const historyList = extractList<PointsHistoryItemDTO>(historyData?.data);
  const historyTotal = historyList.length;

  const [adjustForm, setAdjustForm] = useState({
    pointsAmount: "",
    adjustmentType: "ADD" as AdjustmentType,
    reason: "",
    adminNotes: "",
  });
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  async function handleAdjust() {
    if (!adjustForm.pointsAmount || !adjustForm.reason) {
      setAdjustError("Vui lòng nhập số điểm và lý do.");
      return;
    }
    setAdjusting(true);
    setAdjustError(null);
    try {
      await adjustUserPoints({
        userId,
        data: {
          pointsAmount: Number(adjustForm.pointsAmount),
          adjustmentType: adjustForm.adjustmentType,
          reason: adjustForm.reason,
          adminNotes: adjustForm.adminNotes || undefined,
        },
      }).unwrap();
      setAdjustForm({
        pointsAmount: "",
        adjustmentType: "ADD",
        reason: "",
        adminNotes: "",
      });
    } catch {
      setAdjustError("Không thể điều chỉnh điểm. Vui lòng thử lại.");
    } finally {
      setAdjusting(false);
    }
  }

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
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded" />
                ))}
              </div>
            ) : loyalty ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hạng thành viên</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${TIER_META[loyalty.currentTier]?.cls ?? ""}`}
                  >
                    {TIER_META[loyalty.currentTier]?.label ??
                      loyalty.currentTier}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Điểm hiện tại</span>
                  <span className="font-semibold text-foreground">
                    {(loyalty.currentPoints ?? 0).toLocaleString("vi-VN")} điểm
                  </span>
                </div>
                {loyalty.pointsToNextTier != null && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Đến hạng tiếp theo</span>
                      <span className="font-medium text-foreground">
                        {(loyalty.pointsToNextTier ?? 0).toLocaleString("vi-VN")} điểm nữa
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, 100 - (loyalty.pointsToNextTier / (loyalty.currentPoints + loyalty.pointsToNextTier + 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[
                    { label: "Đơn hàng", value: loyalty.totalOrders },
                    {
                      label: "Ngày tham gia",
                      value: `${loyalty.membershipDays} ngày`,
                    },
                    {
                      label: "Điểm đã kiếm",
                      value: (loyalty.totalPointsEarned ?? 0).toLocaleString("vi-VN"),
                    },
                    {
                      label: "Điểm đã dùng",
                      value:
                        (loyalty.totalPointsRedeemed ?? 0).toLocaleString("vi-VN"),
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-secondary/40 border border-border/50 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa có thông tin tích điểm.
              </p>
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
                placeholder="Nhập số điểm..."
                value={adjustForm.pointsAmount}
                onChange={(e) =>
                  setAdjustForm((f) => ({ ...f, pointsAmount: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">
                Loại điều chỉnh
              </label>
              <div className="flex gap-2">
                {(["ADD", "DEDUCT"] as AdjustmentType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={adjustForm.adjustmentType === t ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setAdjustForm((f) => ({ ...f, adjustmentType: t }))
                    }
                    className="flex-1 gap-1.5 h-9"
                  >
                    {t === "ADD" ? <Plus size={14} /> : <Minus size={14} />}
                    {t === "ADD" ? "Cộng điểm" : "Trừ điểm"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">
                Lý do <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="Lý do điều chỉnh..."
                value={adjustForm.reason}
                onChange={(e) =>
                  setAdjustForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">
                Ghi chú admin
              </label>
              <Input
                type="text"
                placeholder="Ghi chú nội bộ (tuỳ chọn)..."
                value={adjustForm.adminNotes}
                onChange={(e) =>
                  setAdjustForm((f) => ({ ...f, adminNotes: e.target.value }))
                }
              />
            </div>
            <Button
              onClick={handleAdjust}
              disabled={adjusting}
              className="w-full"
            >
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
          ) : historyList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Chưa có giao dịch điểm nào.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      {["Loại", "Điểm", "Trước/Sau", "Ngày"].map((h) => (
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
                    {historyList.map((tx) => {
                      const meta = TX_META[tx.transactionType] ?? {
                        label: tx.transactionType,
                        sign: "",
                        cls: "text-muted-foreground",
                      };
                      return (
                        <tr
                          key={tx.transactionId}
                          className="border-b border-border/40 hover:bg-secondary/40 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-xs">
                              {meta.label}
                            </Badge>
                          </td>
                          <td className={`py-2.5 px-3 font-semibold ${meta.cls}`}>
                            {meta.sign}
                            {(tx.pointsAmount ?? 0).toLocaleString("vi-VN")}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs">
                            {(tx.balanceBefore ?? 0).toLocaleString("vi-VN")} →{" "}
                            {(tx.balanceAfter ?? 0).toLocaleString("vi-VN")}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs whitespace-nowrap">
                            {new Date(tx.transactionDate).toLocaleDateString(
                              "vi-VN",
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {historyTotal > 10 && (
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
                      disabled={(historyPage + 1) * 10 >= historyTotal}
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
