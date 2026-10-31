import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createColumnHelper } from "@tanstack/react-table";
import { PageHeader } from "~/components/shared/page-header";
import { DataTable } from "~/components/shared/data-table";
import {
  DateRangeFilter,
  ReportStatCard,
  defaultReportRange,
  type DateRangeValue,
} from "~/components/shared/reporting";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
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
  Minus,
  Plus,
  Scale,
  Receipt,
  Search,
} from "lucide-react";
import {
  useGetAllUsersQuery,
  useGetDeletedUsersQuery,
  useGetLoyaltyMembersQuery,
  useGetLoyaltyPeriodSummaryQuery,
  useGetLoyaltyStatisticsQuery,
} from "~/stores/apis/admin";
import { extractList } from "~/lib/extract-list";
import { formatDateTime } from "~/lib/datetime";
import { LoyaltyTransactionsPanel } from "./components/LoyaltyTransactionsPanel";
import { FilterChip, UserCell, fmtNum, type UserInfo } from "./components/loyalty-shared";
import type {
  LoyaltyMemberDTO,
  LoyaltyTier,
  LoyaltyTransactionScope,
} from "~/types/admin/loyalty";

const TIERS: LoyaltyTier[] = ["PLATINUM", "GOLD", "SILVER", "BRONZE"];

const TIER_META: Record<LoyaltyTier, { labelKey: string; cls: string; bar: string }> = {
  BRONZE: {
    labelKey: "admin.loyalty.tier.bronze",
    cls: "bg-orange-100 text-orange-700 border-orange-200",
    bar: "#ea580c",
  },
  SILVER: {
    labelKey: "admin.loyalty.tier.silver",
    cls: "bg-muted/50 text-foreground/80 border-border/50",
    bar: "#6b7280",
  },
  GOLD: {
    labelKey: "admin.loyalty.tier.gold",
    cls: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bar: "#eab308",
  },
  PLATINUM: {
    labelKey: "admin.loyalty.tier.platinum",
    cls: "bg-indigo-100 text-indigo-700 border-indigo-200",
    bar: "#6366f1",
  },
};

type MemberSegment = "ALL" | "NEW" | "ACTIVE" | "OUTSTANDING" | LoyaltyTier;

const SEGMENTS: { value: MemberSegment; labelKey: string }[] = [
  { value: "ALL", labelKey: "common.all" },
  { value: "NEW", labelKey: "admin.loyalty.stats.newThisMonth" },
  { value: "ACTIVE", labelKey: "admin.loyalty.stats.active30d" },
  { value: "OUTSTANDING", labelKey: "admin.loyalty.list.hasPoints" },
  ...TIERS.map((tier) => ({ value: tier, labelKey: TIER_META[tier].labelKey })),
];

const SEGMENT_FILTER: Record<MemberSegment, (member: LoyaltyMemberDTO) => boolean> = {
  ALL: () => true,
  NEW: (member) => member.newThisMonth,
  ACTIVE: (member) => member.active30Days,
  OUTSTANDING: (member) => member.points > 0,
  BRONZE: (member) => member.tier === "BRONZE",
  SILVER: (member) => member.tier === "SILVER",
  GOLD: (member) => member.tier === "GOLD",
  PLATINUM: (member) => member.tier === "PLATINUM",
};

const MEMBER_PAGE_SIZE = 10;

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconCls,
  bgCls,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: React.ReactNode;
  iconCls: string;
  bgCls: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="cursor-pointer border-0 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
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
            {sub && !loading && <div className="mt-0.5 text-xs text-muted-foreground/70">{sub}</div>}
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
  rows: { label: string; value: string; hint?: string; onClick: () => void }[];
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
      {rows.map(({ label, value, hint, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="flex w-full items-center justify-between gap-3 border-b border-border/20 py-2 text-left last:border-0 hover:bg-muted/40"
        >
          <span className="text-sm text-muted-foreground">
            {label}
            {hint && <span className="block text-xs text-muted-foreground/70">{hint}</span>}
          </span>
          <span className="text-sm font-semibold text-foreground">{value}</span>
        </button>
      ))}
    </>
  );
}

export default function LoyaltyPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useGetLoyaltyStatisticsQuery();
  const s = data?.data;

  const totalMembers = s?.totalMembers ?? s?.accounts;
  const tiers = s?.tierDistribution;
  const tierTotal = tiers
    ? Object.values(tiers).reduce((sum, n) => sum + (Number(n) || 0), 0)
    : 0;

  const membersQuery = useGetLoyaltyMembersQuery();
  const members = useMemo(() => membersQuery.data?.data ?? [], [membersQuery.data]);
  const [segment, setSegment] = useState<MemberSegment>("ALL");
  const [search, setSearch] = useState("");
  const [memberPage, setMemberPage] = useState(0);

  const [range, setRange] = useState<DateRangeValue>(defaultReportRange);
  const { data: periodData, isLoading: isPeriodLoading } = useGetLoyaltyPeriodSummaryQuery(range, {
    skip: !range.from || !range.to,
  });
  const period = periodData?.data;
  // Đổi key ⇒ bảng giao dịch mở lại đúng bộ lọc của con số vừa bấm.
  const [panelRequest, setPanelRequest] = useState<{
    key: number;
    scope: LoyaltyTransactionScope;
    range: DateRangeValue;
  }>({ key: 0, scope: "ALL", range });
  const [selectedMember, setSelectedMember] = useState<{
    member: LoyaltyMemberDTO;
    scope: LoyaltyTransactionScope;
  } | null>(null);

  const membersRef = useRef<HTMLDivElement>(null);
  const transactionsRef = useRef<HTMLDivElement>(null);

  // Cùng tham số với các trang khác để dùng chung cache; người đã xoá lấy riêng để vẫn hiện được tên.
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const { data: deletedUsersData } = useGetDeletedUsersQuery();
  const userById = useMemo(() => {
    const map = new Map<number, UserInfo>();
    for (const u of deletedUsersData?.data ?? []) {
      map.set(u.id, { name: u.fullName, contact: u.email || u.phoneNumber || "", deleted: true });
    }
    for (const u of extractList<{ id: number; fullName?: string; name?: string; email?: string; phoneNumber?: string }>(usersData?.data)) {
      map.set(u.id, {
        name: (u.fullName || u.name || "").trim(),
        contact: u.email || u.phoneNumber || "",
        deleted: false,
      });
    }
    return map;
  }, [usersData, deletedUsersData]);

  const showMembers = (next: MemberSegment) => {
    setSegment(next);
    setSearch("");
    setMemberPage(0);
    membersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const showTransactions = (scope: LoyaltyTransactionScope, nextRange: DateRangeValue) => {
    setPanelRequest((prev) => ({ key: prev.key + 1, scope, range: nextRange }));
    transactionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const allTime: DateRangeValue = { from: "", to: "" };
  const signedPoints = (member: LoyaltyMemberDTO, scope: LoyaltyTransactionScope, value: number) => (
    <button
      type="button"
      onClick={() => setSelectedMember({ member, scope })}
      className={`font-semibold hover:underline ${scope === "ISSUED" ? "text-emerald-600" : "text-rose-600"}`}
    >
      {scope === "ISSUED" ? "+" : "−"}
      {fmtNum(value)}
    </button>
  );

  const segmentMembers = useMemo(() => members.filter(SEGMENT_FILTER[segment]), [members, segment]);
  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return segmentMembers;
    return segmentMembers.filter((member) => {
      const user = userById.get(member.userId);
      return (
        String(member.userId).includes(query) ||
        user?.name.toLowerCase().includes(query) ||
        user?.contact.toLowerCase().includes(query)
      );
    });
  }, [segmentMembers, search, userById]);
  const pagedMembers = filteredMembers.slice(memberPage * MEMBER_PAGE_SIZE, (memberPage + 1) * MEMBER_PAGE_SIZE);
  const segmentPoints = filteredMembers.reduce((sum, member) => sum + member.points, 0);

  const memberColumn = createColumnHelper<LoyaltyMemberDTO>();
  const memberColumns = [
    memberColumn.display({
      id: "rank",
      header: "#",
      cell: ({ row }) => <span className="text-muted-foreground">{memberPage * MEMBER_PAGE_SIZE + row.index + 1}</span>,
    }),
    memberColumn.accessor("userId", {
      header: t("admin.loyalty.list.member"),
      cell: ({ row }) => <UserCell userId={row.original.userId} user={userById.get(row.original.userId)} />,
    }),
    memberColumn.accessor("tier", {
      header: t("admin.loyalty.list.tier"),
      cell: ({ row }) => {
        const meta = TIER_META[row.original.tier];
        return <Badge className={`text-xs ${meta?.cls ?? ""}`}>{meta ? t(meta.labelKey) : row.original.tier}</Badge>;
      },
    }),
    memberColumn.accessor("points", {
      header: t("admin.loyalty.list.points"),
      cell: ({ row }) => <span className="font-semibold">{fmtNum(row.original.points)}</span>,
    }),
    memberColumn.accessor("lifetimePoints", {
      header: t("admin.loyalty.list.lifetimePoints"),
      cell: ({ row }) => fmtNum(row.original.lifetimePoints),
    }),
    memberColumn.accessor("pointsIssued", {
      header: t("admin.loyalty.list.plusPoints"),
      cell: ({ row }) => signedPoints(row.original, "ISSUED", row.original.pointsIssued),
    }),
    memberColumn.accessor("pointsRedeemed", {
      header: t("admin.loyalty.list.minusPoints"),
      cell: ({ row }) => signedPoints(row.original, "REDEEMED", row.original.pointsRedeemed),
    }),
    memberColumn.accessor("transactionCount", {
      header: t("admin.loyalty.list.transactions"),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setSelectedMember({ member: row.original, scope: "ALL" })}
          className="font-medium text-primary hover:underline"
        >
          {fmtNum(row.original.transactionCount)}
        </button>
      ),
    }),
    memberColumn.accessor("joinedAt", {
      header: t("admin.loyalty.list.joinedAt"),
      cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.joinedAt)}</span>,
    }),
    memberColumn.accessor("lastTransactionAt", {
      header: t("admin.loyalty.list.lastTransaction"),
      cell: ({ row }) => (
        <span className="text-xs">{row.original.lastTransactionAt ? formatDateTime(row.original.lastTransactionAt) : "—"}</span>
      ),
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.loyalty.title")}
        description={t("admin.loyalty.description")}
      />

      {isError && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{t("admin.loyalty.loadFailed")}</p>
          <button
            onClick={refetch}
            className="flex items-center gap-1 text-sm text-red-700 font-medium hover:underline"
          >
            <RotateCcw size={14} /> {t("common.retry")}
          </button>
        </div>
      )}

      {/* ── Điểm cộng/trừ trong kỳ ──────────────────────────────────────── */}
      <DateRangeFilter value={range} onChange={setRange} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportStatCard
          label={t("admin.loyalty.period.issued")}
          value={`+${fmtNum(period?.current.issued)}`}
          icon={Plus}
          changePct={period?.issuedPct}
          hint={t("admin.loyalty.period.hint")}
          isLoading={isPeriodLoading}
          onClick={() => showTransactions("ISSUED", range)}
        />
        <ReportStatCard
          label={t("admin.loyalty.period.redeemed")}
          value={`−${fmtNum(period?.current.redeemed)}`}
          icon={Minus}
          changePct={period?.redeemedPct}
          hint={t("admin.loyalty.period.hint")}
          isLoading={isPeriodLoading}
          onClick={() => showTransactions("REDEEMED", range)}
        />
        <ReportStatCard
          label={t("admin.loyalty.period.net")}
          value={fmtNum(period?.current.net)}
          icon={Scale}
          changePct={period?.netPct}
          hint={t("admin.loyalty.period.netHint")}
          isLoading={isPeriodLoading}
          onClick={() => showTransactions("ALL", range)}
        />
        <ReportStatCard
          label={t("admin.loyalty.metrics.transactions")}
          value={fmtNum(period?.current.transactions)}
          icon={Receipt}
          changePct={period?.transactionsPct}
          hint={t("admin.loyalty.period.hint")}
          isLoading={isPeriodLoading}
          onClick={() => showTransactions("ALL", range)}
        />
      </div>

      {/* ── Overview KPI ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t("admin.loyalty.stats.members")}
          value={fmtNum(totalMembers)}
          iconCls="text-blue-600"
          bgCls="bg-blue-50"
          loading={isLoading}
          onClick={() => showMembers("ALL")}
        />
        <StatCard
          icon={UserPlus}
          label={t("admin.loyalty.stats.newThisMonth")}
          value={fmtNum(s?.newMembersThisMonth)}
          iconCls="text-emerald-600"
          bgCls="bg-emerald-50"
          loading={isLoading}
          onClick={() => showMembers("NEW")}
        />
        <StatCard
          icon={Activity}
          label={t("admin.loyalty.stats.active30d")}
          value={fmtNum(s?.activeMembersLast30Days)}
          iconCls="text-green-600"
          bgCls="bg-green-50"
          loading={isLoading}
          onClick={() => showMembers("ACTIVE")}
        />
        <StatCard
          icon={Coins}
          label={t("admin.loyalty.stats.outstanding")}
          value={fmtNum(s?.totalPointsOutstanding)}
          sub={
            period && (
              <span className="flex flex-wrap gap-x-2">
                <button
                  type="button"
                  className="font-semibold text-emerald-600 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    showTransactions("ISSUED", range);
                  }}
                >
                  +{fmtNum(period.current.issued)}
                </button>
                <button
                  type="button"
                  className="font-semibold text-rose-600 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    showTransactions("REDEEMED", range);
                  }}
                >
                  −{fmtNum(period.current.redeemed)}
                </button>
                <span>{t("admin.loyalty.period.inRange")}</span>
              </span>
            )
          }
          iconCls="text-yellow-600"
          bgCls="bg-yellow-50"
          loading={isLoading}
          onClick={() => showMembers("OUTSTANDING")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Tier distribution ──────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award size={16} className="text-yellow-500" /> {t("admin.loyalty.tierDistribution")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("admin.loyalty.tierBasisHint")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
            ) : !tiers ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("common.noDataYet")}</p>
            ) : (
              TIERS.map((tier) => {
                const count = Number(tiers[tier] ?? 0) || 0;
                const pct = tierTotal > 0 ? (count / tierTotal) * 100 : 0;
                const meta = TIER_META[tier];
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => showMembers(tier)}
                    className="flex w-full items-center gap-3 rounded-md p-1 text-left hover:bg-muted/40"
                  >
                    <Badge className={`w-20 justify-center text-xs ${meta.cls}`}>
                      {t(meta.labelKey)}
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
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Points metrics ─────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Coins size={16} className="text-yellow-500" /> {t("admin.loyalty.pointsMetrics")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRows
              loading={isLoading}
              rows={[
                {
                  label: t("admin.loyalty.metrics.issued"),
                  value: fmtNum(s?.pointsIssued),
                  onClick: () => showTransactions("ISSUED", allTime),
                },
                {
                  label: t("admin.loyalty.metrics.redeemed"),
                  value: fmtNum(s?.pointsRedeemed),
                  onClick: () => showTransactions("REDEEMED", allTime),
                },
                {
                  label: t("admin.loyalty.metrics.average"),
                  value:
                    s?.averagePoints != null
                      ? t("admin.loyalty.metrics.pointsValue", { value: fmtNum(s.averagePoints, 2) })
                      : "—",
                  hint: t("admin.loyalty.metrics.averageHint", {
                    points: fmtNum(s?.totalPointsOutstanding),
                    members: fmtNum(totalMembers),
                  }),
                  onClick: () => showMembers("ALL"),
                },
                {
                  label: t("admin.loyalty.metrics.median"),
                  value:
                    s?.medianPoints != null
                      ? t("admin.loyalty.metrics.pointsValue", { value: fmtNum(s.medianPoints, 2) })
                      : "—",
                  hint: t("admin.loyalty.metrics.medianHint"),
                  onClick: () => showMembers("ALL"),
                },
                {
                  label: t("admin.loyalty.metrics.transactions"),
                  value: fmtNum(s?.transactions),
                  onClick: () => showTransactions("ALL", allTime),
                },
              ]}
            />
          </CardContent>
        </Card>

        {/* ── This month ─────────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Star size={16} className="text-purple-500" /> {t("admin.loyalty.thisMonth")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isLoading
              ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
              : [
                  {
                    label: t("admin.loyalty.month.issued"),
                    value: fmtNum(s?.pointsIssuedThisMonth),
                    onClick: () => showTransactions("ISSUED", defaultReportRange()),
                  },
                  {
                    label: t("admin.loyalty.month.redeemed"),
                    value: fmtNum(s?.pointsRedeemedThisMonth),
                    onClick: () => showTransactions("REDEEMED", defaultReportRange()),
                  },
                  {
                    label: t("admin.loyalty.month.newMembers"),
                    value: fmtNum(s?.newMembersThisMonth),
                    onClick: () => showMembers("NEW"),
                  },
                ].map(({ label, value, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className="rounded-lg bg-muted/30 p-2 text-center hover:bg-muted/60"
                  >
                    <p className="text-base font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </button>
                ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Danh sách thành viên sau các con số ─────────────────────────── */}
      <div ref={membersRef} className="scroll-mt-20">
        <Card className="border-0 shadow-sm">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users size={16} className="text-blue-500" /> {t("admin.loyalty.list.membersTitle")}
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setMemberPage(0);
                  }}
                  placeholder={t("admin.loyalty.list.searchPlaceholder")}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map(({ value, labelKey }) => (
                <FilterChip
                  key={value}
                  active={segment === value}
                  label={t(labelKey)}
                  count={members.filter(SEGMENT_FILTER[value]).length}
                  onClick={() => {
                    setSegment(value);
                    setMemberPage(0);
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.loyalty.list.membersSummary", {
                count: filteredMembers.length,
                points: fmtNum(segmentPoints),
              })}
            </p>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={memberColumns as never}
              data={pagedMembers}
              isLoading={membersQuery.isLoading}
              emptyMessage={t("common.noData")}
              serverPagination={{
                pageIndex: memberPage,
                pageSize: MEMBER_PAGE_SIZE,
                pageCount: Math.max(1, Math.ceil(filteredMembers.length / MEMBER_PAGE_SIZE)),
                totalRows: filteredMembers.length,
                onPageChange: setMemberPage,
                onPageSizeChange: () => undefined,
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Giao dịch tạo nên số điểm ───────────────────────────────────── */}
      <div ref={transactionsRef} className="scroll-mt-20">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Coins size={16} className="text-yellow-500" /> {t("admin.loyalty.list.transactionsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LoyaltyTransactionsPanel
              key={panelRequest.key}
              initialScope={panelRequest.scope}
              initialRange={panelRequest.range}
              userById={userById}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Từng đơn của một thành viên ─────────────────────────────────── */}
      <Dialog open={selectedMember !== null} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col">
          {selectedMember && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="text-base font-bold">
                  {userById.get(selectedMember.member.userId)?.name || `#${selectedMember.member.userId}`}
                </DialogTitle>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {t("admin.loyalty.list.points")}:{" "}
                    <span className="font-semibold text-foreground">{fmtNum(selectedMember.member.points)}</span>
                  </span>
                  <span>
                    {t("admin.loyalty.list.lifetimePoints")}:{" "}
                    <span className="font-semibold text-foreground">{fmtNum(selectedMember.member.lifetimePoints)}</span>
                  </span>
                  <span className="font-semibold text-emerald-600">+{fmtNum(selectedMember.member.pointsIssued)}</span>
                  <span className="font-semibold text-rose-600">−{fmtNum(selectedMember.member.pointsRedeemed)}</span>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto">
                <LoyaltyTransactionsPanel
                  key={`${selectedMember.member.userId}-${selectedMember.scope}`}
                  userId={selectedMember.member.userId}
                  initialScope={selectedMember.scope}
                  userById={userById}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
