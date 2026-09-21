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

const CUSTOM_TITLE = "__custom__";

interface AddEvalCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: KnowledgeDocument[];
}

export function AddEvalCaseDialog({ open, onOpenChange, documents }: AddEvalCaseDialogProps) {
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
    ? "Nhập câu hỏi."
    : question.trim().length > MAX_QUESTION_LENGTH
      ? `Câu hỏi tối đa ${MAX_QUESTION_LENGTH} ký tự.`
      : null;
  const titleError = !mustRefuse && !expectedTitle ? "Chọn hoặc nhập tài liệu mong đợi." : null;

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
      toast.success("Đã thêm câu đánh giá");
      if (keepOpen) {
        // Giữ vai trò / tài liệu để nhập tiếp các câu cùng nhóm.
        setQuestion("");
        setTouched(false);
      } else {
        reset();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error("Không thêm được câu đánh giá", {
        description: getKnowledgeErrorMessage(err, "Đã xảy ra lỗi khi lưu."),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm câu đánh giá</DialogTitle>
          <DialogDescription>
            Câu thường phải truy xuất trúng tài liệu mong đợi; câu “phải từ chối” (ngoài phạm vi,
            hoặc tài liệu nội bộ mà vai trò này không được đọc) phải không có đoạn nào đạt ngưỡng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="eval-question" className="mb-1.5 block text-xs">
              Câu hỏi *
            </Label>
            <Textarea
              id="eval-question"
              rows={3}
              value={question}
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ví dụ: Quá hạn nhận đồ thì bị tính phí thế nào?"
              disabled={isLoading}
            />
            {touched && questionError && <p className="mt-1 text-xs text-red-600">{questionError}</p>}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Người hỏi có vai trò</Label>
            <RoleCheckboxGroup
              idPrefix="eval-role"
              options={EVAL_CASE_ROLES}
              value={roles}
              onToggle={(role, checked) => setRoles((prev) => toggleEvalRole(prev, role, checked))}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Chỉ tài liệu mở cho các vai trò này (hoặc “Tất cả người dùng”) mới được tìm. Bỏ hết = Khách hàng.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="eval-must-refuse" className="text-sm font-medium">
                Phải từ chối
              </Label>
              <p className="text-xs text-muted-foreground">
                Đạt khi không có đoạn tài liệu nào vượt ngưỡng liên quan.
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
              <Label className="mb-1.5 block text-xs">Tài liệu mong đợi *</Label>
              <Select value={titleChoice} onValueChange={setTitleChoice} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tài liệu trong kho…" />
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
                  <SelectItem value={CUSTOM_TITLE}>Nhập tiêu đề khác…</SelectItem>
                </SelectContent>
              </Select>
              {titleChoice === CUSTOM_TITLE && (
                <Input
                  className="mt-2"
                  value={customTitle}
                  maxLength={MAX_TITLE_LENGTH}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Tiêu đề tài liệu (khớp không phân biệt hoa thường)"
                  disabled={isLoading}
                />
              )}
              {touched && titleError && <p className="mt-1 text-xs text-red-600">{titleError}</p>}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Huỷ
          </Button>
          <Button variant="secondary" onClick={() => submit(true)} disabled={isLoading}>
            Lưu và thêm câu khác
          </Button>
          <Button onClick={() => submit(false)} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
