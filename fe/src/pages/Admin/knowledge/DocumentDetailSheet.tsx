import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { ErrorState } from "~/components/ui/error-state";
import { formatDateTime } from "~/lib/datetime";
import { cn } from "~/lib/utils";
import {
  isIndexingInProgress,
  useDownloadKnowledgeDocumentFileMutation,
  useGetKnowledgeDocumentChunksQuery,
  type KnowledgeChunk,
  type KnowledgeDocument,
} from "~/stores/apis/admin/knowledge";
import {
  formatBytes,
  getKnowledgeErrorMessage,
  knowledgeRoleLabel,
  statusMeta,
} from "./knowledge-utils";

interface DocumentDetailSheetProps {
  open: boolean;
  /** Bản mới nhất từ danh sách; giữ nguyên sau khi đóng để nội dung không nháy trống lúc sheet trượt ra. */
  document: KnowledgeDocument | null;
  onClose: () => void;
}

/** Nội dung một tài liệu: tải file gốc và đọc từng đoạn trợ lý dùng khi trả lời. */
export function DocumentDetailSheet({ open, document: doc, onClose }: DocumentDetailSheetProps) {
  const { currentData, error, isFetching, refetch } = useGetKnowledgeDocumentChunksQuery(
    { id: doc?.id ?? 0, indexedAt: doc?.indexedAt ?? null },
    { skip: doc == null || !open },
  );
  const [download, downloadState] = useDownloadKnowledgeDocumentFileMutation();
  const [search, setSearch] = useState("");

  useEffect(() => setSearch(""), [doc?.id]);

  const chunks = useMemo<KnowledgeChunk[]>(
    () => (Array.isArray(currentData?.data) ? currentData.data : []),
    [currentData],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chunks;
    return chunks.filter(
      (c) => c.content.toLowerCase().includes(q) || c.heading?.toLowerCase().includes(q),
    );
  }, [chunks, search]);

  const saveOriginal = async () => {
    if (!doc) return;
    try {
      const url = await download(doc.id).unwrap();
      const link = window.document.createElement("a");
      link.href = url;
      link.download = doc.fileName || `tai-lieu-${doc.id}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      toast.error("Không tải được file gốc", {
        description: getKnowledgeErrorMessage(err, "Đã xảy ra lỗi."),
      });
    }
  };

  const meta = doc ? statusMeta(doc.status) : null;
  const roles = doc?.allowedRoles?.length ? doc.allowedRoles : ["ALL"];
  const reindexing = doc != null && isIndexingInProgress(doc.status);

  return (
    <Sheet open={open && doc != null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="space-y-2 border-b border-border/60 px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="text-base">{doc?.title ?? "Tài liệu"}</SheetTitle>
          <SheetDescription asChild>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {doc?.fileName}
                </span>
                <span>{formatBytes(doc?.sizeBytes)}</span>
                {meta && (
                  <Badge variant="outline" className={cn("whitespace-nowrap", meta.className)}>
                    {meta.label}
                  </Badge>
                )}
                {doc?.indexedAt && <span>Đánh chỉ mục {formatDateTime(doc.indexedAt)}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1">Vai trò được đọc:</span>
                {roles.map((role) => (
                  <Badge key={role} variant="outline" className="font-medium text-foreground">
                    {knowledgeRoleLabel(role)}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveOriginal}
                  disabled={downloadState.isLoading}
                >
                  {downloadState.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Tải file gốc
                </Button>
                <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                  Làm mới
                </Button>
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-xs text-muted-foreground">
            Trợ lý chỉ đọc các đoạn dưới đây — chia theo mục, mỗi đoạn tối đa khoảng 2.000 ký tự,
            đoạn sau lặp lại khoảng 200 ký tự cuối của đoạn trước. Đoạn thiếu hay sai chữ thì sửa
            file gốc rồi tải lên lại.
          </p>
          {reindexing && chunks.length > 0 && (
            <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Đang đánh chỉ mục lại — trợ lý vẫn trả lời bằng các đoạn này cho tới khi xong.
            </p>
          )}

          {chunks.length > 0 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm trong các đoạn…"
                aria-label="Tìm trong các đoạn"
                className="h-9 pl-9 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Xoá tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {isFetching && !currentData ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <ErrorState
              variant="inline"
              title="Không tải được các đoạn"
              message={getKnowledgeErrorMessage(error, "Không tải được các đoạn của tài liệu.")}
              onRetry={() => refetch()}
            />
          ) : chunks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {doc?.status === "FAILED"
                ? `Đánh chỉ mục thất bại nên chưa có đoạn nào${doc.error ? `: ${doc.error}` : "."}`
                : reindexing
                  ? "Tài liệu đang chờ/đang đánh chỉ mục — chưa có đoạn nào."
                  : "Tài liệu không có đoạn nào."}
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {search ? `${filtered.length}/${chunks.length}` : chunks.length} đoạn
              </p>
              {filtered.map((chunk) => (
                <ChunkCard key={chunk.id} chunk={chunk} />
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChunkCard({ chunk }: { chunk: KnowledgeChunk }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2 text-xs">
        <p className="min-w-0 font-medium text-foreground">{chunk.heading || "Phần mở đầu"}</p>
        {/* #id khớp "đoạn #…" ở nguồn trích dẫn trong tab Hội thoại */}
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          Đoạn {chunk.ordinal + 1} · #{chunk.id} · {chunk.content.length.toLocaleString("vi-VN")} ký tự
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{chunk.content}</p>
    </div>
  );
}
