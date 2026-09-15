import { memo } from "react";
import { Globe, History, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatDateTime } from "~/lib/datetime";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import type { SettingView } from "~/stores/apis/admin/businessSettings";
import { SettingInput } from "./SettingInput";
import {
  currentRaw,
  formatSettingValue,
  isDirty,
  rangeHint,
  settingLabel,
  validateSetting,
} from "./setting-utils";

interface SettingRowProps {
  setting: SettingView;
  draft: string | undefined;
  resetting: boolean;
  disabled?: boolean;
  onDraftChange: (key: string, raw: string) => void;
  onRevertDraft: (key: string) => void;
  onReset: (setting: SettingView) => void;
  onShowHistory: (key: string) => void;
}

function SettingRowComponent({
  setting,
  draft,
  resetting,
  disabled,
  onDraftChange,
  onRevertDraft,
  onReset,
  onShowHistory,
}: SettingRowProps) {
  const label = settingLabel(setting);
  const value = draft ?? currentRaw(setting);
  const dirty = isDirty(setting, draft);
  const error = draft !== undefined ? validateSetting(setting, draft) : null;
  const hint = rangeHint(setting);
  const inputId = `setting-${setting.scope}-${setting.key}`;

  return (
    <div
      className={cn(
        "grid gap-x-8 gap-y-3 px-4 py-4 transition-colors sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]",
        dirty && "bg-amber-50/70 dark:bg-amber-500/5",
      )}
    >
      {/* Mô tả */}
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <label htmlFor={inputId} className="mr-1 text-sm font-medium text-foreground">
            {label}
          </label>
          {dirty && (
            <Badge variant="outline" className="border-amber-300 bg-amber-100 text-[11px] font-medium text-amber-800">
              Chưa lưu
            </Badge>
          )}
          {setting.overridden && (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[11px] font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              Đã tuỳ chỉnh
            </Badge>
          )}
          {setting.publicValue && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-help gap-1 border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  <Globe className="h-3 w-3" />
                  Công khai
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Giá trị được trả cho ứng dụng khách qua API công khai, không cần đăng nhập.
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {setting.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{setting.description}</p>
        )}

        <p className="break-all font-mono text-[11px] text-muted-foreground/80">{setting.key}</p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            Mặc định:{" "}
            <span className="font-medium text-foreground/80">
              {formatSettingValue(setting, setting.defaultValue)}
            </span>
          </span>
          {setting.updatedAt && (
            <span>
              Cập nhật lúc {formatDateTime(setting.updatedAt)}
              {setting.updatedByUserId != null && ` · người dùng #${setting.updatedByUserId}`}
            </span>
          )}
          <button
            type="button"
            onClick={() => onShowHistory(setting.key)}
            className="inline-flex items-center gap-1 font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            <History className="h-3 w-3" />
            Xem lịch sử
          </button>
        </div>
      </div>

      {/* Ô nhập + thao tác */}
      <div className="min-w-0 space-y-1.5">
        <SettingInput
          id={inputId}
          setting={setting}
          value={value}
          invalid={!!error}
          disabled={disabled || resetting}
          onChange={(raw) => onDraftChange(setting.key, raw)}
        />

        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          hint && <p className="text-xs text-muted-foreground">{hint}</p>
        )}

        {dirty && (
          <p className="text-[11px] text-amber-800 dark:text-amber-300">
            Đang lưu trên hệ thống: {formatSettingValue(setting, setting.value)}
          </p>
        )}

        {(dirty || setting.overridden) && (
          <div className="flex flex-wrap justify-end gap-1 pt-0.5">
            {dirty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => onRevertDraft(setting.key)}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Hoàn tác
              </Button>
            )}
            {setting.overridden && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || resetting}
                    className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {resetting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Khôi phục mặc định
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Khôi phục giá trị mặc định?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium text-foreground">{label}</span> sẽ quay về giá
                          trị mặc định của service.
                        </p>
                        <p>
                          Hiện tại: <span className="font-medium text-foreground">{formatSettingValue(setting, setting.value)}</span>
                          <br />
                          Mặc định: <span className="font-medium text-foreground">{formatSettingValue(setting, setting.defaultValue)}</span>
                        </p>
                        {dirty && <p className="text-amber-700">Thay đổi chưa lưu của quy tắc này sẽ bị bỏ.</p>}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Huỷ</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onReset(setting)}>Khôi phục</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const SettingRow = memo(SettingRowComponent);
