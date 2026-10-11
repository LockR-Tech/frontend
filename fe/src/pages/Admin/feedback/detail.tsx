import { formatDateTime } from "~/lib/datetime";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MessageSquare,
  AlertCircle,
  Star,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  ShoppingBag,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";
import { orderTypeMeta } from "~/components/shared/reporting/report-meta";
import {
  useGetFeedbackByIdQuery,
  useUpdateFeedbackStatusMutation,
  useReplyToFeedbackMutation,
} from "~/stores/apis/admin";
import { useTranslation } from "react-i18next";

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Chuỗi backend không kèm múi giờ = UTC, phải qua formatDateTime mới ra giờ VN.
function fmtDate(d: string) {
  return formatDateTime(d);
}

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string } } | undefined)?.data;
  return data?.message || fallback;
}

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

function LabelValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-60 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FeedbackDetailPage() {
  const { t } = useTranslation();
  const { feedbackId } = useParams<{ feedbackId: string }>();
  const navigate = useNavigate();
  const id = Number(feedbackId);

  const { data, isLoading, isError, refetch } = useGetFeedbackByIdQuery(id, {
    skip: !id,
  });
  const [updateStatus, { isLoading: updatingStatus }] =
    useUpdateFeedbackStatusMutation();
  const [replyFeedback, { isLoading: replying }] = useReplyToFeedbackMutation();

  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");

  const fb = data?.data;
  const isResolved = !!fb?.resolvedAt;

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !fb) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-xl font-bold">{t("admin.feedback.detail.title")}</h1>
        </div>
        <div className="flex flex-col items-center gap-4 py-16">
          <AlertCircle size={44} className="text-muted-foreground/50" />
          <p className="text-muted-foreground">{t("admin.feedback.detail.notFound")}</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  // Ở lại trang để thấy kết quả (danh sách và chi tiết tự làm mới qua tag); lỗi thì báo lỗi.
  async function handleToggleResolved() {
    try {
      await updateStatus({
        id,
        data: { status: !isResolved ? "RESOLVED" : "PENDING" },
      }).unwrap();
      toast.success(
        !isResolved ? t("admin.feedback.detail.markedResolved") : t("admin.feedback.detail.reopened"),
      );
    } catch (err) {
      toast.error(t("admin.feedback.detail.statusUpdateFailed"), {
        description: errorMessage(err, t("admin.feedback.detail.genericError")),
      });
    }
  }

  async function handleReply() {
    if (!replyText.trim()) {
      setReplyError(t("admin.feedback.detail.replyRequired"));
      return;
    }
    setReplyError("");
    try {
      await replyFeedback({ id, data: { reply: replyText.trim() } }).unwrap();
      setReplyText("");
      toast.success(t("admin.feedback.detail.replySent"));
    } catch (err) {
      setReplyError(errorMessage(err, t("admin.feedback.detail.genericError")));
    }
  }

  const ratingColor =
    fb.rating >= 4
      ? "bg-green-50 border-green-200 text-green-700"
      : fb.rating === 3
        ? "bg-yellow-50 border-yellow-200 text-yellow-700"
        : "bg-red-50 border-red-200 text-red-700";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("admin.feedback.detail.titleWithId", { id: fb.id })}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("admin.feedback.detail.createdAt", { date: fmtDate(fb.createdAt) })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              isResolved
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-0.5"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs px-2.5 py-0.5"
            }
          >
            {isResolved ? t("admin.feedback.status.resolved") : t("admin.feedback.status.pending")}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={updatingStatus}
            onClick={handleToggleResolved}
            className="gap-1.5 h-8 text-xs"
          >
            {isResolved ? (
              <>
                <Clock size={13} /> {t("admin.feedback.detail.markPending")}
              </>
            ) : (
              <>
                <CheckCircle2 size={13} /> {t("admin.feedback.detail.markResolved")}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ─── Left: feedback content + reply ─────────────────────────────── */}
        <div className="md:col-span-2 space-y-5">
          {/* Rating & comment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Star size={16} className="text-foreground/70" />
                {t("admin.feedback.detail.ratingContent")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-secondary/50"
              >
                <div className="text-4xl font-extrabold tracking-tight text-foreground">{fb.rating}</div>
                <div>
                  <StarRow rating={fb.rating} size={18} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {fb.rating >= 4
                      ? t("admin.feedback.detail.sentiment.veryHappy")
                      : fb.rating === 3
                        ? t("admin.feedback.detail.sentiment.neutral")
                        : t("admin.feedback.detail.sentiment.unhappy")}
                  </p>
                </div>
              </div>

              {fb.comment && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{t("admin.feedback.detail.comment")}</p>
                  <div className="bg-muted/30 border border-border/30 p-4 rounded-xl text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                    {fb.comment}
                  </div>
                </div>
              )}

              {fb.relatedOrderId && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={14} className="text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("admin.feedback.detail.relatedOrder")}
                    </span>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => navigate(`/admin/orders/${fb.relatedOrderId}`)}
                    >
                      {fb.orderCode || `#${fb.relatedOrderId}`}
                    </Badge>
                    {fb.serviceType && (
                      <Badge variant="outline" className="text-xs">
                        {orderTypeMeta(fb.serviceType).label}
                      </Badge>
                    )}
                    {fb.orderAmount != null && (
                      <span className="text-sm text-muted-foreground">
                        —{" "}
                        {fb.orderAmount.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })}
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Admin reply (existing) */}
          {fb.adminReply && (
            <Card className="border-border bg-secondary/30 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <MessageSquare size={16} />
                  {t("admin.feedback.detail.adminReply")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-card border border-border p-4 rounded-xl text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                  {fb.adminReply}
                </div>
                {fb.repliedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t("admin.feedback.detail.repliedAt", { date: fmtDate(fb.repliedAt) })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resolution info */}
          {(fb.resolvedBy || fb.resolvedAt) && (
            <Card className="border-border bg-secondary/30 shadow-xs">
              <CardContent className="p-4 flex flex-wrap gap-6">
                {fb.resolvedBy && (
                  <LabelValue label={t("admin.feedback.detail.resolvedBy")}>
                    {fb.resolvedBy}
                  </LabelValue>
                )}
                {fb.resolvedAt && (
                  <LabelValue label={t("admin.feedback.detail.resolvedAt")}>
                    {fmtDate(fb.resolvedAt)}
                  </LabelValue>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reply form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare size={16} className="text-muted-foreground" />
                {fb.adminReply ? t("admin.feedback.detail.updateReply") : t("admin.feedback.detail.addReply")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={4}
                placeholder={t("admin.feedback.detail.replyPlaceholder")}
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value);
                  setReplyError("");
                }}
                className="resize-none"
              />
              {replyError && (
                <p className="text-sm text-destructive">{replyError}</p>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={replying}
                  onClick={handleReply}
                  className="gap-2 bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
                >
                  <MessageSquare size={14} />
                  {replying ? t("admin.feedback.detail.sending") : t("admin.feedback.detail.sendReply")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: user info + timeline ─────────────────────────────────── */}
        <div className="space-y-5">
          {/* User info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User size={16} />
                {t("admin.feedback.detail.customerInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarFallback className="bg-secondary text-foreground font-bold">
                    {fb.userName?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{fb.userName || t("common.customer")}</p>
                  <p className="text-xs text-muted-foreground">{t("admin.feedback.detail.customerId", { id: fb.userId })}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                {fb.userEmail && (
                  <div className="flex items-start gap-2.5">
                    <Mail size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground/80 break-all">
                      {fb.userEmail}
                    </span>
                  </div>
                )}
                {fb.userPhone && (
                  <div className="flex items-center gap-2.5">
                    <Phone size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground/80">
                      {fb.userPhone}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar size={16} />
                {t("admin.feedback.detail.history")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-border ml-2 space-y-5">
                <li className="ml-4">
                  <div className="absolute -left-1 mt-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <p className="text-xs text-muted-foreground">{t("admin.feedback.detail.timeline.created")}</p>
                  <p className="text-sm font-medium">{fmtDate(fb.createdAt)}</p>
                </li>
                {fb.repliedAt && (
                  <li className="ml-4">
                    <div className="absolute -left-1 mt-1.5 w-2.5 h-2.5 rounded-full bg-muted-foreground ring-4 ring-background" />
                    <p className="text-xs text-muted-foreground">{t("admin.feedback.detail.timeline.adminReplied")}</p>
                    <p className="text-sm font-medium">
                      {fmtDate(fb.repliedAt)}
                    </p>
                  </li>
                )}
                {fb.resolvedAt && (
                  <li className="ml-4">
                    <div className="absolute -left-1 mt-1.5 w-2.5 h-2.5 rounded-full bg-foreground ring-4 ring-background" />
                    <p className="text-xs text-muted-foreground">{t("admin.feedback.detail.timeline.resolved")}</p>
                    <p className="text-sm font-medium">
                      {fmtDate(fb.resolvedAt)}
                    </p>
                  </li>
                )}
                {fb.updatedAt !== fb.createdAt && (
                  <li className="ml-4">
                    <div className="absolute -left-1 mt-1.5 w-2.5 h-2.5 rounded-full bg-border ring-4 ring-background" />
                    <p className="text-xs text-muted-foreground">{t("admin.feedback.detail.timeline.lastUpdated")}</p>
                    <p className="text-sm font-medium">
                      {fmtDate(fb.updatedAt)}
                    </p>
                  </li>
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
