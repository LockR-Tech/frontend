import { useState } from "react";
import { Star, ThumbsUp, TrendingUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { orderTypeMeta } from "~/components/shared/reporting/report-meta";
import {
  useGetFeedbackAnalyticsQuery,
  useGetSatisfactionMetricsQuery,
} from "~/stores/apis/admin";
import type { FeedbackTrendDTO } from "~/types/admin/feedback";
import { StarRow, ErrorBanner } from "./shared";

type Period = "day" | "week" | "month";

const PERIOD_LABEL: Record<Period, string> = {
  day: "14 ngày",
  week: "12 tuần",
  month: "12 tháng",
};

// Loại khiếu nại do khách nhập tự do — chỉ dịch các giá trị đã biết.
const COMPLAINT_LABEL: Record<string, string> = { OTHER: "Khác" };

/** `date` là ngày (yyyy-MM-dd) theo giờ Việt Nam do backend gom sẵn. */
function trendLabel(date: string, period: Period) {
  const [y, m, d] = date.split("-");
  if (period === "month") return `${m}/${y}`;
  return period === "week" ? `T.${d}/${m}` : `${d}/${m}`;
}

function TrendBars({ trends, period }: { trends: FeedbackTrendDTO[]; period: Period }) {
  const max = Math.max(1, ...trends.map((t) => t.count));
  if (trends.every((t) => t.count === 0)) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Chưa có đánh giá trong khoảng này</p>;
  }
  return (
    <div className="flex h-40 items-end gap-1.5">
      {trends.map((t) => (
        <div
          key={t.date}
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
          title={`${trendLabel(t.date, period)}: ${t.count} đánh giá${t.count ? ` · TB ${t.avgRating.toFixed(1)}★` : ""}`}
        >
          <span className="text-[10px] text-muted-foreground">{t.count || ""}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-primary/80"
              style={{ height: `${(t.count / max) * 100}%`, minHeight: t.count ? 4 : 0 }}
            />
          </div>
          <span className="truncate text-[10px] text-muted-foreground">{trendLabel(t.date, period)}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsTab() {
  const [period, setPeriod] = useState<Period>("month");

  const {
    data: analyticsRes,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = useGetFeedbackAnalyticsQuery({ period });

  const {
    data: satisfactionRes,
    isLoading: satLoading,
    isError: satError,
    refetch: refetchSat,
  } = useGetSatisfactionMetricsQuery();

  const analytics = analyticsRes?.data;
  const satisfaction = satisfactionRes?.data;

  const ratingDist = analytics?.ratingDistribution ?? {};
  const totalForPct = Object.values(ratingDist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      {(analyticsError || satError) && (
        <ErrorBanner
          onRetry={() => {
            refetchAnalytics();
            refetchSat();
          }}
        />
      )}

      {/* Xu hướng số lượt đánh giá — nút chọn khoảng chỉ đổi biểu đồ này */}
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp size={15} className="text-muted-foreground" /> Số lượt đánh giá {PERIOD_LABEL[period]} gần nhất
          </CardTitle>
          <div className="flex gap-2">
            {(["day", "week", "month"] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-8 text-xs"
              >
                {p === "day" ? "Theo ngày" : p === "week" ? "Theo tuần" : "Theo tháng"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <TrendBars trends={analytics?.trends ?? []} period={period} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback overview */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Star size={15} className="text-muted-foreground" /> Tổng quan đánh giá
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border/60 rounded-xl">
                  <span className="text-xs text-muted-foreground font-medium">
                    Điểm đánh giá trung bình
                  </span>
                  <div className="flex items-center gap-2">
                    <StarRow
                      rating={Math.round(analytics?.averageRating ?? 0)}
                    />
                    <span className="font-bold text-base text-foreground">
                      {analytics?.averageRating?.toFixed(1) ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Hôm nay", value: analytics?.feedbackToday },
                    { label: "Tuần này", value: analytics?.feedbackThisWeek },
                    { label: "Tháng này", value: analytics?.feedbackThisMonth },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="text-center p-2.5 bg-secondary/30 border border-border/50 rounded-lg"
                    >
                      <p className="text-base font-bold text-foreground">
                        {value?.toLocaleString("vi-VN") ?? "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-1">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingDist[String(star)] ?? 0;
                    const pct = ((count / totalForPct) * 100).toFixed(0);
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 text-right font-medium">
                          {star}★
                        </span>
                        <div className="flex-1 bg-muted/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right font-medium">
                          {pct}%
                        </span>
                        <span className="text-xs text-muted-foreground/70 w-12 text-right">
                          {count.toLocaleString("vi-VN")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {analytics?.unresolvedCount !== undefined && (
                  <div className="flex items-center justify-between p-2.5 bg-secondary/40 border border-border/60 rounded-lg">
                    <span className="text-xs text-muted-foreground font-medium">Phản hồi chờ xử lý</span>
                    <span className="font-bold text-sm text-foreground">
                      {analytics.unresolvedCount.toLocaleString("vi-VN")}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Satisfaction metrics */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ThumbsUp size={15} className="text-muted-foreground" /> Chỉ số hài lòng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {satLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-secondary/40 border border-border/60 rounded-xl text-center">
                    <p className="text-2xl font-bold tracking-tight text-foreground">
                      {satisfaction?.overallSatisfactionScore?.toFixed(0) ??
                        "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Điểm hài lòng (0-100)
                    </p>
                  </div>
                  <div className="p-4 bg-secondary/40 border border-border/60 rounded-xl text-center">
                    <p className="text-2xl font-bold tracking-tight text-foreground">
                      {satisfaction?.npsScore?.toFixed(0) ?? "—"}
                    </p>
                    <p
                      className="text-xs text-muted-foreground mt-1"
                      title="Trên thang 5 sao: % đánh giá 5 sao trừ % đánh giá 1–3 sao (−100 đến 100)"
                    >
                      Chỉ số NPS (thang 5 sao)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary/30 border border-border/50 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">
                      Tích cực (4-5★)
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">
                      {satisfaction?.positivePercentage ?? "—"}%
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/30 border border-border/50 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">
                      Tiêu cực (1-2★)
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">
                      {satisfaction?.negativePercentage ?? "—"}%
                    </p>
                  </div>
                </div>

                {satisfaction?.mostCommonComplaint && (
                  <div className="p-3 bg-secondary/40 border border-border/60 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">
                      Khiếu nại phổ biến nhất
                    </p>
                    <p className="text-xs font-semibold text-foreground mt-1">
                      {COMPLAINT_LABEL[satisfaction.mostCommonComplaint] ?? satisfaction.mostCommonComplaint}
                      <span className="font-normal text-muted-foreground"> · 90 ngày qua</span>
                    </p>
                  </div>
                )}

                {satisfaction?.topServiceQuality && (
                  <div className="p-3 bg-secondary/40 border border-border/60 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">
                      Dịch vụ được đánh giá cao nhất
                    </p>
                    <p className="text-xs font-semibold text-foreground mt-1">
                      {orderTypeMeta(satisfaction.topServiceQuality).label}
                    </p>
                  </div>
                )}

                {Object.keys(satisfaction?.departmentScores ?? {}).length >
                  0 && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground font-medium mb-2">
                      Điểm theo dịch vụ
                    </p>
                    <div className="space-y-2">
                      {Object.entries(satisfaction!.departmentScores).map(
                        ([dept, score]) => (
                          <div key={dept} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-28 truncate">
                              {orderTypeMeta(dept).label}
                            </span>
                            <div className="flex-1 bg-muted/60 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${Math.min((score / 5) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground w-8 text-right">
                              {score.toFixed(1)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
