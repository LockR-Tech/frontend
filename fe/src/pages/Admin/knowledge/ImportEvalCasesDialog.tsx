import { useMemo, useState } from "react";
import { ClipboardPaste, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useAddKnowledgeEvalCasesMutation } from "~/stores/apis/admin/knowledge";
import {
  EVAL_JSON_EXAMPLE,
  getKnowledgeErrorMessage,
  parseEvalCasesJson,
} from "./knowledge-utils";

interface ImportEvalCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dán một mảng JSON câu đánh giá; kiểm tra toàn bộ trước khi gửi một lần. */
export function ImportEvalCasesDialog({ open, onOpenChange }: ImportEvalCasesDialogProps) {
  const [addCases, { isLoading }] = useAddKnowledgeEvalCasesMutation();
  const [text, setText] = useState("");

  const parsed = useMemo(() => (text.trim() ? parseEvalCasesJson(text) : null), [text]);
  const canSubmit = !!parsed && parsed.errors.length === 0 && parsed.cases.length > 0;

  const handleOpenChange = (next: boolean) => {
    if (!next && isLoading) return;
    if (!next) setText("");
    onOpenChange(next);
  };

  const submit = async () => {
    if (!parsed || !canSubmit) return;
    try {
      await addCases(parsed.cases).unwrap();
      toast.success(`Đã nhập ${parsed.cases.length} câu đánh giá`);
      setText("");
      onOpenChange(false);
    } catch (err) {
      toast.error("Không nhập được bộ câu đánh giá", {
        description: getKnowledgeErrorMessage(err, "Đã xảy ra lỗi khi lưu."),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nhập câu đánh giá từ JSON</DialogTitle>
          <DialogDescription>
            Dán một mảng các object{" "}
            <code className="rounded bg-muted px-1 font-mono text-[11px]">
              {"{ question, roles?, expectedDocumentTitle?, mustRefuse }"}
            </code>
            . <code className="font-mono text-[11px]">roles</code> mặc định CUSTOMER; câu không phải
            từ chối bắt buộc có <code className="font-mono text-[11px]">expectedDocumentTitle</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setText(EVAL_JSON_EXAMPLE)}
              disabled={isLoading}
            >
              <ClipboardPaste className="h-4 w-4" />
              Chèn ví dụ
            </Button>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            spellCheck={false}
            placeholder={EVAL_JSON_EXAMPLE}
            className="font-mono text-xs"
            disabled={isLoading}
            aria-label="Mảng JSON câu đánh giá"
          />

          {parsed && parsed.errors.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <p className="mb-1 font-semibold">
                {parsed.errors.length} lỗi — sửa hết rồi mới nhập được:
              </p>
              <ul className="list-disc space-y-0.5 pl-4">
                {parsed.errors.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          {canSubmit && parsed && (
            <p className="text-xs text-green-700">
              Hợp lệ: {parsed.cases.length} câu (
              {parsed.cases.filter((c) => c.mustRefuse).length} câu phải từ chối).
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={!canSubmit || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Nhập {canSubmit && parsed ? `${parsed.cases.length} câu` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
