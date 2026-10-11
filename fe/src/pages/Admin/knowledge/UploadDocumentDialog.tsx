import { useRef, useState, type DragEvent } from "react";
import { FileText, FileUp, Loader2, X } from "lucide-react";
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
import { cn } from "~/lib/utils";
import {
  KNOWLEDGE_ROLES,
  useUploadKnowledgeDocumentMutation,
} from "~/stores/apis/admin/knowledge";
import { RoleCheckboxGroup } from "./RoleCheckboxGroup";
import {
  ACCEPT_ATTRIBUTE,
  MAX_TITLE_LENGTH,
  defaultTitleFromFileName,
  formatBytes,
  getKnowledgeErrorMessage,
  toggleDocumentRole,
  validateUploadFile,
} from "./knowledge-utils";
import { useTranslation } from "react-i18next";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentDialog({ open, onOpenChange }: UploadDocumentDialogProps) {
  const { t } = useTranslation();
  const [upload, { isLoading }] = useUploadKnowledgeDocumentMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [roles, setRoles] = useState<string[]>(["ALL"]);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setFile(null);
    setFileError(null);
    setTitle("");
    setRoles(["ALL"]);
    setDragOver(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isLoading) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const pickFile = (picked: File | null | undefined) => {
    if (!picked) return;
    setFile(picked);
    setFileError(validateUploadFile(picked));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    pickFile(event.dataTransfer.files?.[0]);
  };

  const clearFile = () => {
    setFile(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async () => {
    if (!file) {
      setFileError(t("admin.knowledge.upload.chooseFile"));
      return;
    }
    const error = validateUploadFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    const finalTitle = title.trim() || defaultTitleFromFileName(file.name);
    try {
      await upload({ file, title: title.trim() || undefined, allowedRoles: roles }).unwrap();
      toast.success(t("admin.knowledge.upload.uploaded", { title: finalTitle }), {
        description: t("admin.knowledge.upload.uploadedDesc"),
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(t("admin.knowledge.upload.failed"), {
        description: getKnowledgeErrorMessage(err, t("admin.knowledge.errors.genericUpload")),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.knowledge.upload.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.knowledge.upload.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs">{t("admin.knowledge.upload.fileLabel")}</Label>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {file ? (
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                  fileError ? "border-red-300 bg-red-50/60" : "border-border bg-muted/30",
                )}
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  disabled={isLoading}
                  aria-label={t("admin.knowledge.upload.removeFile")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/40",
                )}
              >
                <FileUp className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {t("admin.knowledge.upload.dropzone")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.knowledge.upload.formats")}
                </p>
              </div>
            )}
            {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
          </div>

          <div>
            <Label htmlFor="knowledge-upload-title" className="mb-1.5 block text-xs">
              {t("admin.knowledge.upload.titleLabel")}
            </Label>
            <Input
              id="knowledge-upload-title"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={file ? defaultTitleFromFileName(file.name) : t("admin.knowledge.upload.titlePlaceholder")}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.knowledge.upload.titleHint")}
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">{t("admin.knowledge.edit.rolesLabel")}</Label>
            <RoleCheckboxGroup
              idPrefix="knowledge-upload-role"
              options={KNOWLEDGE_ROLES}
              value={roles}
              onToggle={(role, checked) => setRoles((prev) => toggleDocumentRole(prev, role, checked))}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.knowledge.upload.rolesHint")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={isLoading || !file || !!fileError}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            {t("admin.knowledge.upload.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
