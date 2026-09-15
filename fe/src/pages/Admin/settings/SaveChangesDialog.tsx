import { ArrowRight, Loader2, Save } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { formatSettingValue, settingLabel, type SettingChange } from "./setting-utils";

interface SaveChangesDialogProps {
  open: boolean;
  scopeTitle: string;
  changes: SettingChange[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SaveChangesDialog({
  open,
  scopeTitle,
  changes,
  saving,
  onOpenChange,
  onConfirm,
}: SaveChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6">
          <DialogTitle>Xác nhận lưu {changes.length} thay đổi</DialogTitle>
          <DialogDescription>
            Nhóm “{scopeTitle}”. Các giá trị được lưu cùng lúc; nếu có giá trị bị từ chối thì cả
            lô sẽ không được áp dụng.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[55vh] divide-y divide-border/60 overflow-y-auto px-6">
          {changes.map(({ setting, raw }) => (
            <li key={setting.key} className="py-3">
              <p className="text-sm font-medium text-foreground">{settingLabel(setting)}</p>
              <p className="break-all font-mono text-[11px] text-muted-foreground">{setting.key}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground line-through decoration-muted-foreground/40">
                  {formatSettingValue(setting, setting.value)}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-foreground">
                  {formatSettingValue(setting, raw)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter className="gap-2 border-t border-border/60 px-6 py-4 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Quay lại
          </Button>
          <Button onClick={onConfirm} disabled={saving || changes.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Xác nhận lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
