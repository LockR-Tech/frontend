import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Users,
  Star,
  TrendingUp,
  Gift,
  AlertCircle,
  RotateCcw,
  Coins,
  Award,
  Activity,
  DollarSign,
} from "lucide-react";
import { useGetLoyaltyStatisticsQuery } from "~/stores/apis/admin";
import type { LoyaltyTier } from "~/types/admin/loyalty";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtNum(n?: number) {
  return (n ?? 0).toLocaleString("vi-VN");
}
function fmtCurrency(n?: number) {
  return (n ?? 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });
}
function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN");
}

const TIER_META: Record<LoyaltyTier, { label: string; cls: string }> = {
  BRONZE: {
    label: "Đồng",
    cls: "bg-orange-100 text-orange-700 border-orange-200",
  },
  SILVER: { label: "Bạc", cls: "bg-muted/50  text-foreground/80  border-border/50" },
  GOLD: {
    label: "Vàng",
    cls: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  PLATINUM: {
    label: "Bạch kim",
    cls: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconCls,
  bgCls,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  iconCls: string;
  bgCls: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${bgCls} flex items-center justify-center shrink-0`}
          >
            <Icon size={20} className={iconCls} />
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-6 w-20 mb-1" />
            ) : (
              <p className="text-xl font-bold text-foreground">{value}</p>
            )}
            <p className="text-sm text-muted-foreground">{label}</p>
            {sub && !loading && <p className="text-xs text-muted-foreground/70">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoyaltyPage() {
  const { data, isLoading, isError, refetch } = useGetLoyaltyStatisticsQuery();
  const s = data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thống kê chương trình tích điểm"
        description="Tổng quan chỉ số khách hàng thân thiết và điểm thưởng"
      />

      {isError && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700 flex-1">Không thể tải dữ liệu.</p>
          <button
            onClick={refetch}
            className="flex items-center gap-1 text-sm text-red-700 font-medium hover:underline"
          >
            <RotateCcw size={14} /> Thử lại
          </button>
        </div>
      )}

      {/* ── Overview KPI ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Khách đã đăng ký"
          value={fmtNum(s?.overview?.totalCustomersEnrolled)}
          iconCls="text-blue-600"
          bgCls="bg-blue-50"
          loading={isLoading}
        />
        <StatCard
          icon={Activity}
          label="Hoạt động 30 ngày"
          value={fmtNum(s?.overview?.activeCustomersLast30Days)}
          iconCls="text-green-600"
          bgCls="bg-green-50"
          loading={isLoading}
        />
        <StatCard
          icon={Coins}
          label="Điểm đang lưu hành"
          value={fmtNum(s?.pointsMetrics?.totalPointsOutstanding)}
          iconCls="text-yellow-600"
          bgCls="bg-yellow-50"
          loading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Tỷ lệ tương tác"
          value={
            s?.engagementMetrics
              ? `${s.engagementMetrics.programEngagementRate.toFixed(1)}%`
              : "—"
          }
          iconCls="text-purple-600"
          bgCls="bg-purple-50"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Tier distribution ──────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award size={16} className="text-yellow-500" /> Phân bổ hạng thành
              viên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))
              : (["PLATINUM", "GOLD", "SILVER", "BRONZE"] as LoyaltyTier[]).map(
                  (tier) => {
                    const stat = s?.tierDistribution?.[tier];
                    const meta = TIER_META[tier];
                    return (
                      <div key={tier} className="flex items-center gap-3">
                        <Badge
                          className={`w-20 justify-center text-xs ${meta.cls}`}
                        >
                          {meta.label}
                        </Badge>
                        <div className="flex-1 bg-muted/50 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-current opacity-50"
                            style={{
                              width: `${stat?.percentage ?? 0}%`,
                              backgroundColor:
                                tier === "PLATINUM"
                                  ? "#6366f1"
                                  : tier === "GOLD"
                                    ? "#eab308"
                                    : tier === "SILVER"
                                      ? "#6b7280"
                                      : "#ea580c",
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {fmtNum(stat?.count)}
                        </span>
                        <span className="text-xs text-muted-foreground/70 w-12">
                          {stat?.percentage?.toFixed(1) ?? 0}%
                        </span>
                      </div>
                    );
                  },
                )}
          </CardContent>
        </Card>

        {/* ── Points metrics ─────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Coins size={16} className="text-yellow-500" /> Số liệu điểm
              thưởng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded" />
                ))
              : [
                  {
                    label: "Tổng điểm đã phát",
                    value: fmtNum(s?.pointsMetrics?.totalPointsDistributed),
                  },
                  {
                    label: "Tổng điểm đã dùng",
                    value: fmtNum(s?.pointsMetrics?.totalPointsRedeemed),
                  },
                  {
                    label: "Điểm TB / khách",
                    value: `${(s?.pointsMetrics?.averagePointsPerCustomer ?? 0).toFixed(1)} điểm`,
                  },
                  {
                    label: "Điểm trung vị / khách",
                    value: `${fmtNum(s?.pointsMetrics?.medianPointsPerCustomer)} điểm`,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {value}
                    </span>
                  </div>
                ))}
          </CardContent>
        </Card>

        {/* ── Rewards metrics ────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gift size={16} className="text-pink-500" /> Số liệu phần thưởng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 rounded" />
              ))
            ) : (
              <>
                {[
                  {
                    label: "Danh mục phần thưởng",
                    value: fmtNum(s?.rewardsMetrics?.totalRewardsCatalog),
                  },
                  {
                    label: "Lượt đổi thưởng",
                    value: fmtNum(s?.rewardsMetrics?.rewardsRedeemed),
                  },
                  {
                    label: "Chi phí phần thưởng",
                    value: fmtCurrency(s?.rewardsMetrics?.totalRewardsCost),
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-border/20"
                  >
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {value}
                    </span>
                  </div>
                ))}
                {s?.rewardsMetrics?.mostPopularReward && (
                  <div className="p-3 bg-pink-50 rounded-lg">
                    <p className="text-xs text-pink-600 font-medium">
                      Phần thưởng phổ biến nhất
                    </p>
                    <p className="text-sm font-semibold text-pink-900 mt-0.5">
                      {s.rewardsMetrics?.mostPopularReward?.name}
                    </p>
                    <p className="text-xs text-pink-500">
                      {fmtNum(
                        s.rewardsMetrics?.mostPopularReward?.timesRedeemed,
                      )}{" "}
                      lần đổi
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Financial impact + Engagement ──────────────────────────────── */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign size={16} className="text-green-500" /> Tác động tài
                chính
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading
                ? [...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-8 rounded" />
                  ))
                : [
                    {
                      label: "Chi phí ước tính",
                      value: fmtCurrency(
                        s?.financialImpact?.estimatedRewardCost,
                      ),
                    },
                    {
                      label: "Giá trị giảm giá",
                      value: fmtCurrency(
                        s?.financialImpact?.estimatedDiscountValue,
                      ),
                    },
                    {
                      label: "ROI",
                      value: s?.financialImpact
                        ? `${s.financialImpact.roi.toFixed(1)}x`
                        : "—",
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-foreground">
                        {value}
                      </span>
                    </div>
                  ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Star size={16} className="text-purple-500" /> Tháng này
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {isLoading
                ? [...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))
                : [
                    {
                      label: "Điểm phát",
                      value: fmtNum(s?.timeSeriesData?.pointsEarnedThisMonth),
                    },
                    {
                      label: "Điểm dùng",
                      value: fmtNum(s?.timeSeriesData?.pointsRedeemedThisMonth),
                    },
                    {
                      label: "Đăng ký mới",
                      value: fmtNum(s?.timeSeriesData?.newEnrollmentsThisMonth),
                    },
                    {
                      label: "GD / ngày",
                      value: `${s?.timeSeriesData?.averageTransactionsPerDay?.toFixed(0) ?? 0}`,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="text-center p-2 bg-muted/30 rounded-lg"
                    >
                      <p className="text-base font-bold text-foreground">
                        {value}
                      </p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {s?.lastUpdated && (
        <p className="text-xs text-muted-foreground/70 text-right">
          Cập nhật lần cuối: {fmtDate(s.lastUpdated)}
        </p>
      )}
    </div>
  );
}
