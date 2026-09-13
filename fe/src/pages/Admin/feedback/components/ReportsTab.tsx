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
import {
  useGetAllReportsQuery,
  useResolveReportMutation,
} from "~/stores/apis/admin";
import { fmtDate, REPORT_STATUS_META, ErrorBanner } from "./shared";
import { extractList } from "~/lib/extract-list";
import type { ReportDTO } from "~/types/admin/feedback";

export function ReportsTab() {
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useGetAllReportsQuery({
    page,
    size: 20,
    ...(status !== "all" && { status }),
  });

  const [resolveReport, { isLoading: isResolving }] =
    useResolveReportMutation();

  const list = extractList<ReportDTO>(data?.data);
  const total = list.length;

  return (
    <div className="space-y-4">
      {isError && <ErrorBanner onRetry={refetch} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="PENDING">Chờ xử lý</SelectItem>
            <SelectItem value="RESOLVED">Đã giải quyết</SelectItem>
            <SelectItem value="REJECTED">Từ chối</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
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
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Locker</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Giải quyết lúc</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground/70"
                  >
                    Không có báo cáo nào
                  </TableCell>
                </TableRow>
              )}
              {list.map((r) => {
                const statusMeta =
                  REPORT_STATUS_META[r.status] ?? REPORT_STATUS_META.PENDING;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {r.userFullName}
                        </p>
                        <p className="text-xs text-muted-foreground/70">{r.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                        <Lock size={13} className="text-muted-foreground/70 shrink-0" />
                        {r.lockerName}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-56">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {r.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.resolvedAt ? fmtDate(r.resolvedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.status === "PENDING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={isResolving}
                          onClick={() => resolveReport({ id: r.id, data: {} })}
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
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Tiếp
          </Button>
        </div>
      )}
    </div>
  );
}
