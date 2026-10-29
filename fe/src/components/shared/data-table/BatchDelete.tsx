import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import type { DeleteManyResult } from "./delete-many";
import { ConfirmActionDialog } from "~/pages/Admin/knowledge/ConfirmActionDialog";

// ============================================
// Xoá theo tích / xoá tất cả cho các bảng admin
// ============================================

interface BatchDeleteBarProps {
  /// Danh từ số nhiều đã dịch, vd. "thông báo", "khuyến mãi".
  noun: string;
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => Promise<DeleteManyResult>;
  /// Số mục khớp bộ lọc hiện tại; không truyền `onDeleteAll` thì không có nút "Xoá tất cả".
  allCount?: number;
  onDeleteAll?: () => Promise<DeleteManyResult>;
  /// Ghi chú hiện trong hộp xác nhận (mục nào backend sẽ từ chối xoá).
  note?: string;
}

export function BatchDeleteBar({
  noun,
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  allCount = 0,
  onDeleteAll,
  note,
}: BatchDeleteBarProps) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState<"selected" | "all" | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    const action = confirm === "all" ? onDeleteAll : onDeleteSelected;
    if (!action) return;
    const total = confirm === "all" ? allCount : selectedCount;
    setRunning(true);
    try {
      const { deleted, failed } = await action();
      if (failed.length === 0) {
        toast.success(t("common.batchDelete.done", { count: deleted.length, noun }));
      } else {
        const reason = failed.find((f) => f.message)?.message;
        toast[deleted.length > 0 ? "warning" : "error"](
          t("common.batchDelete.partial", { deleted: deleted.length, total, noun }),
          { description: t("common.batchDelete.failedReason", { count: failed.length, reason: reason ?? "—" }) },
        );
      }
      setConfirm(null);
    } finally {
      setRunning(false);
    }
  };

  const count = confirm === "all" ? allCount : selectedCount;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
            <span>{t("common.batchDelete.selected", { count: selectedCount })}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/20"
              onClick={onClearSelection}
            >
              {t("common.batchDelete.clear")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs font-semibold shadow-xs"
              disabled={running}
              onClick={() => setConfirm("selected")}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {t("common.batchDelete.deleteSelected")}
            </Button>
          </div>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ListChecks size={14} className="text-muted-foreground/70" />
            {t("common.batchDelete.hint", { noun })}
          </span>
        )}

        {onDeleteAll && allCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-destructive/40 text-xs font-semibold text-destructive shadow-xs hover:bg-destructive/10 hover:text-destructive"
            disabled={running}
            onClick={() => setConfirm("all")}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t("common.batchDelete.deleteAll", { count: allCount })}
          </Button>
        )}
      </div>

      <ConfirmActionDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t(confirm === "all" ? "common.batchDelete.confirmAllTitle" : "common.batchDelete.confirmSelectedTitle", {
          count,
          noun,
        })}
        description={
          <>
            <p>{t("common.batchDelete.confirmDesc", { count, noun })}</p>
            {note && <p className="rounded-lg border bg-muted/60 p-2.5 text-xs">{note}</p>}
          </>
        }
        actionLabel={t("common.delete")}
        destructive
        loading={running}
        onConfirm={() => void run()}
      />
    </>
  );
}
