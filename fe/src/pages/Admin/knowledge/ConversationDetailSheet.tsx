import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  ChevronDown,
  FileText,
  Loader2,
  Quote,
  RefreshCw,
  ShieldX,
  User,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
  useGetAssistantConversationQuery,
  type AssistantMessageView,
} from "~/stores/apis/admin/knowledge";
import { formatScore, getKnowledgeErrorMessage } from "./knowledge-utils";

interface ConversationDetailSheetProps {
  open: boolean;
  /** Giữ nguyên sau khi đóng để nội dung không nháy trống lúc sheet trượt ra. */
  conversationId: number | null;
  onClose: () => void;
}

/** Luồng hỏi–đáp của một hội thoại: cờ từ chối, điểm liên quan cao nhất và nguồn trích dẫn. */
export function ConversationDetailSheet({
  open,
  conversationId,
  onClose,
}: ConversationDetailSheetProps) {
  // `currentData` (không phải `data`) để đổi hội thoại không hiện tạm nội dung hội thoại trước.
  const { currentData, error, isFetching, refetch } = useGetAssistantConversationQuery(
    conversationId ?? 0,
    { skip: conversationId == null },
  );
  const detail = currentData?.data;
  const messages = detail?.messages ?? [];
  const answers = messages.filter((m) => m.role === "ASSISTANT");
  const refusedCount = answers.filter((m) => m.refused).length;

  return (
    <Sheet open={open && conversationId != null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="space-y-1 border-b border-border/60 px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="text-base">
            {detail?.conversation.title?.trim() || `Hội thoại #${conversationId ?? ""}`}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {detail ? (
                <>
                  <span>
                    Người dùng{" "}
                    <Link
                      to={`/admin/users/${detail.conversation.userId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      #{detail.conversation.userId}
                    </Link>
                  </span>
                  <span>{messages.length} tin nhắn</span>
                  <span>
                    {answers.length} câu trả lời · {refusedCount} từ chối
                  </span>
                  <span>Cập nhật {formatDateTime(detail.conversation.updatedAt)}</span>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
                    Làm mới
                  </button>
                </>
              ) : (
                <span>Đang tải…</span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {isFetching && !detail ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <ErrorState
              variant="inline"
              title="Không tải được hội thoại"
              message={getKnowledgeErrorMessage(error, "Không tải được hội thoại.")}
              onRetry={() => refetch()}
            />
          ) : messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Hội thoại chưa có tin nhắn.
            </p>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MessageBubble({ message }: { message: AssistantMessageView }) {
  const isUser = message.role === "USER";
  const sources = message.sources ?? [];

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary/10 text-primary" : "bg-muted text-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("min-w-0 max-w-[85%] space-y-1.5", isUser && "items-end text-right")}>
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-left text-sm",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : message.refused
                ? "rounded-tl-sm border border-amber-300 bg-amber-50 text-amber-950"
                : "rounded-tl-sm border border-border bg-card text-foreground",
          )}
        >
          {message.content}
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground",
            isUser && "justify-end",
          )}
        >
          <span>{formatDateTime(message.createdAt)}</span>
          {!isUser && message.refused && (
            <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800">
              <ShieldX className="h-3 w-3" />
              Từ chối / tài liệu chưa đề cập
            </Badge>
          )}
          {!isUser && message.topScore != null && (
            <Badge variant="outline" className="font-medium text-foreground">
              Điểm liên quan cao nhất {formatScore(message.topScore)}
            </Badge>
          )}
        </div>

        {!isUser && sources.length > 0 && <SourcesList sources={sources} />}
      </div>
    </div>
  );
}

function SourcesList({ sources }: { sources: NonNullable<AssistantMessageView["sources"]> }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="text-left">
      <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        {sources.length} nguồn trích dẫn
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {sources.map((source, index) => (
          <div
            key={`${source.chunkId}-${index}`}
            className="rounded-lg border border-border bg-muted/30 p-3 text-xs"
          >
            <p className="flex items-start gap-1.5 font-medium text-foreground">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                {source.documentTitle}
                {source.heading && (
                  <span className="font-normal text-muted-foreground"> › {source.heading}</span>
                )}
              </span>
            </p>
            {source.citedText && (
              <blockquote className="mt-2 flex gap-1.5 border-l-2 border-primary/40 pl-2 italic text-muted-foreground">
                <Quote className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                <span className="whitespace-pre-wrap">{source.citedText}</span>
              </blockquote>
            )}
            <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/80">
              Tài liệu #{source.documentId} · đoạn #{source.chunkId}
            </p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
