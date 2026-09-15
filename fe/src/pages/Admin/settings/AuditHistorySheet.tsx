import { useMemo, type ReactNode } from "react";
import { ArrowRight, Clock, History, PlugZap, RefreshCw, UserRound } from "lucide-react";
import { formatDateTime } from "~/lib/datetime";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  useGetBusinessSettingAuditsQuery,
  useGetBusinessSettingsQuery,
  type SettingAudit,
  type SettingScope,
  type SettingView,
} from "~/stores/apis/admin/businessSettings";
import {
  formatSettingValue,
  getApiErrorMessage,
  isUnsupportedScopeError,
  settingLabel,
} from "./setting-utils";

const ALL_KEYS = "__all__";
const AUDIT_LIMIT = 100;

interface AuditHistorySheetProps {
  open: boolean;
  scope: SettingScope;
  scopeTitle: string;
  filterKey: string | null;
  onFilterKeyChange: (key: string | null) => void;
  onOpenChange: (open: boolean) => void;
}

export function AuditHistorySheet({
  open,
  scope,
  scopeTitle,
  filterKey,
  onFilterKeyChange,
  onOpenChange,
}: AuditHistorySheetProps) {
  const settingsQuery = useGetBusinessSettingsQuery(scope, { skip: !open });
  const auditsQuery = useGetBusinessSettingAuditsQuery(
    { scope, key: filterKey ?? undefined, limit: AUDIT_LIMIT },
    { skip: !open },
  );

  const settings = useMemo<SettingView[]>(
    () => (Array.isArray(settingsQuery.data?.data) ? settingsQuery.data.data : []),
    [settingsQuery.data],
  );
  const settingsByKey = useMemo(
    () => new Map(settings.map((s) => [s.key, s])),
    [settings],
  );
  const keyOptions = useMemo(
    () => [...settings].sort((a, b) => settingLabel(a).localeCompare(settingLabel(b), "vi")),
    [settings],
  );

  const audits = Array.isArray(auditsQuery.data?.data) ? auditsQuery.data.data : [];
  const { isLoading, isFetching, error, refetch } = auditsQuery;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b border-border/60 px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Lịch sử thay đổi
          </SheetTitle>
          <SheetDescription className="text-xs">
            Nhóm “{scopeTitle}” · {AUDIT_LIMIT} thay đổi gần nhất, mới nhất ở trên.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <Select
            value={filterKey ?? ALL_KEYS}
            onValueChange={(v) => onFilterKeyChange(v === ALL_KEYS ? null : v)}
          >
            <SelectTrigger className="h-9 min-w-0 flex-1 text-sm" aria-label="Lọc theo quy tắc">
              <SelectValue placeholder="Tất cả quy tắc" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={ALL_KEYS}>Tất cả quy tắc</SelectItem>
              {filterKey && !settingsByKey.has(filterKey) && (
                <SelectItem value={filterKey}>{filterKey}</SelectItem>
              )}
              {keyOptions.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {settingLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Làm mới lịch sử"
          >
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <AuditSkeleton />
          ) : error && audits.length === 0 ? (
            isUnsupportedScopeError(error) ? (
              <EmptyMessage
                icon={<PlugZap className="h-7 w-7 text-muted-foreground/60" />}
                title="Service chưa hỗ trợ cấu hình"
                message="Service của nhóm này chưa triển khai lịch sử thay đổi."
              />
            ) : (
              <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">Không tải được lịch sử</p>
                <p className="text-muted-foreground">
                  {getApiErrorMessage(error, "Đã có lỗi xảy ra. Vui lòng thử lại.")}
                </p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                  Thử lại
                </Button>
              </div>
            )
          ) : audits.length === 0 ? (
            <EmptyMessage
              icon={<History className="h-7 w-7 text-muted-foreground/60" />}
              title="Chưa có thay đổi nào"
              message={
                filterKey
                  ? "Quy tắc này chưa từng được chỉnh sửa."
                  : "Các quy tắc trong nhóm này vẫn đang dùng giá trị ban đầu."
              }
            />
          ) : (
            <ol className="space-y-3">
              {audits.map((audit) => (
                <AuditItem
                  key={audit.id}
                  audit={audit}
                  setting={settingsByKey.get(audit.key)}
                  onFilter={filterKey ? undefined : () => onFilterKeyChange(audit.key)}
                />
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function auditValue(setting: SettingView | undefined, raw: string | null): string {
  if (raw === null) {
    return setting?.defaultValue != null
      ? `Mặc định (${formatSettingValue(setting, setting.defaultValue)})`
      : "Mặc định";
  }
  return setting ? formatSettingValue(setting, raw) : raw === "" ? "(để trống)" : raw;
}

function AuditItem({
  audit,
  setting,
  onFilter,
}: {
  audit: SettingAudit;
  setting: SettingView | undefined;
  onFilter?: () => void;
}) {
  const isReset = audit.newValue === null;
  return (
    <li className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {onFilter ? (
            <button
              type="button"
              onClick={onFilter}
              className="text-left text-sm font-medium text-foreground hover:underline"
              title="Chỉ xem lịch sử của quy tắc này"
            >
              {setting ? settingLabel(setting) : audit.key}
            </button>
          ) : (
            <p className="text-sm font-medium text-foreground">
              {setting ? settingLabel(setting) : audit.key}
            </p>
          )}
          <p className="break-all font-mono text-[11px] text-muted-foreground">{audit.key}</p>
        </div>
        {isReset && (
          <Badge
            variant="outline"
            className="shrink-0 border-slate-300 bg-slate-50 text-[11px] font-medium text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-300"
          >
            Khôi phục mặc định
          </Badge>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
          {auditValue(setting, audit.oldValue)}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-foreground">
          {auditValue(setting, audit.newValue)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDateTime(audit.changedAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <UserRound className="h-3 w-3" />
          {audit.actorUserId != null ? `Người dùng #${audit.actorUserId}` : "Hệ thống"}
        </span>
      </div>
    </li>
  );
}

function EmptyMessage({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải lịch sử">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border/60 p-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}
