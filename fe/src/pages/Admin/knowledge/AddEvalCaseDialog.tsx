import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  EVAL_CASE_ROLES,
  useAddKnowledgeEvalCasesMutation,
  type KnowledgeDocument,
} from "~/stores/apis/admin/knowledge";
import { RoleCheckboxGroup } from "./RoleCheckboxGroup";
import {
  MAX_QUESTION_LENGTH,
  MAX_TITLE_LENGTH,
  getKnowledgeErrorMessage,
  statusMeta,
  toggleEvalRole,
} from "./knowledge-utils";
import { useTranslation } from "react-i18next";

const CUSTOM_TITLE = "__custom__";

interface AddEvalCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: KnowledgeDocument[];
}

export function AddEvalCaseDialog({ open, onOpenChange, documents }: AddEvalCaseDialogProps) {
  const { t } = useTranslation();
  const [addCases, { isLoading }] = useAddKnowledgeEvalCasesMutation();
  const [question, setQuestion] = useState("");
  const [roles, setRoles] = useState<string[]>(["CUSTOMER"]);
  const [mustRefuse, setMustRefuse] = useState(false);
  const [titleChoice, setTitleChoice] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [touched, setTouched] = useState(false);

  // Mỗi tiêu đề một lựa chọn (backend so khớp tiêu đề không phân biệt hoa thường).
  const titleOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { title: string; status: string }[] = [];
    for (const doc of documents) {
      const key = doc.title?.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      options.push({ title: doc.title.trim(), status: doc.status });
    }
    return options;
  }, [documents]);

  const expectedTitle = titleChoice === CUSTOM_TITLE ? customTitle.trim() : titleChoice;
  const questionError = !question.trim()
    ? t("admin.knowledge.addCase.questionRequired")
    : question.trim().length > MAX_QUESTION_LENGTH
      ? t("admin.knowledge.addCase.questionTooLong", { max: MAX_QUESTION_LENGTH })
      : null;
  const titleError = !mustRefuse && !expectedTitle ? t("admin.knowledge.addCase.expectedRequired") : null;

  const reset = () => {
    setQuestion("");
    setRoles(["CUSTOMER"]);
    setMustRefuse(false);
    setTitleChoice("");
    setCustomTitle("");
    setTouched(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isLoading) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async (keepOpen: boolean) => {
    setTouched(true);
    if (questionError || titleError) return;
    try {
      await addCases([
        {
          question: question.trim(),
          roles,
          expectedDocumentTitle: mustRefuse ? null : expectedTitle,
          mustRefuse,
        },
      ]).unwrap();
      toast.success(t("admin.knowledge.addCase.added"));
      if (keepOpen) {
        // Giữ vai trò / tài liệu để nhập tiếp các câu cùng nhóm.
        setQuestion("");
        setTouched(false);
      } else {
        reset();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(t("admin.knowledge.addCase.addFailed"), {
        description: getKnowledgeErrorMessage(err, t("admin.knowledge.errors.genericSave")),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.knowledge.addCase.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.knowledge.addCase.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="eval-question" className="mb-1.5 block text-xs">
              {t("admin.knowledge.addCase.questionLabel")}
            </Label>
            <Textarea
              id="eval-question"
              rows={3}
              value={question}
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("admin.knowledge.addCase.questionPlaceholder")}
              disabled={isLoading}
            />
            {touched && questionError && <p className="mt-1 text-xs text-red-600">{questionError}</p>}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">{t("admin.knowledge.addCase.rolesLabel")}</Label>
            <RoleCheckboxGroup
              idPrefix="eval-role"
              options={EVAL_CASE_ROLES}
              value={roles}
              onToggle={(role, checked) => setRoles((prev) => toggleEvalRole(prev, role, checked))}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.knowledge.addCase.rolesHint")}
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="eval-must-refuse" className="text-sm font-medium">
                {t("admin.knowledge.eval.mustRefuse")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("admin.knowledge.addCase.mustRefuseHint")}
              </p>
            </div>
            <Switch
              id="eval-must-refuse"
              checked={mustRefuse}
              onCheckedChange={setMustRefuse}
              disabled={isLoading}
            />
          </div>

          {!mustRefuse && (
            <div>
              <Label className="mb-1.5 block text-xs">{t("admin.knowledge.addCase.expectedLabel")}</Label>
              <Select value={titleChoice} onValueChange={setTitleChoice} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.knowledge.addCase.expectedPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {titleOptions.map((option) => (
                    <SelectItem key={option.title} value={option.title}>
                      {option.title}
                      {option.status !== "READY" && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({statusMeta(option.status).label})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_TITLE}>{t("admin.knowledge.addCase.customTitle")}</SelectItem>
                </SelectContent>
              </Select>
              {titleChoice === CUSTOM_TITLE && (
                <Input
                  className="mt-2"
                  value={customTitle}
                  maxLength={MAX_TITLE_LENGTH}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={t("admin.knowledge.addCase.customTitlePlaceholder")}
                  disabled={isLoading}
                />
              )}
              {touched && titleError && <p className="mt-1 text-xs text-red-600">{titleError}</p>}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button variant="secondary" onClick={() => submit(true)} disabled={isLoading}>
            {t("admin.knowledge.addCase.saveAndAdd")}
          </Button>
          <Button onClick={() => submit(false)} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("admin.knowledge.addCase.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
