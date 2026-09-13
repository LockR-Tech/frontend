import { useState } from "react";
import {
  Award,
  Coins,
  TrendingUp,
  History,
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "~/components/ui/button";
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
    cls: "bg-orange-100 text-orange-700 border-orange-200",
  },
  SILVER: { label: "Bạc", cls: "bg-muted/50 text-foreground/80 border-border/50" },
  GOLD: {
    label: "Vàng",
    cls: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  PLATINUM: {
    label: "Bạch kim",
    cls: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
};

const TX_META: Record<string, { label: string; sign: string; cls: string }> = {
  EARNED: { label: "Tích điểm", sign: "+", cls: "text-green-600" },
  REDEEMED: { label: "Đổi thưởng", sign: "-", cls: "text-red-600" },
  ADD: { label: "Cộng điểm", sign: "+", cls: "text-blue-600" },
  DEDUCT: { label: "Trừ điểm", sign: "-", cls: "text-orange-600" },
  REFUND: { label: "Hoàn điểm", sign: "+", cls: "text-teal-600" },
  EXPIRED: { label: "Hết hạn", sign: "-", cls: "text-muted-foreground/70" },
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
      setAdjustError("Điều chỉnh thất bại. Vui lòng thử lại.");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <Award size={16} className="text-yellow-500" /> Chương trình tích điểm
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Summary */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Coins size={14} className="text-yellow-500" /> Tóm tắt điểm
              thưởng
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
                  <span className="font-semibold">
                    {(loyalty.currentPoints ?? 0).toLocaleString("vi-VN")} điểm
                  </span>
                </div>
                {loyalty.pointsToNextTier != null && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground/70 mb-1">
                      <span>Đến hạng tiếp theo</span>
                      <span>
                        {(loyalty.pointsToNextTier ?? 0).toLocaleString("vi-VN")} điểm
                        nữa
                      </span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full">
                      <div
                        className="h-2 rounded-full bg-yellow-400"
                        style={{
                          width: `${Math.min(100, 100 - (loyalty.pointsToNextTier / (loyalty.currentPoints + loyalty.pointsToNextTier + 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
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
                    <div key={label} className="bg-muted/30 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground/70">{label}</p>
                      <p className="text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/70">
                Chưa có thông tin tích điểm.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Adjust Points Form */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-500" /> Điều chỉnh điểm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {adjustError && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle size={14} /> {adjustError}
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Số điểm
              </label>
              <input
                type="number"
                min="1"
                placeholder="Nhập số điểm..."
                value={adjustForm.pointsAmount}
                onChange={(e) =>
                  setAdjustForm((f) => ({ ...f, pointsAmount: e.target.value }))
                }
                className="w-full text-sm border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Loại điều chỉnh
              </label>
              <div className="flex gap-2">
                {(["ADD", "DEDUCT"] as AdjustmentType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setAdjustForm((f) => ({ ...f, adjustmentType: t }))
                    }
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm border transition-colors ${
                      adjustForm.adjustmentType === t
                        ? t === "ADD"
                          ? "bg-green-50 border-green-300 text-green-700"
                          : "bg-red-50 border-red-300 text-red-700"
                        : "border-border/50 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {t === "ADD" ? <Plus size={14} /> : <Minus size={14} />}
                    {t === "ADD" ? "Cộng" : "Trừ"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Lý do <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Lý do điều chỉnh..."
                value={adjustForm.reason}
                onChange={(e) =>
                  setAdjustForm((f) => ({ ...f, reason: e.target.value }))
                }
                className="w-full text-sm border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Ghi chú admin
              </label>
              <input
                type="text"
                placeholder="Ghi chú nội bộ (tuỳ chọn)..."
                value={adjustForm.adminNotes}
                onChange={(e) =>
                  setAdjustForm((f) => ({ ...f, adminNotes: e.target.value }))
                }
                className="w-full text-sm border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <Button
              onClick={handleAdjust}
              disabled={adjusting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              {adjusting ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Points History */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History size={14} className="text-purple-500" /> Lịch sử giao dịch
            điểm
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
            <p className="text-sm text-muted-foreground/70 text-center py-6">
              Chưa có giao dịch điểm nào.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {["Loại", "Điểm", "Trước/Sau", "Ngày"].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2 px-2 text-xs text-muted-foreground font-medium"
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
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="py-2 px-2">
                            <Badge variant="outline" className="text-xs">
                              {meta.label}
                            </Badge>
                          </td>
                          <td className={`py-2 px-2 font-semibold ${meta.cls}`}>
                            {meta.sign}
                            {(tx.pointsAmount ?? 0).toLocaleString("vi-VN")}
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            {(tx.balanceBefore ?? 0).toLocaleString("vi-VN")} →{" "}
                            {(tx.balanceAfter ?? 0).toLocaleString("vi-VN")}
                          </td>
                          <td className="py-2 px-2 text-muted-foreground/70 text-xs whitespace-nowrap">
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
                  <span className="text-xs text-muted-foreground/70">
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
