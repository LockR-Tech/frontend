import { useMemo, useState } from "react";
import { ChevronDown, CircleCheck, CircleX, Sparkles } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDateTime } from "~/lib/datetime";
import { cn } from "~/lib/utils";
import type { KnowledgeEvalResult } from "~/stores/apis/admin/knowledge";
import {
  formatRatio,
  formatScore,
  knowledgeRoleLabel,
  sameTitle,
  type EvalRun,
} from "./knowledge-utils";

/** Tổng kết + bảng từng câu của lần chạy đánh giá gần nhất. */
export function EvalReportView({ run }: { run: EvalRun }) {
  const { report, generated, ranAt } = run;
  const [failedOnly, setFailedOnly] = useState(false);
  const results = useMemo(
    () => (failedOnly ? report.results.filter((r) => !r.passed) : report.results),
    [report.results, failedOnly],
  );
  const failed = report.total - report.passed;

  return (
    <Card className="space-y-4 border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">Kết quả đánh giá</h3>
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              generated ? "border-violet-300 bg-violet-50 text-violet-800" : "text-foreground",
            )}
          >
            {generated && <Sparkles className="h-3 w-3" />}
            {generated ? "Truy xuất + sinh câu trả lời" : "Chỉ truy xuất"}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDateTime(ranAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="eval-failed-only" checked={failedOnly} onCheckedChange={setFailedOnly} />
          <Label htmlFor="eval-failed-only" className="text-xs">
            Chỉ hiện câu trượt ({failed})
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile
          label="Đạt"
          value={formatRatio(report.passed, report.total)}
          tone={report.total > 0 && failed === 0 ? "good" : failed > 0 ? "bad" : undefined}
        />
        <SummaryTile
          label="Truy xuất trúng tài liệu"
          value={formatRatio(report.retrievalHits, report.retrievalCases)}
          tone={report.retrievalCases > 0 && report.retrievalHits < report.retrievalCases ? "bad" : undefined}
        />
        <SummaryTile
          label="Từ chối đúng"
          value={formatRatio(report.refusalCorrect, report.refusalCases)}
          tone={report.refusalCases > 0 && report.refusalCorrect < report.refusalCases ? "bad" : undefined}
        />
        <SummaryTile label="Ngưỡng liên quan đang áp dụng" value={formatScore(report.minScore)} />
      </div>
      <p className="text-xs text-muted-foreground">
        Truy xuất trượt nhiều → cân nhắc hạ ngưỡng hoặc sửa tài liệu; câu phải từ chối lại lọt → nâng
        ngưỡng. Chỉnh ngưỡng ở Cấu hình nghiệp vụ › Trợ lý hỏi đáp.
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60 hover:bg-secondary/60">
              <TableHead className="w-24 font-semibold text-foreground">Kết quả</TableHead>
              <TableHead className="min-w-[240px] font-semibold text-foreground">Câu hỏi</TableHead>
              <TableHead className="min-w-[160px] font-semibold text-foreground">Mong đợi</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Điểm cao nhất</TableHead>
              <TableHead className="min-w-[200px] font-semibold text-foreground">
                Tài liệu tìm được (≥ ngưỡng)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  {report.total === 0 ? "Chưa có câu đánh giá nào." : "Không có câu trượt."}
                </TableCell>
              </TableRow>
            ) : (
              results.map((result) => <ResultRow key={result.caseId} result={result} />)
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-bold text-foreground",
          tone === "good" && "text-green-700",
          tone === "bad" && "text-red-700",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ResultRow({ result }: { result: KnowledgeEvalResult }) {
  const [open, setOpen] = useState(false);
  const titles = result.retrievedTitles ?? [];

  return (
    <TableRow className={cn(!result.passed && "bg-red-50/40")}>
      <TableCell className="align-top">
        {result.passed ? (
          <Badge variant="outline" className="gap-1 border-green-300 bg-green-50 text-green-800">
            <CircleCheck className="h-3 w-3" />
            Đạt
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-red-300 bg-red-50 text-red-800">
            <CircleX className="h-3 w-3" />
            Trượt
          </Badge>
        )}
      </TableCell>
      <TableCell className="align-top">
        <p className="whitespace-pre-wrap text-sm text-foreground">{result.question}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {(result.roles ?? []).map(knowledgeRoleLabel).join(", ") || "Khách hàng"}
        </p>
        {result.answer && (
          <Collapsible open={open} onOpenChange={setOpen} className="mt-1.5">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
              Câu trả lời của Claude
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1.5 whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-foreground">
              {result.answer}
            </CollapsibleContent>
          </Collapsible>
        )}
      </TableCell>
      <TableCell className="align-top text-sm">
        {result.mustRefuse ? (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            Phải từ chối
          </Badge>
        ) : (
          <span className="text-foreground">{result.expectedDocumentTitle ?? "—"}</span>
        )}
      </TableCell>
      <TableCell className="text-right align-top tabular-nums">
        {titles.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatScore(result.topScore)
        )}
      </TableCell>
      <TableCell className="align-top">
        {titles.length === 0 ? (
          <span className="text-xs text-muted-foreground">Không có đoạn nào đạt ngưỡng</span>
        ) : (
          <ul className="space-y-0.5 text-xs">
            {titles.map((title) => {
              const hit = !result.mustRefuse && sameTitle(title, result.expectedDocumentTitle);
              return (
                <li
                  key={title}
                  className={cn(
                    "text-muted-foreground",
                    hit && "font-semibold text-green-700",
                    result.mustRefuse && "text-red-700",
                  )}
                >
                  {title}
                </li>
              );
            })}
          </ul>
        )}
      </TableCell>
    </TableRow>
  );
}
