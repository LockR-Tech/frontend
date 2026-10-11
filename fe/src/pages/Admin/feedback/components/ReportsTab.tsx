import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
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
import { useGetAllReportsQuery } from "~/stores/apis/admin";
// Endpoint admin (PUT /api/admin/lockers/reports/{id}/resolve), dùng chung với trang Bảo trì.
import { useResolveAdminReportMutation } from "~/stores/apis/admin/lockerOps";
import { cleanDescription } from "~/pages/Admin/maintenance/maintenancePhotos";
import { fmtDate, REPORT_STATUS_META, ErrorBanner } from "./shared";
import { extractList } from "~/lib/extract-list";
import type { ReportDTO } from "~/types/admin/feedback";
import { toast } from "sonner";
import {
  ResolveReportDialog,
  type ResolveReportPayload,
} from "~/pages/Admin/maintenance/ResolveReportDialog";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 20;

export function ReportsTab() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);

  // Backend trả cả danh sách (bỏ qua page/size/status) ⇒ lọc và phân trang ở đây.
  const { data, isLoading, isError, refetch } = useGetAllReportsQuery({});

  const [resolveReport, { isLoading: isResolving }] = useResolveAdminReportMutation();
  const [resolving, setResolving] = useState<ReportDTO | null>(null);

  // Lỗi được ResolveReportDialog hiển thị (kể cả RESOLUTION_PHOTO_REQUIRED)
  const handleResolve = async (id: number, payload: ResolveReportPayload) => {
    await resolveReport({
      reportId: id,
      ...(payload.note ? { note: payload.note } : {}),
      ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
    }).unwrap();
    toast.success(t("admin.feedback.reports.resolveSuccess"), {
      description: payload.attachments?.length
        ? t("admin.feedback.reports.resolvedDescWithPhotos", {
            id,
            count: payload.attachments.length,
          })
        : t("admin.feedback.reports.resolvedDesc", { id }),
    });
  };

  const all = extractList<ReportDTO>(data?.data);
  const filtered = status === "all" ? all : all.filter((r) => r.status === status);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const list = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {isError && <ErrorBanner onRetry={refetch} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.feedback.filters.allStatuses")}</SelectItem>
              <SelectItem value="OPEN">{t("admin.feedback.reportStatus.open")}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t("admin.feedback.reportStatus.inProgress")}</SelectItem>
              <SelectItem value="RESOLVED">{t("admin.feedback.reportStatus.resolved")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-muted-foreground">
          {isLoading ? "..." : t("admin.feedback.reports.count", { total: total.toLocaleString("vi-VN") })}
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
                <TableHead className="font-semibold text-foreground">Locker</TableHead>
                <TableHead className="font-semibold text-foreground">{t("common.description")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("common.status")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("common.createdAt")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("admin.feedback.columns.resolvedAt")}</TableHead>
                <TableHead className="w-24 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    {t("admin.feedback.reports.empty")}
                  </TableCell>
                </TableRow>
              )}
              {list.map((r) => {
                const statusMeta =
                  REPORT_STATUS_META[r.status] ?? REPORT_STATUS_META.OPEN;
                return (
                  <TableRow key={r.id} className="hover:bg-secondary/40 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {r.reporterName || t("common.customer")}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.reporterPhone || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <Lock size={13} className="text-muted-foreground shrink-0" />
                        {r.lockerName || t("admin.feedback.reports.lockerFallback", { id: r.lockerId ?? "" })}
                        {r.boxNumber != null && (
                          <span className="text-muted-foreground">
                            {" · "}
                            {t("admin.feedback.reports.box", { number: r.boxNumber })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-56">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {cleanDescription(r.description)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] ${statusMeta.cls}`}>
                        {t(statusMeta.labelKey)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.resolvedAt ? fmtDate(r.resolvedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status !== "RESOLVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={isResolving}
                          onClick={() => setResolving(r)}
                        >
                          <CheckCircle2 size={13} />
                          {t("admin.feedback.reports.resolve")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            {t("pagination.previous")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("admin.feedback.pagination.page", { page: currentPage + 1, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            {t("admin.feedback.pagination.next")}
          </Button>
        </div>
      )}

      <ResolveReportDialog
        open={!!resolving}
        onOpenChange={(open) => !open && setResolving(null)}
        title={resolving ? t("admin.feedback.reports.resolveTitle", { id: resolving.id }) : ""}
        description={resolving?.description}
        confirmLabel={t("admin.feedback.reports.resolve")}
        errorTitle={t("admin.feedback.reports.resolveFailed")}
        onSubmit={async (payload) => {
          if (resolving) await handleResolve(resolving.id, payload);
        }}
      />
    </div>
  );
}
