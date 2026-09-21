import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  KNOWLEDGE_ROLES,
  useUpdateKnowledgeDocumentMutation,
  type KnowledgeDocument,
} from "~/stores/apis/admin/knowledge";
import { RoleCheckboxGroup } from "./RoleCheckboxGroup";
import { MAX_TITLE_LENGTH, getKnowledgeErrorMessage, toggleDocumentRole } from "./knowledge-utils";

interface EditDocumentDialogProps {
  document: KnowledgeDocument | null;
  onClose: () => void;
}

function sameRoles(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((r) => set.has(r));
}

function initialRoles(doc: KnowledgeDocument | null): string[] {
  const roles = doc?.allowedRoles?.filter(Boolean) ?? [];
  return roles.length === 0 || roles.includes("ALL") ? ["ALL"] : roles;
}

/** Sửa tiêu đề / vai trò được đọc. Đổi vai trò không cần đánh chỉ mục lại. */
export function EditDocumentDialog({ document, onClose }: EditDocumentDialogProps) {
  const [update, { isLoading }] = useUpdateKnowledgeDocumentMutation();
  const [title, setTitle] = useState("");
  const [roles, setRoles] = useState<string[]>(["ALL"]);
  const [touched, setTouched] = useState(false);

  // Đồng bộ form mỗi lần mở cho một tài liệu khác.
  const [lastId, setLastId] = useState<number | null>(null);
  if (document && document.id !== lastId) {
    setLastId(document.id);
    setTitle(document.title ?? "");
    setRoles(initialRoles(document));
    setTouched(false);
  }

  const close = () => {
    if (isLoading) return;
    setLastId(null);
    onClose();
  };

  const submit = async () => {
    if (!document) return;
    setTouched(true);
    const trimmed = title.trim();
    if (!trimmed) return;

    const titleChanged = trimmed !== (document.title ?? "").trim();
    const rolesChanged = !sameRoles(roles, initialRoles(document));
    if (!titleChanged && !rolesChanged) {
      close();
      return;
    }
    try {
      await update({
        id: document.id,
        ...(titleChanged ? { title: trimmed } : {}),
        ...(rolesChanged ? { allowedRoles: roles } : {}),
      }).unwrap();
      toast.success(`Đã cập nhật “${trimmed}”`);
      setLastId(null);
      onClose();
    } catch (err) {
      toast.error("Không cập nhật được tài liệu", {
        description: getKnowledgeErrorMessage(err, "Đã xảy ra lỗi khi lưu."),
      });
    }
  };

  return (
    <Dialog open={!!document} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa tài liệu</DialogTitle>
          <DialogDescription className="truncate" title={document?.fileName}>
            {document?.fileName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="knowledge-edit-title" className="mb-1.5 block text-xs">
              Tiêu đề *
            </Label>
            <Input
              id="knowledge-edit-title"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
            {touched && !title.trim() && (
              <p className="mt-1 text-xs text-red-600">Nhập tiêu đề tài liệu.</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Đổi tiêu đề thì các câu đánh giá đang trỏ tới tiêu đề cũ cần sửa theo.
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Ai được dùng tài liệu này để hỏi đáp</Label>
            <RoleCheckboxGroup
              idPrefix="knowledge-edit-role"
              options={KNOWLEDGE_ROLES}
              value={roles}
              onToggle={(role, checked) => setRoles((prev) => toggleDocumentRole(prev, role, checked))}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Đổi vai trò có hiệu lực ngay, không cần đánh chỉ mục lại.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isLoading}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
