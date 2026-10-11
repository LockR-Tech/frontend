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
import { Trans, useTranslation } from "react-i18next";

interface ImportEvalCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dán một mảng JSON câu đánh giá; kiểm tra toàn bộ trước khi gửi một lần. */
export function ImportEvalCasesDialog({ open, onOpenChange }: ImportEvalCasesDialogProps) {
  const { t } = useTranslation();
  const [addCases, { isLoading }] = useAddKnowledgeEvalCasesMutation();
  const [text, setText] = useState("");

  // `t` trong deps: thông báo lỗi do parseEvalCasesJson dịch, cần tính lại khi đổi ngôn ngữ.
  const parsed = useMemo(() => (text.trim() ? parseEvalCasesJson(text) : null), [text, t]);
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
      toast.success(t("admin.knowledge.import.imported", { count: parsed.cases.length }));
      setText("");
      onOpenChange(false);
    } catch (err) {
      toast.error(t("admin.knowledge.import.importFailed"), {
        description: getKnowledgeErrorMessage(err, t("admin.knowledge.errors.genericSave")),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("admin.knowledge.import.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="admin.knowledge.import.description"
              components={{
                shape: <code className="rounded bg-muted px-1 font-mono text-[11px]" />,
                code: <code className="font-mono text-[11px]" />,
              }}
            />
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
              {t("admin.knowledge.import.insertExample")}
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
            aria-label={t("admin.knowledge.import.textareaAria")}
          />

          {parsed && parsed.errors.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <p className="mb-1 font-semibold">
                {t("admin.knowledge.import.errorsTitle", { count: parsed.errors.length })}
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
              {t("admin.knowledge.import.valid", {
                count: parsed.cases.length,
                refusal: parsed.cases.filter((c) => c.mustRefuse).length,
              })}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!canSubmit || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {canSubmit && parsed
              ? t("admin.knowledge.import.submitCount", { count: parsed.cases.length })
              : t("admin.knowledge.import.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
