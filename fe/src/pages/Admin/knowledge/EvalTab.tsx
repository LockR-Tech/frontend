import { useMemo, useState } from "react";
import {
  FileJson,
  FlaskConical,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { ErrorState } from "~/components/ui/error-state";
import { formatDateTime } from "~/lib/datetime";
import { cn } from "~/lib/utils";
import {
  useDeleteKnowledgeEvalCaseMutation,
  useGetKnowledgeDocumentsQuery,
  useGetKnowledgeEvalCasesQuery,
  useRunKnowledgeEvalMutation,
  type KnowledgeDocument,
  type KnowledgeEvalCase,
} from "~/stores/apis/admin/knowledge";
import { AddEvalCaseDialog } from "./AddEvalCaseDialog";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { EvalReportView } from "./EvalReportView";
import { ImportEvalCasesDialog } from "./ImportEvalCasesDialog";
import {
  getKnowledgeErrorMessage,
  knowledgeRoleLabel,
  sameTitle,
  type EvalRun,
} from "./knowledge-utils";

interface EvalTabProps {
  lastRun: EvalRun | null;
  onRun: (run: EvalRun) => void;
}

/**
 * Bộ câu hỏi đánh giá: câu thường phải truy xuất trúng tài liệu mong đợi, câu “phải từ chối”
 * không được có đoạn nào đạt ngưỡng. Mặc định chỉ đo truy xuất (phí nhúng); sinh câu trả lời
 * bằng Claude tốn phí nên phải xác nhận.
 */
export function EvalTab({ lastRun, onRun }: EvalTabProps) {
  const casesQuery = useGetKnowledgeEvalCasesQuery();
  const documentsQuery = useGetKnowledgeDocumentsQuery();
  const [runEval, runState] = useRunKnowledgeEvalMutation();
  const [deleteCase, deleteState] = useDeleteKnowledgeEvalCaseMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  // Giữ câu đang xoá sau khi đóng để hộp xác nhận không nháy nội dung rỗng lúc tắt dần.
  const [deleting, setDeleting] = useState<KnowledgeEvalCase | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [runningMode, setRunningMode] = useState<"retrieval" | "generate" | null>(null);

  const cases = useMemo<KnowledgeEvalCase[]>(
    () => (Array.isArray(casesQuery.data?.data) ? casesQuery.data.data : []),
    [casesQuery.data],
  );
  const documents = useMemo<KnowledgeDocument[]>(
    () => (Array.isArray(documentsQuery.data?.data) ? documentsQuery.data.data : []),
    [documentsQuery.data],
  );
  const refusalCount = cases.filter((c) => c.mustRefuse).length;
  const running = runState.isLoading;

  const run = async (generate: boolean) => {
    setRunningMode(generate ? "generate" : "retrieval");
    try {
      const response = await runEval({ generate }).unwrap();
      const report = response.data;
      onRun({ report, generated: generate, ranAt: new Date() });
      setConfirmGenerate(false);
      toast.success(`Đánh giá xong: đạt ${report.passed}/${report.total} câu`);
    } catch (err) {
      setConfirmGenerate(false);
      toast.error("Không chạy được đánh giá", {
        description: getKnowledgeErrorMessage(err, "Đã xảy ra lỗi khi chạy đánh giá."),
      });
    } finally {
      setRunningMode(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteCase(deleting.id).unwrap();
      toast.success("Đã xoá câu đánh giá");
      setDeleteOpen(false);
    } catch (err) {
      toast.error("Không xoá được câu đánh giá", {
        description: getKnowledgeErrorMessage(err, "Đã xảy ra lỗi."),
      });
    }
  };

  /** Tiêu đề mong đợi không khớp tài liệu nào trong kho -> câu chắc chắn trượt. */
  const isOrphanTitle = (title: string | null) =>
    !!title && documents.length > 0 && !documents.some((d) => sameTitle(d.title, title));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {cases.length} câu đánh giá · {cases.length - refusalCount} câu phải trúng tài liệu ·{" "}
          {refusalCount} câu phải từ chối. Chạy lại sau mỗi lần thêm/sửa tài liệu hoặc đổi ngưỡng liên
          quan.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Thêm câu
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <FileJson className="h-4 w-4" />
            Nhập JSON
          </Button>
          <Button size="sm" onClick={() => run(false)} disabled={running || cases.length === 0}>
            {runningMode === "retrieval" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Chạy đánh giá truy xuất
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-violet-300 text-violet-800 hover:bg-violet-50"
            onClick={() => setConfirmGenerate(true)}
            disabled={running || cases.length === 0}
          >
            {runningMode === "generate" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Chạy kèm sinh câu trả lời
          </Button>
        </div>
      </div>

      {running && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {runningMode === "generate"
            ? "Đang truy xuất và gọi Claude cho từng câu — có thể mất vài phút…"
            : "Đang nhúng câu hỏi và truy xuất…"}
        </p>
      )}

      {lastRun && <EvalReportView run={lastRun} />}

      {casesQuery.error ? (
        <ErrorState
          variant="inline"
          title="Không tải được bộ câu đánh giá"
          message={getKnowledgeErrorMessage(casesQuery.error, "Không tải được bộ câu đánh giá.")}
          onRetry={() => casesQuery.refetch()}
        />
      ) : (
        <Card className="overflow-hidden border border-border">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-foreground">Bộ câu đánh giá</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => casesQuery.refetch()}
              disabled={casesQuery.isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", casesQuery.isFetching && "animate-spin")} />
              Làm mới
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                <TableHead className="w-16 font-semibold text-foreground">#</TableHead>
                <TableHead className="min-w-[260px] font-semibold text-foreground">Câu hỏi</TableHead>
                <TableHead className="font-semibold text-foreground">Người hỏi</TableHead>
                <TableHead className="min-w-[180px] font-semibold text-foreground">Mong đợi</TableHead>
                <TableHead className="font-semibold text-foreground">Tạo lúc</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {casesQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    <FlaskConical className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    Chưa có câu đánh giá. Thêm từng câu hoặc nhập cả bộ bằng JSON.
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="align-top font-mono text-xs text-muted-foreground">
                      {c.id}
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="whitespace-pre-wrap text-sm text-foreground">{c.question}</p>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-1">
                        {(c.roles?.length ? c.roles : ["CUSTOMER"]).map((role) => (
                          <Badge key={role} variant="outline" className="whitespace-nowrap font-medium">
                            {knowledgeRoleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {c.mustRefuse ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                          Phải từ chối
                        </Badge>
                      ) : (
                        <span className="inline-flex items-start gap-1.5 text-foreground">
                          {c.expectedDocumentTitle ?? "—"}
                          {isOrphanTitle(c.expectedDocumentTitle) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <TriangleAlert
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                                  aria-label="Không có tài liệu mang tiêu đề này"
                                />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                Kho tri thức không có tài liệu nào mang tiêu đề này — câu sẽ luôn trượt.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
                      {formatDateTime(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => {
                          setDeleting(c);
                          setDeleteOpen(true);
                        }}
                        aria-label="Xoá câu đánh giá"
                        title="Xoá câu đánh giá"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <AddEvalCaseDialog open={addOpen} onOpenChange={setAddOpen} documents={documents} />
      <ImportEvalCasesDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmActionDialog
        open={confirmGenerate}
        onOpenChange={setConfirmGenerate}
        title="Chạy đánh giá kèm sinh câu trả lời?"
        description={
          <>
            <p className="font-medium text-rose-700">Thao tác này tốn phí mô hình thật.</p>
            <p>
              Ngoài phí nhúng {cases.length} câu hỏi, mỗi câu có đoạn tài liệu đạt ngưỡng sẽ gọi Claude
              một lần — tối đa {cases.length} lần gọi. Chỉ dùng khi cần xem chất lượng câu trả lời;
              kiểm tra truy xuất thì chạy “Chạy đánh giá truy xuất” (rẻ hơn nhiều).
            </p>
          </>
        }
        actionLabel="Vẫn chạy (tốn phí)"
        destructive
        loading={runningMode === "generate"}
        onConfirm={() => run(true)}
      />

      <ConfirmActionDialog
        open={deleteOpen && !!deleting}
        onOpenChange={setDeleteOpen}
        title="Xoá câu đánh giá?"
        description={<p className="line-clamp-4 whitespace-pre-wrap">“{deleting?.question}”</p>}
        actionLabel="Xoá"
        destructive
        loading={deleteState.isLoading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
