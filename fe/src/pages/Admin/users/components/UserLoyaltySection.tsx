import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Coins,
  TrendingUp,
  History,
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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

const TIER_META: Record<string, { labelKey: string; cls: string }> = {
  BRONZE: { labelKey: "admin.loyalty.tier.bronze", cls: "bg-secondary text-foreground border-border" },
  SILVER: { labelKey: "admin.loyalty.tier.silver", cls: "bg-secondary text-foreground border-border" },
  GOLD: {
    labelKey: "admin.loyalty.tier.gold",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  PLATINUM: { labelKey: "admin.loyalty.tier.platinum", cls: "bg-primary text-primary-foreground border-primary" },
};

// Mọi loại giao dịch loyalty-service ghi; loại lạ hiện nguyên mã.
const TX_LABEL_KEY: Record<string, string> = {
  ORDER_EARN: "admin.users.loyalty.txType.orderEarn",
  ORDER_REDEEM: "admin.users.loyalty.txType.orderRedeem",
  ORDER_REDEEM_REFUND: "admin.users.loyalty.txType.orderRedeemRefund",
  ORDER_EARN_REVERSAL: "admin.users.loyalty.txType.orderEarnReversal",
  VOUCHER_EXCHANGE: "admin.users.loyalty.txType.voucherExchange",
  VOUCHER_EXCHANGE_REFUND: "admin.users.loyalty.txType.voucherExchangeRefund",
  ADJUSTMENT: "admin.users.loyalty.txType.adjustment",
  REDEEM: "admin.users.loyalty.txType.redeem",
};

const HISTORY_COLUMN_KEYS = [
  "admin.users.loyalty.columns.type",
  "admin.users.loyalty.columns.points",
  "common.order",
  "common.time",
];

function errorMessage(err: unknown, fallback: string) {
  const e = err as { data?: { message?: unknown } } | undefined;
  return typeof e?.data?.message === "string" && e.data.message.trim()
    ? e.data.message
    : fallback;
}

export function UserLoyaltySection({ userId }: Props) {
  const { t } = useTranslation();
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
      setAdjustError(t("admin.users.loyalty.enterPositive"));
      return;
    }
    // Backend không chặn số dư âm nên kiểm tra tại đây.
    if (direction === "DEDUCT" && value > (loyalty?.points ?? 0)) {
      setAdjustError(t("admin.users.loyalty.cannotDeductMore"));
      return;
    }
    setAdjustError(null);
    try {
      await adjustUserPoints({
        userId,
        points: direction === "ADD" ? value : -value,
        type: ADJUST_TYPE,
      }).unwrap();
      toast.success(
        direction === "ADD"
          ? t("admin.users.loyalty.added", { value })
          : t("admin.users.loyalty.deducted", { value }),
      );
      setAmount("");
      setHistoryPage(0);
    } catch (err) {
      const msg = errorMessage(err, t("admin.users.loyalty.adjustFailed"));
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
              <Coins size={15} className="text-muted-foreground" /> {t("admin.users.loyalty.summaryTitle")}
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
              <p className="text-sm text-destructive">{t("admin.users.loyalty.loadFailed")}</p>
            ) : loyalty ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("admin.users.loyalty.tier")}</span>
                  {loyalty.tier ? (
                    <Badge variant="outline" className={`text-xs ${tier?.cls ?? ""}`}>
                      {tier ? t(tier.labelKey) : loyalty.tier}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("admin.users.loyalty.currentPoints")}</span>
                  <span className="font-semibold text-foreground">
                    {t("admin.users.loyalty.pointsValue", {
                      points: (loyalty.points ?? 0).toLocaleString("vi-VN"),
                    })}
                  </span>
                </div>
                {loyalty.lifetimePoints != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("admin.users.loyalty.lifetimePoints")}
                    </span>
                    <span className="font-semibold text-foreground">
                      {t("admin.users.loyalty.pointsValue", {
                        points: loyalty.lifetimePoints.toLocaleString("vi-VN"),
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("admin.users.loyalty.stamps")}</span>
                  <span className="font-semibold text-foreground">
                    {(loyalty.stamps ?? 0).toLocaleString("vi-VN")}
                  </span>
                </div>
                {loyalty.id == null && (
                  <p className="text-xs text-muted-foreground/80">
                    {t("admin.users.loyalty.noAccount")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("admin.users.loyalty.noInfo")}</p>
            )}
          </CardContent>
        </Card>

        {/* Adjust Points Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={15} className="text-muted-foreground" /> {t("admin.users.loyalty.adjustTitle")}
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
                {t("admin.users.loyalty.amount")}
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder={t("admin.users.loyalty.amountPlaceholder")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">
                {t("admin.users.loyalty.direction")}
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
                    {d === "ADD" ? t("admin.users.loyalty.add") : t("admin.users.loyalty.deduct")}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground/80">
              {t("admin.users.loyalty.adjustHint")}
            </p>
            <Button onClick={handleAdjust} disabled={adjusting} className="w-full">
              {adjusting ? t("admin.users.loyalty.processing") : t("admin.users.loyalty.confirmAdjust")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Points History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History size={15} className="text-muted-foreground" /> {t("admin.users.loyalty.historyTitle")}
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
              {t("admin.users.loyalty.noHistory")}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      {HISTORY_COLUMN_KEYS.map((h) => (
                        <th
                          key={h}
                          className="text-left py-2.5 px-3 text-xs text-muted-foreground font-medium"
                        >
                          {t(h)}
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
                              {TX_LABEL_KEY[tx.type] ? t(TX_LABEL_KEY[tx.type]) : (tx.type ?? "—")}
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
                            {tx.orderId ? (
                              <Link
                                to={`/admin/orders/${tx.orderId}`}
                                className="text-primary hover:underline"
                              >
                                #{tx.orderId}
                              </Link>
                            ) : (
                              "—"
                            )}
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
                    {t("admin.users.loyalty.transactionsCount", { count: historyTotal })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={historyPage === 0}
                      onClick={() => setHistoryPage((p) => p - 1)}
                    >
                      {t("pagination.previous")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(historyPage + 1) * PAGE_SIZE >= historyTotal}
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      {t("pagination.next")}
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
