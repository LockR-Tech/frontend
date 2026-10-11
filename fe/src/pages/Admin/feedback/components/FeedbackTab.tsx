import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useGetAllFeedbackQuery } from "~/stores/apis/admin";
import { fmtDate, StarRow, ErrorBanner } from "./shared";
import { extractList } from "~/lib/extract-list";
import type { FeedbackDTO } from "~/types/admin/feedback";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 20;

export function FeedbackTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [minRating, setMinRating] = useState<string>("all");
  const [isResolved, setIsResolved] = useState<string>("all");
  const [page, setPage] = useState(0);

  // Lọc đúng số sao đã chọn; backend phân trang (PageResponse: totalElements/totalPages).
  const { data, isLoading, isError, refetch } = useGetAllFeedbackQuery({
    page,
    size: PAGE_SIZE,
    ...(minRating !== "all" && { minRating: Number(minRating), maxRating: Number(minRating) }),
    ...(isResolved !== "all" && { isResolved: isResolved === "true" }),
  });

  const list = extractList<FeedbackDTO>(data?.data);
  const total = data?.data?.totalElements ?? list.length;
  const totalPages = Math.max(1, data?.data?.totalPages ?? 1);

  return (
    <div className="space-y-4">
      {isError && <ErrorBanner onRetry={refetch} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2.5 items-center">
          <Select
            value={minRating}
            onValueChange={(v) => {
              setMinRating(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder={t("admin.feedback.filters.stars")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.feedback.filters.allStars")}</SelectItem>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t("admin.feedback.filters.starOption", { stars: "★".repeat(n), count: n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={isResolved}
            onValueChange={(v) => {
              setIsResolved(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.feedback.filters.allStatuses")}</SelectItem>
              <SelectItem value="false">{t("admin.feedback.status.unresolved")}</SelectItem>
              <SelectItem value="true">{t("admin.feedback.status.resolved")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-muted-foreground">
          {isLoading ? "..." : t("admin.feedback.list.count", { total: total.toLocaleString("vi-VN") })}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                <TableHead className="font-semibold text-foreground">{t("common.customer")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("admin.feedback.columns.rating")}</TableHead>
                <TableHead className="font-semibold text-foreground max-w-xs">{t("admin.feedback.columns.content")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("common.order")}</TableHead>
                <TableHead className="font-semibold text-foreground text-center">{t("common.status")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("common.time")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    {t("admin.feedback.list.empty")}
                  </TableCell>
                </TableRow>
              )}
              {list.map((fb) => (
                <TableRow
                  key={fb.id}
                  className="cursor-pointer hover:bg-secondary/40 transition-colors"
                  onClick={() => navigate(`/admin/feedback/${fb.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground text-sm">{fb.userName || t("common.customer")}</p>
                      <p className="text-xs text-muted-foreground">{fb.email || "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <StarRow rating={fb.rating} />
                      <span className="text-xs text-muted-foreground font-medium">
                        {fb.rating}/5
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-xs text-foreground/80 line-clamp-2">
                      {fb.comment || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fb.orderCode || (fb.relatedOrderId ? `#${fb.relatedOrderId}` : "—")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        fb.isResolved
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {fb.isResolved ? t("admin.feedback.status.resolved") : t("admin.feedback.status.pending")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(fb.createdAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate(`/admin/feedback/${fb.id}`)}
                    >
                      <Eye size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            {t("pagination.previous")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("admin.feedback.pagination.page", { page: page + 1, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("admin.feedback.pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
