import { useMemo, useState, type ReactNode } from "react";
import {
  Eye,
  FileText,
  FileUp,
  Info,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
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
  KNOWLEDGE_POLL_MS,
  isIndexingInProgress,
  useDeleteKnowledgeDocumentMutation,
  useKnowledgeDocumentsWithPolling,
  useReindexKnowledgeDocumentMutation,
  type AssistantStatus,
  type KnowledgeDocument,
} from "~/stores/apis/admin/knowledge";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { DocumentDetailSheet } from "./DocumentDetailSheet";
import { EditDocumentDialog } from "./EditDocumentDialog";
import { UploadDocumentDialog } from "./UploadDocumentDialog";
import {
  formatBytes,
  getKnowledgeErrorMessage,
  knowledgeRoleLabel,
  statusMeta,
} from "./knowledge-utils";
import { useTranslation } from "react-i18next";

// Message key — dịch lúc render.
const PENDING_HINT_KEY = "admin.knowledge.documents.pendingHint";

type PendingAction =
  | { kind: "delete"; doc: KnowledgeDocument }
  | { kind: "reindex"; doc: KnowledgeDocument };

interface DocumentsTabProps {
  /** `undefined` khi chưa biết (đang tải hoặc endpoint lỗi). */
  assistantStatus: AssistantStatus | undefined;
}

export function DocumentsTab({ assistantStatus }: DocumentsTabProps) {
  const { t } = useTranslation();
  const { data, error, isLoading, isFetching, refetch, polling } =
    useKnowledgeDocumentsWithPolling();
  const [reindex, reindexState] = useReindexKnowledgeDocumentMutation();
  const [remove, removeState] = useDeleteKnowledgeDocumentMutation();

  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null);
  // Giữ id sau khi đóng để sheet không nháy trống lúc trượt ra; tài liệu lấy từ danh sách (đang
  // polling) nên trạng thái trong sheet luôn mới.
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  // Giữ `pending` sau khi đóng để hộp xác nhận không nháy nội dung rỗng lúc đang tắt dần.
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const askConfirm = (action: PendingAction) => {
    setPending(action);
    setConfirmOpen(true);
  };

  const documents = useMemo<KnowledgeDocument[]>(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data],
  );

  const viewing = documents.find((d) => d.id === viewingId) ?? null;
  const openViewer = (doc: KnowledgeDocument) => {
    setViewingId(doc.id);
    setViewOpen(true);
  };

  const counts = useMemo(
    () => ({
      total: documents.length,
      ready: documents.filter((d) => d.status === "READY").length,
      processing: documents.filter((d) => isIndexingInProgress(d.status)).length,
      pendingOnly: documents.filter((d) => d.status === "PENDING").length,
      failed: documents.filter((d) => d.status === "FAILED").length,
      chunks: documents.reduce((sum, d) => sum + (d.chunkCount ?? 0), 0),
    }),
    [documents],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title?.toLowerCase().includes(q) || d.fileName?.toLowerCase().includes(q),
    );
  }, [documents, search]);

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, doc } = pending;
    try {
      if (kind === "delete") {
        await remove(doc.id).unwrap();
        toast.success(t("admin.knowledge.documents.deleted", { title: doc.title }));
      } else {
        await reindex(doc.id).unwrap();
        toast.success(t("admin.knowledge.documents.reindexQueued", { title: doc.title }));
      }
      setConfirmOpen(false);
    } catch (err) {
      toast.error(
        kind === "delete"
          ? t("admin.knowledge.documents.deleteFailed")
          : t("admin.knowledge.documents.reindexFailed"),
        {
          description: getKnowledgeErrorMessage(err, t("admin.knowledge.errors.generic")),
        },
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Thống kê + thao tác */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t("admin.knowledge.documents.stats.documents")} value={counts.total} />
          <StatTile label={t("admin.knowledge.status.ready")} value={counts.ready} className="text-green-700" />
          <StatTile
            label={t("admin.knowledge.documents.stats.processing")}
            value={counts.processing}
            className="text-blue-700"
          />
          <StatTile label={t("admin.knowledge.status.failed")} value={counts.failed} className="text-red-700" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.knowledge.documents.searchPlaceholder")}
              aria-label={t("admin.knowledge.documents.searchAria")}
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
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            {t("button.refresh")}
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <FileUp className="h-4 w-4" />
            {t("admin.knowledge.documents.upload")}
          </Button>
        </div>
      </div>

      {polling && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("admin.knowledge.documents.polling", {
            count: counts.processing,
            seconds: KNOWLEDGE_POLL_MS / 1000,
          })}
        </p>
      )}

      {/* Không đọc được trạng thái trợ lý thì nhắc nguyên nhân thường gặp khi tài liệu kẹt PENDING.
          Biết chắc thiếu khoá thì trang đã có cảnh báo chung; có khoá thì PENDING chỉ vài giây. */}
      {counts.pendingOnly > 0 && !assistantStatus && (
        <Alert className="bg-muted/30">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm">
            {t("admin.knowledge.documents.pendingAlert", { count: counts.pendingOnly })}
          </AlertTitle>
          <AlertDescription className="text-xs">{t(PENDING_HINT_KEY)}</AlertDescription>
        </Alert>
      )}

      {error ? (
        <ErrorState
          variant="inline"
          title={t("admin.knowledge.documents.loadFailedTitle")}
          message={getKnowledgeErrorMessage(error, t("admin.knowledge.documents.loadFailedMessage"))}
          onRetry={() => refetch()}
        />
      ) : (
        <Card className="overflow-hidden border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                <TableHead className="min-w-[220px] font-semibold text-foreground">
                  {t("admin.knowledge.documents.columns.document")}
                </TableHead>
                <TableHead className="font-semibold text-foreground">{t("common.status")}</TableHead>
                <TableHead className="min-w-[160px] font-semibold text-foreground">
                  {t("admin.knowledge.documents.columns.roles")}
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {t("admin.knowledge.documents.columns.chunks")}
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {t("admin.knowledge.documents.columns.size")}
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  {t("admin.knowledge.documents.columns.indexedAt")}
                </TableHead>
                <TableHead className="w-[156px] text-right font-semibold text-foreground">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {documents.length === 0
                      ? t("admin.knowledge.documents.emptyLibrary")
                      : t("admin.knowledge.documents.noMatch")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onView={() => openViewer(doc)}
                    onEdit={() => setEditing(doc)}
                    onReindex={() => askConfirm({ kind: "reindex", doc })}
                    onDelete={() => askConfirm({ kind: "delete", doc })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {documents.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("admin.knowledge.documents.footer", { total: counts.chunks.toLocaleString("vi-VN") })}
        </p>
      )}

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <EditDocumentDialog document={editing} onClose={() => setEditing(null)} />
      <DocumentDetailSheet
        open={viewOpen}
        document={viewing}
        onClose={() => setViewOpen(false)}
      />

      <ConfirmActionDialog
        open={confirmOpen && pending?.kind === "delete"}
        onOpenChange={setConfirmOpen}
        title={t("admin.knowledge.documents.deleteTitle")}
        description={
          <>
            <p>
              {t("admin.knowledge.documents.deleteDescriptionBefore")}{" "}
              <span className="font-semibold text-foreground">“{pending?.doc.title}”</span>{" "}
              {t("admin.knowledge.documents.deleteDescriptionAfter")}
            </p>
            <p>{t("admin.knowledge.documents.deleteNote")}</p>
          </>
        }
        actionLabel={t("admin.knowledge.documents.deleteAction")}
        destructive
        loading={removeState.isLoading}
        onConfirm={confirmPending}
      />

      <ConfirmActionDialog
        open={confirmOpen && pending?.kind === "reindex"}
        onOpenChange={setConfirmOpen}
        title={t("admin.knowledge.documents.reindexTitle")}
        description={
          <>
            <p>
              <span className="font-semibold text-foreground">“{pending?.doc.title}”</span>{" "}
              {t("admin.knowledge.documents.reindexDescriptionAfter")}
            </p>
            <p>{t("admin.knowledge.documents.reindexNote")}</p>
          </>
        }
        actionLabel={t("admin.knowledge.documents.reindexAction")}
        loading={reindexState.isLoading}
        onConfirm={confirmPending}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <Card className="border-0 px-3 py-2 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold text-foreground", className)}>{value}</p>
    </Card>
  );
}

function StatusBadge({ doc }: { doc: KnowledgeDocument }) {
  const { t } = useTranslation();
  const meta = statusMeta(doc.status);
  const badge = (
    <Badge variant="outline" className={cn("gap-1 whitespace-nowrap", meta.className)}>
      {doc.status === "INDEXING" && <Loader2 className="h-3 w-3 animate-spin" />}
      {doc.status === "FAILED" && <TriangleAlert className="h-3 w-3" />}
      {meta.label}
    </Badge>
  );

  const tip =
    doc.status === "FAILED"
      ? doc.error || t("admin.knowledge.documents.failedNoDetail")
      : doc.status === "PENDING"
        ? t(PENDING_HINT_KEY)
        : null;
  if (!tip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="cursor-help rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {badge}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-pre-wrap text-xs">{tip}</TooltipContent>
    </Tooltip>
  );
}

function DocumentRow({
  doc,
  onView,
  onEdit,
  onReindex,
  onDelete,
}: {
  doc: KnowledgeDocument;
  onView: () => void;
  onEdit: () => void;
  onReindex: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const roles = doc.allowedRoles?.length ? doc.allowedRoles : ["ALL"];
  const busy = isIndexingInProgress(doc.status);

  return (
    <TableRow>
      <TableCell>
        <button
          type="button"
          onClick={onView}
          className="text-left font-medium text-foreground hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {doc.title}
        </button>
        <p className="truncate text-xs text-muted-foreground" title={doc.fileName}>
          {doc.fileName}
        </p>
        {doc.status === "FAILED" && doc.error && (
          <p className="mt-0.5 line-clamp-2 text-xs text-red-600" title={doc.error}>
            {doc.error}
          </p>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge doc={doc} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge
              key={role}
              variant="outline"
              className={cn(
                "whitespace-nowrap font-medium",
                role === "ALL" ? "border-primary/40 text-primary" : "text-foreground",
              )}
            >
              {knowledgeRoleLabel(role)}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {doc.status === "READY" || doc.chunkCount > 0 ? doc.chunkCount : "—"}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right tabular-nums">
        {formatBytes(doc.sizeBytes)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDateTime(doc.indexedAt)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <IconAction label={t("admin.knowledge.documents.actions.view")} onClick={onView}>
            <Eye className="h-4 w-4" />
          </IconAction>
          <IconAction label={t("admin.knowledge.documents.actions.edit")} onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconAction>
          <IconAction
            label={
              busy
                ? t("admin.knowledge.documents.actions.busy")
                : t("admin.knowledge.documents.reindexAction")
            }
            onClick={onReindex}
            disabled={busy}
          >
            <RotateCcw className="h-4 w-4" />
          </IconAction>
          <IconAction
            label={t("admin.knowledge.documents.deleteAction")}
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </IconAction>
        </div>
      </TableCell>
    </TableRow>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span giữ tooltip hoạt động cả khi nút bị disabled */}
        <span tabIndex={disabled ? 0 : -1}>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", className)}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}
