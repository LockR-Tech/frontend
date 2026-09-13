import { useState } from "react";
import { Star, ThumbsUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  useGetFeedbackAnalyticsQuery,
  useGetSatisfactionMetricsQuery,
} from "~/stores/apis/admin";
import { StarRow, ErrorBanner } from "./shared";

export function AnalyticsTab() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");

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

      {/* Period selector */}
      <div className="flex gap-2">
        {(["day", "week", "month"] as const).map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p === "day" ? "Hôm nay" : p === "week" ? "Tuần này" : "Tháng này"}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback overview */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Star size={16} className="text-yellow-500" /> Tổng quan đánh giá
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
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">
                    Điểm đánh giá trung bình
                  </span>
                  <div className="flex items-center gap-2">
                    <StarRow
                      rating={Math.round(analytics?.averageRating ?? 0)}
                    />
                    <span className="font-bold text-lg text-foreground">
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
                      className="text-center p-2 bg-muted/30 rounded-lg"
                    >
                      <p className="text-lg font-bold text-foreground">
                        {value?.toLocaleString("vi-VN") ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingDist[String(star)] ?? 0;
                    const pct = ((count / totalForPct) * 100).toFixed(0);
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 text-right">
                          {star}★
                        </span>
                        <div className="flex-1 bg-muted/50 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${star >= 4 ? "bg-green-400" : star === 3 ? "bg-yellow-400" : "bg-red-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">
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
                  <div className="flex items-center justify-between p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                    <span className="text-sm text-orange-700">Chưa xử lý</span>
                    <span className="font-bold text-orange-800">
                      {analytics.unresolvedCount.toLocaleString("vi-VN")}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Satisfaction metrics */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <ThumbsUp size={16} className="text-blue-500" /> Chỉ số hài lòng
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
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <p className="text-3xl font-bold text-blue-700">
                      {satisfaction?.overallSatisfactionScore?.toFixed(0) ??
                        "—"}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      Điểm hài lòng (0-100)
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <p className="text-3xl font-bold text-purple-700">
                      {satisfaction?.npsScore?.toFixed(0) ?? "—"}
                    </p>
                    <p className="text-xs text-purple-500 mt-1">NPS Score</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      Tích cực
                    </p>
                    <p className="text-2xl font-bold text-green-800">
                      {satisfaction?.positivePercentage ?? "—"}%
                    </p>
                    <p className="text-xs text-green-500">Đánh giá 4-5★</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700 font-medium">Tiêu cực</p>
                    <p className="text-2xl font-bold text-red-800">
                      {satisfaction?.negativePercentage ?? "—"}%
                    </p>
                    <p className="text-xs text-red-500">Đánh giá 1-2★</p>
                  </div>
                </div>

                {satisfaction?.mostCommonComplaint && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs text-orange-600 font-medium">
                      Khiếu nại phổ biến nhất
                    </p>
                    <p className="text-sm text-orange-800 mt-0.5">
                      {satisfaction.mostCommonComplaint}
                    </p>
                  </div>
                )}

                {satisfaction?.topServiceQuality && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">
                      Dịch vụ được đánh giá cao nhất
                    </p>
                    <p className="text-sm text-green-800 mt-0.5">
                      {satisfaction.topServiceQuality}
                    </p>
                  </div>
                )}

                {Object.keys(satisfaction?.departmentScores ?? {}).length >
                  0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">
                      Điểm theo dịch vụ
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(satisfaction!.departmentScores).map(
                        ([dept, score]) => (
                          <div key={dept} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-24 truncate">
                              {dept}
                            </span>
                            <div className="flex-1 bg-muted/50 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-blue-400"
                                style={{
                                  width: `${Math.min((score / 5) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">
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
