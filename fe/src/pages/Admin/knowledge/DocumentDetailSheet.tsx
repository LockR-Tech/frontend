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
import { useTranslation } from "react-i18next";

interface DocumentDetailSheetProps {
  open: boolean;
  /** Bản mới nhất từ danh sách; giữ nguyên sau khi đóng để nội dung không nháy trống lúc sheet trượt ra. */
  document: KnowledgeDocument | null;
  onClose: () => void;
}

/** Nội dung một tài liệu: tải file gốc và đọc từng đoạn trợ lý dùng khi trả lời. */
export function DocumentDetailSheet({ open, document: doc, onClose }: DocumentDetailSheetProps) {
  const { t } = useTranslation();
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
      toast.error(t("admin.knowledge.detail.downloadFailed"), {
        description: getKnowledgeErrorMessage(err, t("admin.knowledge.errors.generic")),
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
          <SheetTitle className="text-base">{doc?.title ?? t("common.document")}</SheetTitle>
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
                {doc?.indexedAt && (
                  <span>{t("admin.knowledge.detail.indexedAt", { date: formatDateTime(doc.indexedAt) })}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1">{t("admin.knowledge.detail.rolesLabel")}</span>
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
                  {t("admin.knowledge.detail.download")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                  {t("button.refresh")}
                </Button>
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-xs text-muted-foreground">
            {t("admin.knowledge.detail.chunksIntro")}
          </p>
          {reindexing && chunks.length > 0 && (
            <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              {t("admin.knowledge.detail.reindexing")}
            </p>
          )}

          {chunks.length > 0 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.knowledge.detail.searchPlaceholder")}
                aria-label={t("admin.knowledge.detail.searchAria")}
                className="h-9 pl-9 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                  aria-label={t("admin.knowledge.documents.clearSearch")}
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
              title={t("admin.knowledge.detail.loadFailed")}
              message={getKnowledgeErrorMessage(error, t("admin.knowledge.detail.loadFailedMessage"))}
              onRetry={() => refetch()}
            />
          ) : chunks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {doc?.status === "FAILED"
                ? doc.error
                  ? t("admin.knowledge.detail.failedNoChunksWithError", { error: doc.error })
                  : t("admin.knowledge.detail.failedNoChunks")
                : reindexing
                  ? t("admin.knowledge.detail.pendingNoChunks")
                  : t("admin.knowledge.detail.noChunks")}
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t("admin.knowledge.detail.chunkCount", {
                  shown: search ? `${filtered.length}/${chunks.length}` : chunks.length,
                })}
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
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2 text-xs">
        <p className="min-w-0 font-medium text-foreground">{chunk.heading || t("admin.knowledge.detail.intro")}</p>
        {/* #id khớp "đoạn #…" ở nguồn trích dẫn trong tab Hội thoại */}
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {t("admin.knowledge.detail.chunkMeta", {
            position: chunk.ordinal + 1,
            id: chunk.id,
            chars: chunk.content.length.toLocaleString("vi-VN"),
          })}
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{chunk.content}</p>
    </div>
  );
}
