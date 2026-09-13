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
import {
  useGetFeedbackByIdQuery,
  useUpdateFeedbackStatusMutation,
  useReplyToFeedbackMutation,
} from "~/stores/apis/admin";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
          <h1 className="text-xl font-bold">Chi tiết phản hồi</h1>
        </div>
        <div className="flex flex-col items-center gap-4 py-16">
          <AlertCircle size={44} className="text-muted-foreground/50" />
          <p className="text-muted-foreground">Không tìm thấy phản hồi.</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  async function handleToggleResolved() {
    await updateStatus({
      id,
      data: { status: !isResolved ? "RESOLVED" : "PENDING" },
    });
    navigate("/admin/feedback");
  }

  async function handleReply() {
    if (!replyText.trim()) {
      setReplyError("Vui lòng nhập nội dung phản hồi.");
      return;
    }
    setReplyError("");
    await replyFeedback({ id, data: { reply: replyText.trim() } });
    setReplyText("");
    navigate("/admin/feedback");
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Chi tiết phản hồi #{fb.id}
            </h1>
            <p className="text-sm text-muted-foreground/70">
              Tạo lúc {fmtDate(fb.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={
              isResolved
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-yellow-100 text-yellow-700 border-yellow-200"
            }
          >
            {isResolved ? "Đã xử lý" : "Chờ xử lý"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={updatingStatus}
            onClick={handleToggleResolved}
            className="gap-1.5"
          >
            {isResolved ? (
              <>
                <Clock size={14} /> Đánh dấu chờ xử lý
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Đánh dấu đã xử lý
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ─── Left: feedback content + reply ─────────────────────────────── */}
        <div className="md:col-span-2 space-y-5">
          {/* Rating & comment */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Star size={16} className="text-yellow-500" />
                Nội dung đánh giá
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`flex items-center gap-4 p-4 rounded-xl border ${ratingColor}`}
              >
                <div className="text-4xl font-extrabold">{fb.rating}</div>
                <div>
                  <StarRow rating={fb.rating} size={20} />
                  <p className="text-xs mt-1 opacity-75">
                    {fb.rating >= 4
                      ? "Rất hài lòng"
                      : fb.rating === 3
                        ? "Bình thường"
                        : "Không hài lòng"}
                  </p>
                </div>
              </div>

              {fb.comment && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Nhận xét</p>
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
                      Đơn hàng liên quan:
                    </span>
                    <Badge variant="outline">#{fb.relatedOrderId}</Badge>
                    {fb.serviceType && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        {fb.serviceType}
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
            <Card className="border-green-200 bg-green-50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-900">
                  <MessageSquare size={16} />
                  Phản hồi từ quản trị viên
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-white border border-green-100 p-4 rounded-xl text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                  {fb.adminReply}
                </div>
                {fb.repliedAt && (
                  <p className="text-xs text-green-700">
                    Đã phản hồi lúc {fmtDate(fb.repliedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resolution info */}
          {(fb.resolvedBy || fb.resolvedAt) && (
            <Card className="border-blue-100 bg-blue-50 shadow-sm">
              <CardContent className="p-4 flex flex-wrap gap-6">
                {fb.resolvedBy && (
                  <LabelValue label="Giải quyết bởi">
                    {fb.resolvedBy}
                  </LabelValue>
                )}
                {fb.resolvedAt && (
                  <LabelValue label="Thời gian giải quyết">
                    {fmtDate(fb.resolvedAt)}
                  </LabelValue>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reply form */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-500" />
                {fb.adminReply ? "Cập nhật phản hồi" : "Thêm phản hồi"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={4}
                placeholder="Nhập nội dung phản hồi cho khách hàng..."
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value);
                  setReplyError("");
                }}
                className="resize-none"
              />
              {replyError && (
                <p className="text-sm text-red-600">{replyError}</p>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={replying}
                  onClick={handleReply}
                  className="gap-2"
                >
                  <MessageSquare size={14} />
                  {replying ? "Đang gửi..." : "Gửi phản hồi"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: user info + timeline ─────────────────────────────────── */}
        <div className="space-y-5">
          {/* User info */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User size={16} />
                Thông tin khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-600 text-white font-bold">
                    {fb.userName?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{fb.userName}</p>
                  <p className="text-xs text-muted-foreground/70">ID #{fb.userId}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                {fb.userEmail && (
                  <div className="flex items-start gap-2.5">
                    <Mail size={14} className="text-muted-foreground/70 mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground/80 break-all">
                      {fb.userEmail}
                    </span>
                  </div>
                )}
                {fb.userPhone && (
                  <div className="flex items-center gap-2.5">
                    <Phone size={14} className="text-muted-foreground/70 shrink-0" />
                    <span className="text-sm text-foreground/80">
                      {fb.userPhone}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar size={16} />
                Lịch sử
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-border/50 ml-2 space-y-5">
                <li className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                  <p className="text-xs text-muted-foreground">Tạo đánh giá</p>
                  <p className="text-sm font-medium">{fmtDate(fb.createdAt)}</p>
                </li>
                {fb.repliedAt && (
                  <li className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                    <p className="text-xs text-muted-foreground">Admin phản hồi</p>
                    <p className="text-sm font-medium">
                      {fmtDate(fb.repliedAt)}
                    </p>
                  </li>
                )}
                {fb.resolvedAt && (
                  <li className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-purple-500 border-2 border-white" />
                    <p className="text-xs text-muted-foreground">Đã giải quyết</p>
                    <p className="text-sm font-medium">
                      {fmtDate(fb.resolvedAt)}
                    </p>
                  </li>
                )}
                {fb.updatedAt !== fb.createdAt && (
                  <li className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-muted border-2 border-white" />
                    <p className="text-xs text-muted-foreground">Cập nhật gần nhất</p>
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
