import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MessagesSquare,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
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
import { ErrorState } from "~/components/ui/error-state";
import { formatDateTime } from "~/lib/datetime";
import { cn } from "~/lib/utils";
import {
  useGetAssistantConversationsQuery,
  type AssistantConversationView,
} from "~/stores/apis/admin/knowledge";
import { ConversationDetailSheet } from "./ConversationDetailSheet";
import { getKnowledgeErrorMessage } from "./knowledge-utils";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 20;

/** Hội thoại gần đây của mọi người dùng (mới cập nhật trước) để admin kiểm tra chất lượng trả lời. */
export function ConversationsTab() {
  const { t } = useTranslation();
  const [userIdInput, setUserIdInput] = useState("");
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [inputError, setInputError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const openDetail = (id: number) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  // `currentData`: đổi trang/bộ lọc thì hiện khung chờ thay vì danh sách của tham số cũ.
  const { currentData, error, isFetching, refetch } = useGetAssistantConversationsQuery({
    userId,
    page,
    size: PAGE_SIZE,
  });
  const conversations: AssistantConversationView[] = Array.isArray(currentData?.data)
    ? currentData.data
    : [];
  const isLoading = isFetching && !currentData;
  // API trả mảng phẳng, không có tổng: trang đủ PAGE_SIZE thì có thể còn trang sau.
  const hasNext = conversations.length === PAGE_SIZE;

  const applyFilter = (event?: FormEvent) => {
    event?.preventDefault();
    const raw = userIdInput.trim();
    if (!raw) {
      setInputError(null);
      setUserId(undefined);
      setPage(0);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setInputError(t("admin.knowledge.conversations.userIdInvalid"));
      return;
    }
    setInputError(null);
    setUserId(parsed);
    setPage(0);
  };

  const clearFilter = () => {
    setUserIdInput("");
    setInputError(null);
    setUserId(undefined);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <form onSubmit={applyFilter} className="flex flex-wrap items-start gap-2">
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                inputMode="numeric"
                placeholder={t("admin.knowledge.conversations.filterPlaceholder")}
                aria-label={t("admin.knowledge.conversations.filterAria")}
                className="h-9 w-64 pl-9"
              />
            </div>
            {inputError && <p className="mt-1 text-xs text-red-600">{inputError}</p>}
          </div>
          <Button type="submit" variant="outline" size="sm">
            {t("button.filter")}
          </Button>
          {userId != null && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilter}>
              <X className="h-4 w-4" />
              {t("admin.knowledge.conversations.clearFilter", { id: userId })}
            </Button>
          )}
        </form>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          {t("button.refresh")}
        </Button>
      </div>

      {error ? (
        <ErrorState
          variant="inline"
          title={t("admin.knowledge.conversations.loadFailed")}
          message={getKnowledgeErrorMessage(error, t("admin.knowledge.conversations.loadFailedMessage"))}
          onRetry={() => refetch()}
        />
      ) : (
        <Card className="overflow-hidden border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                <TableHead className="w-20 font-semibold text-foreground">#</TableHead>
                <TableHead className="font-semibold text-foreground">
                  {t("admin.knowledge.conversations.columns.user")}
                </TableHead>
                <TableHead className="min-w-[240px] font-semibold text-foreground">
                  {t("admin.knowledge.conversations.columns.title")}
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {t("admin.knowledge.conversations.columns.messages")}
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  {t("admin.knowledge.conversations.columns.startedAt")}
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  {t("admin.knowledge.conversations.columns.updatedAt")}
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    <MessagesSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {page > 0
                      ? t("admin.knowledge.conversations.noMorePage")
                      : userId != null
                        ? t("admin.knowledge.conversations.noUserConversations", { id: userId })
                        : t("admin.knowledge.conversations.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(c.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/users/${c.userId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-primary hover:underline"
                      >
                        #{c.userId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-2 text-sm text-foreground">
                        {c.title?.trim() || (
                          <span className="italic text-muted-foreground">
                            {t("admin.knowledge.conversations.untitled")}
                          </span>
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.messageCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(c.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(c.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(c.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        {t("admin.knowledge.conversations.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {t("admin.knowledge.conversations.pageInfo", { page: page + 1, size: PAGE_SIZE })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("pagination.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext || isFetching}
          >
            {t("pagination.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConversationDetailSheet
        open={detailOpen}
        conversationId={selectedId}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
