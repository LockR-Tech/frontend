import { useMemo, useState, type ReactNode } from "react";
import {
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
import { EditDocumentDialog } from "./EditDocumentDialog";
import { UploadDocumentDialog } from "./UploadDocumentDialog";
import {
  formatBytes,
  getKnowledgeErrorMessage,
  knowledgeRoleLabel,
  statusMeta,
} from "./knowledge-utils";

const PENDING_HINT =
  "Tài liệu nằm ở “Chờ đánh chỉ mục” cho tới khi máy chủ có khoá API nhúng (embedding). Có khoá là tự chạy tiếp, không cần tải lại.";

type PendingAction =
  | { kind: "delete"; doc: KnowledgeDocument }
  | { kind: "reindex"; doc: KnowledgeDocument };

interface DocumentsTabProps {
  /** `undefined` khi chưa biết (đang tải hoặc endpoint lỗi). */
  assistantStatus: AssistantStatus | undefined;
}

export function DocumentsTab({ assistantStatus }: DocumentsTabProps) {
  const { data, error, isLoading, isFetching, refetch, polling } =
    useKnowledgeDocumentsWithPolling();
  const [reindex, reindexState] = useReindexKnowledgeDocumentMutation();
  const [remove, removeState] = useDeleteKnowledgeDocumentMutation();

  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null);
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
        toast.success(`Đã xoá “${doc.title}”`);
      } else {
        await reindex(doc.id).unwrap();
        toast.success(`Đã đưa “${doc.title}” vào hàng đợi đánh chỉ mục lại`);
      }
      setConfirmOpen(false);
    } catch (err) {
      toast.error(kind === "delete" ? "Không xoá được tài liệu" : "Không đánh chỉ mục lại được", {
        description: getKnowledgeErrorMessage(err, "Đã xảy ra lỗi."),
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Thống kê + thao tác */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Tài liệu" value={counts.total} />
          <StatTile label="Sẵn sàng" value={counts.ready} className="text-green-700" />
          <StatTile label="Đang xử lý" value={counts.processing} className="text-blue-700" />
          <StatTile label="Lỗi" value={counts.failed} className="text-red-700" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề, tên file…"
              aria-label="Tìm tài liệu"
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
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Làm mới
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <FileUp className="h-4 w-4" />
            Tải tài liệu lên
          </Button>
        </div>
      </div>

      {polling && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang có {counts.processing} tài liệu chờ/đang đánh chỉ mục — danh sách tự làm mới mỗi{" "}
          {KNOWLEDGE_POLL_MS / 1000} giây.
        </p>
      )}

      {/* Không đọc được trạng thái trợ lý thì nhắc nguyên nhân thường gặp khi tài liệu kẹt PENDING.
          Biết chắc thiếu khoá thì trang đã có cảnh báo chung; có khoá thì PENDING chỉ vài giây. */}
      {counts.pendingOnly > 0 && !assistantStatus && (
        <Alert className="bg-muted/30">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm">
            {counts.pendingOnly} tài liệu đang chờ đánh chỉ mục
          </AlertTitle>
          <AlertDescription className="text-xs">{PENDING_HINT}</AlertDescription>
        </Alert>
      )}

      {error ? (
        <ErrorState
          variant="inline"
          title="Không tải được kho tri thức"
          message={getKnowledgeErrorMessage(error, "Không tải được danh sách tài liệu.")}
          onRetry={() => refetch()}
        />
      ) : (
        <Card className="overflow-hidden border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                <TableHead className="min-w-[220px] font-semibold text-foreground">Tài liệu</TableHead>
                <TableHead className="font-semibold text-foreground">Trạng thái</TableHead>
                <TableHead className="min-w-[160px] font-semibold text-foreground">Vai trò được đọc</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Số đoạn</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Dung lượng</TableHead>
                <TableHead className="font-semibold text-foreground">Đánh chỉ mục lúc</TableHead>
                <TableHead className="w-[120px] text-right font-semibold text-foreground">Thao tác</TableHead>
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
                      ? "Kho tri thức chưa có tài liệu nào. Tải tài liệu lên để trợ lý có căn cứ trả lời."
                      : "Không có tài liệu khớp từ khoá."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
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
          Tổng {counts.chunks.toLocaleString("vi-VN")} đoạn đã đánh chỉ mục. Trợ lý chỉ dùng tài liệu
          “Sẵn sàng”; tài liệu đang đánh chỉ mục lại tạm thời không được dùng.
        </p>
      )}

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <EditDocumentDialog document={editing} onClose={() => setEditing(null)} />

      <ConfirmActionDialog
        open={confirmOpen && pending?.kind === "delete"}
        onOpenChange={setConfirmOpen}
        title="Xoá tài liệu?"
        description={
          <>
            <p>
              Xoá <span className="font-semibold text-foreground">“{pending?.doc.title}”</span> cùng
              toàn bộ đoạn đã đánh chỉ mục. Trợ lý sẽ không dùng tài liệu này để trả lời nữa.
            </p>
            <p>Câu đánh giá đang trỏ tới tiêu đề này sẽ trượt. Thao tác không hoàn tác được.</p>
          </>
        }
        actionLabel="Xoá tài liệu"
        destructive
        loading={removeState.isLoading}
        onConfirm={confirmPending}
      />

      <ConfirmActionDialog
        open={confirmOpen && pending?.kind === "reindex"}
        onOpenChange={setConfirmOpen}
        title="Đánh chỉ mục lại?"
        description={
          <>
            <p>
              <span className="font-semibold text-foreground">“{pending?.doc.title}”</span> sẽ về
              trạng thái “Chờ đánh chỉ mục” và được chia đoạn, nhúng lại từ đầu (tốn phí nhúng).
            </p>
            <p>
              Trong lúc đó trợ lý tạm không dùng tài liệu này để trả lời. Dùng khi tài liệu bị lỗi
              tạm thời hoặc sau khi đổi mô hình nhúng.
            </p>
          </>
        }
        actionLabel="Đánh chỉ mục lại"
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
      ? doc.error || "Đánh chỉ mục thất bại (không có chi tiết lỗi)."
      : doc.status === "PENDING"
        ? PENDING_HINT
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
  onEdit,
  onReindex,
  onDelete,
}: {
  doc: KnowledgeDocument;
  onEdit: () => void;
  onReindex: () => void;
  onDelete: () => void;
}) {
  const roles = doc.allowedRoles?.length ? doc.allowedRoles : ["ALL"];
  const busy = isIndexingInProgress(doc.status);

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium text-foreground">{doc.title}</p>
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
          <IconAction label="Sửa tiêu đề / vai trò" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconAction>
          <IconAction
            label={busy ? "Đang chờ/đang đánh chỉ mục" : "Đánh chỉ mục lại"}
            onClick={onReindex}
            disabled={busy}
          >
            <RotateCcw className="h-4 w-4" />
          </IconAction>
          <IconAction label="Xoá tài liệu" onClick={onDelete} className="text-red-600 hover:text-red-700">
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
