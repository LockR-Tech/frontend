import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Users,
  UserPlus,
  Star,
  AlertCircle,
  RotateCcw,
  Coins,
  Award,
  Activity,
} from "lucide-react";
import { useGetLoyaltyStatisticsQuery } from "~/stores/apis/admin";
import type { LoyaltyTier } from "~/types/admin/loyalty";

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Thiếu trường (backend cũ) thì hiện "—" chứ không vẽ số 0.
function fmtNum(n?: number | null, digits = 0) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
}

const TIERS: LoyaltyTier[] = ["PLATINUM", "GOLD", "SILVER", "BRONZE"];

const TIER_META: Record<LoyaltyTier, { label: string; cls: string; bar: string }> = {
  BRONZE: {
    label: "Đồng",
    cls: "bg-orange-100 text-orange-700 border-orange-200",
    bar: "#ea580c",
  },
  SILVER: {
    label: "Bạc",
    cls: "bg-muted/50 text-foreground/80 border-border/50",
    bar: "#6b7280",
  },
  GOLD: {
    label: "Vàng",
    cls: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bar: "#eab308",
  },
  PLATINUM: {
    label: "Bạch kim",
    cls: "bg-indigo-100 text-indigo-700 border-indigo-200",
    bar: "#6366f1",
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

function MetricRows({
  rows,
  loading,
}: {
  rows: { label: string; value: string }[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <>
        {rows.map((r) => (
          <Skeleton key={r.label} className="h-8 rounded" />
        ))}
      </>
    );
  }
  return (
    <>
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
        >
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold text-foreground">{value}</span>
        </div>
      ))}
    </>
  );
}

export default function LoyaltyPage() {
  const { data, isLoading, isError, refetch } = useGetLoyaltyStatisticsQuery();
  const s = data?.data;

  const totalMembers = s?.totalMembers ?? s?.accounts;
  const tiers = s?.tierDistribution;
  const tierTotal = tiers
    ? Object.values(tiers).reduce((sum, n) => sum + (Number(n) || 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thống kê chương trình tích điểm"
        description="Tổng quan thành viên và điểm thưởng từ loyalty-service"
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
          label="Thành viên"
          value={fmtNum(totalMembers)}
          iconCls="text-blue-600"
          bgCls="bg-blue-50"
          loading={isLoading}
        />
        <StatCard
          icon={UserPlus}
          label="Thành viên mới tháng này"
          value={fmtNum(s?.newMembersThisMonth)}
          iconCls="text-emerald-600"
          bgCls="bg-emerald-50"
          loading={isLoading}
        />
        <StatCard
          icon={Activity}
          label="Hoạt động 30 ngày"
          value={fmtNum(s?.activeMembersLast30Days)}
          iconCls="text-green-600"
          bgCls="bg-green-50"
          loading={isLoading}
        />
        <StatCard
          icon={Coins}
          label="Điểm đang lưu hành"
          value={fmtNum(s?.totalPointsOutstanding)}
          iconCls="text-yellow-600"
          bgCls="bg-yellow-50"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Tier distribution ──────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award size={16} className="text-yellow-500" /> Phân bổ hạng thành viên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
            ) : !tiers ? (
              <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
            ) : (
              TIERS.map((tier) => {
                const count = Number(tiers[tier] ?? 0) || 0;
                const pct = tierTotal > 0 ? (count / tierTotal) * 100 : 0;
                const meta = TIER_META[tier];
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <Badge className={`w-20 justify-center text-xs ${meta.cls}`}>
                      {meta.label}
                    </Badge>
                    <div className="flex-1 bg-muted/50 rounded-full h-2">
                      <div
                        className="h-2 rounded-full opacity-60"
                        style={{ width: `${pct}%`, backgroundColor: meta.bar }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {fmtNum(count)}
                    </span>
                    <span className="text-xs text-muted-foreground/70 w-12">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Points metrics ─────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Coins size={16} className="text-yellow-500" /> Số liệu điểm thưởng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRows
              loading={isLoading}
              rows={[
                { label: "Tổng điểm đã phát", value: fmtNum(s?.pointsIssued) },
                { label: "Tổng điểm đã dùng", value: fmtNum(s?.pointsRedeemed) },
                {
                  label: "Điểm TB / thành viên",
                  value: s?.averagePoints != null ? `${fmtNum(s.averagePoints, 2)} điểm` : "—",
                },
                {
                  label: "Điểm trung vị / thành viên",
                  value: s?.medianPoints != null ? `${fmtNum(s.medianPoints, 2)} điểm` : "—",
                },
                { label: "Tổng giao dịch điểm", value: fmtNum(s?.transactions) },
              ]}
            />
          </CardContent>
        </Card>

        {/* ── This month ─────────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Star size={16} className="text-purple-500" /> Tháng này
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isLoading
              ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
              : [
                  { label: "Điểm đã phát", value: fmtNum(s?.pointsIssuedThisMonth) },
                  { label: "Điểm đã dùng", value: fmtNum(s?.pointsRedeemedThisMonth) },
                  { label: "Thành viên mới", value: fmtNum(s?.newMembersThisMonth) },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-base font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
