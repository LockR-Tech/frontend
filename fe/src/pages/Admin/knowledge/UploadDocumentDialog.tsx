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

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentDialog({ open, onOpenChange }: UploadDocumentDialogProps) {
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
      setFileError("Chọn file tài liệu.");
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
      toast.success(`Đã tải lên “${finalTitle}”`, {
        description: "Tài liệu đang chờ đánh chỉ mục; danh sách tự cập nhật khi xong.",
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error("Không tải lên được tài liệu", {
        description: getKnowledgeErrorMessage(err, "Đã xảy ra lỗi khi tải lên."),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tải tài liệu lên kho tri thức</DialogTitle>
          <DialogDescription>
            Markdown, TXT, HTML, PDF hoặc DOCX, tối đa 20 MB. Tài liệu được chia đoạn và đánh chỉ
            mục ở nền.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs">File tài liệu *</Label>
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
                  aria-label="Bỏ chọn file"
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
                  Kéo thả file vào đây hoặc bấm để chọn
                </p>
                <p className="text-xs text-muted-foreground">
                  .md · .markdown · .txt · .html · .htm · .pdf · .docx — tối đa 20 MB
                </p>
              </div>
            )}
            {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
          </div>

          <div>
            <Label htmlFor="knowledge-upload-title" className="mb-1.5 block text-xs">
              Tiêu đề
            </Label>
            <Input
              id="knowledge-upload-title"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={file ? defaultTitleFromFileName(file.name) : "Mặc định lấy theo tên file"}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Trợ lý trích dẫn nguồn bằng tiêu đề này; bộ đánh giá cũng so khớp theo tiêu đề.
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Ai được dùng tài liệu này để hỏi đáp</Label>
            <RoleCheckboxGroup
              idPrefix="knowledge-upload-role"
              options={KNOWLEDGE_ROLES}
              value={roles}
              onToggle={(role, checked) => setRoles((prev) => toggleDocumentRole(prev, role, checked))}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              “Tất cả người dùng” = mọi tài khoản đã đăng nhập. Tài liệu nội bộ (quy trình kỹ thuật…)
              chỉ nên mở cho vai trò cần thiết.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={isLoading || !file || !!fileError}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            Tải lên
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
