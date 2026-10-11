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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      toast.success(t("admin.knowledge.edit.updated", { title: trimmed }));
      setLastId(null);
      onClose();
    } catch (err) {
      toast.error(t("admin.knowledge.edit.updateFailed"), {
        description: getKnowledgeErrorMessage(err, t("admin.knowledge.errors.genericSave")),
      });
    }
  };

  return (
    <Dialog open={!!document} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.knowledge.edit.title")}</DialogTitle>
          <DialogDescription className="truncate" title={document?.fileName}>
            {document?.fileName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="knowledge-edit-title" className="mb-1.5 block text-xs">
              {t("admin.knowledge.edit.titleLabel")}
            </Label>
            <Input
              id="knowledge-edit-title"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
            {touched && !title.trim() && (
              <p className="mt-1 text-xs text-red-600">{t("admin.knowledge.edit.titleRequired")}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.knowledge.edit.titleHint")}
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">{t("admin.knowledge.edit.rolesLabel")}</Label>
            <RoleCheckboxGroup
              idPrefix="knowledge-edit-role"
              options={KNOWLEDGE_ROLES}
              value={roles}
              onToggle={(role, checked) => setRoles((prev) => toggleDocumentRole(prev, role, checked))}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.knowledge.edit.rolesHint")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("button.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
