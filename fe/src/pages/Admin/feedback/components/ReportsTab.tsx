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

const PAGE_SIZE = 20;

export function ReportsTab() {
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
    toast.success("Giải quyết báo cáo thành công", {
      description: `Báo cáo RPT-${id} đã được đánh dấu là đã giải quyết${
        payload.attachments?.length ? ` kèm ${payload.attachments.length} ảnh nghiệm thu` : ""
      }.`,
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
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="OPEN">Chờ xử lý</SelectItem>
              <SelectItem value="IN_PROGRESS">Đang xử lý</SelectItem>
              <SelectItem value="RESOLVED">Đã giải quyết</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-muted-foreground">
          {isLoading ? "..." : `${total.toLocaleString("vi-VN")} báo cáo`}
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
                <TableHead className="font-semibold text-foreground">Khách hàng</TableHead>
                <TableHead className="font-semibold text-foreground">Locker</TableHead>
                <TableHead className="font-semibold text-foreground">Mô tả</TableHead>
                <TableHead className="font-semibold text-foreground">Trạng thái</TableHead>
                <TableHead className="font-semibold text-foreground">Ngày tạo</TableHead>
                <TableHead className="font-semibold text-foreground">Giải quyết lúc</TableHead>
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
                    Không có báo cáo nào
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
                          {r.reporterName || "Khách hàng"}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.reporterPhone || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <Lock size={13} className="text-muted-foreground shrink-0" />
                        {r.lockerName || `Tủ #${r.lockerId ?? ""}`}
                        {r.boxNumber != null && (
                          <span className="text-muted-foreground"> · Ô {r.boxNumber}</span>
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
                        {statusMeta.label}
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
                          Giải quyết
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
            Trước
          </Button>
          <span className="text-xs text-muted-foreground">
            Trang {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Tiếp
          </Button>
        </div>
      )}

      <ResolveReportDialog
        open={!!resolving}
        onOpenChange={(open) => !open && setResolving(null)}
        title={resolving ? `Giải quyết báo cáo RPT-${resolving.id}?` : ""}
        description={resolving?.description}
        confirmLabel="Giải quyết"
        errorTitle="Không giải quyết được báo cáo"
        onSubmit={async (payload) => {
          if (resolving) await handleResolve(resolving.id, payload);
        }}
      />
    </div>
  );
}
