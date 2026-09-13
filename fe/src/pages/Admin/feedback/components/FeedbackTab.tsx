import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
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
import { useGetAllFeedbackQuery } from "~/stores/apis/admin";
import { fmtDate, StarRow, ErrorBanner } from "./shared";
import { extractList } from "~/lib/extract-list";
import type { FeedbackDTO } from "~/types/admin/feedback";

export function FeedbackTab() {
  const navigate = useNavigate();
  const [minRating, setMinRating] = useState<string>("all");
  const [isResolved, setIsResolved] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useGetAllFeedbackQuery({
    page,
    size: 20,
    ...(minRating !== "all" && { minRating: Number(minRating) }),
    ...(isResolved !== "all" && { isResolved: isResolved === "true" }),
  });

  const list = extractList<FeedbackDTO>(data?.data);
  const total = list.length;

  return (
    <div className="space-y-4">
      {isError && <ErrorBanner onRetry={refetch} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={minRating}
          onValueChange={(v) => {
            setMinRating(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Sao tối thiểu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả sao</SelectItem>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {"★".repeat(n)} ({n} sao)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={isResolved}
          onValueChange={(v) => {
            setIsResolved(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="false">Chưa xử lý</SelectItem>
            <SelectItem value="true">Đã xử lý</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {isLoading ? "..." : `${total.toLocaleString("vi-VN")} phản hồi`}
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
                <TableHead>Đánh giá</TableHead>
                <TableHead className="max-w-xs">Nội dung</TableHead>
                <TableHead>Đơn hàng</TableHead>
                <TableHead className="text-center">Xử lý</TableHead>
                <TableHead>Thời gian</TableHead>
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
                    Không có phản hồi nào
                  </TableCell>
                </TableRow>
              )}
              {list.map((fb) => (
                <TableRow
                  key={fb.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/feedback/${fb.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{fb.userName}</p>
                      <p className="text-xs text-muted-foreground/70">{fb.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <StarRow rating={fb.rating} />
                      <span className="text-xs text-muted-foreground">
                        {fb.rating}/5
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {fb.comment}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fb.relatedOrderId ? `#${fb.relatedOrderId}` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        fb.isResolved
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }
                    >
                      {fb.isResolved ? "Đã xử lý" : "Chờ xử lý"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(fb.createdAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/admin/feedback/${fb.id}`)}
                    >
                      <Eye size={15} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
