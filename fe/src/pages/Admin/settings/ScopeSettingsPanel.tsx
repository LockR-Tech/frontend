import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { History, PlugZap, RefreshCw, Save, SearchX, SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { ErrorState } from "~/components/ui/error-state";
import {
  useGetBusinessSettingsQuery,
  useResetBusinessSettingMutation,
  useUpdateBusinessSettingsMutation,
  type SettingScope,
  type SettingView,
} from "~/stores/apis/admin/businessSettings";
import type { ScopeTab } from "./constants";
import { SettingRow } from "./SettingRow";
import { SaveChangesDialog } from "./SaveChangesDialog";
import {
  collectChanges,
  getApiErrorMessage,
  groupSettings,
  isUnsupportedScopeError,
  matchesSearch,
  settingLabel,
  toPayloadValue,
  type DraftMap,
} from "./setting-utils";

interface ScopeSettingsPanelProps {
  tab: ScopeTab;
  drafts: DraftMap | undefined;
  search: string;
  onDraftChange: (scope: SettingScope, key: string, raw: string) => void;
  onRevertDraft: (scope: SettingScope, key: string) => void;
  onClearDrafts: (scope: SettingScope) => void;
  /** `null` = lịch sử cả nhóm. */
  onShowHistory: (key: string | null) => void;
}

export function ScopeSettingsPanel({
  tab,
  drafts,
  search,
  onDraftChange,
  onRevertDraft,
  onClearDrafts,
  onShowHistory,
}: ScopeSettingsPanelProps) {
  const { scope } = tab;
  const { data, error, isLoading, isFetching, refetch } = useGetBusinessSettingsQuery(scope);
  const [updateSettings, { isLoading: saving }] = useUpdateBusinessSettingsMutation();
  const [resetSetting] = useResetBusinessSettingMutation();
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const settings = useMemo<SettingView[]>(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data],
  );
  const changes = useMemo(() => collectChanges(settings, drafts), [settings, drafts]);
  const invalidCount = changes.filter((c) => c.error).length;
  const overriddenCount = settings.filter((s) => s.overridden).length;

  const filtered = useMemo(
    () => settings.filter((s) => matchesSearch(s, search)),
    [settings, search],
  );
  const groups = useMemo(() => groupSettings(filtered), [filtered]);
  const hiddenChanges = search.trim()
    ? changes.filter((c) => !filtered.includes(c.setting)).length
    : 0;

  const handleDraftChange = useCallback(
    (key: string, raw: string) => onDraftChange(scope, key, raw),
    [onDraftChange, scope],
  );
  const handleRevertDraft = useCallback(
    (key: string) => onRevertDraft(scope, key),
    [onRevertDraft, scope],
  );

  const handleReset = useCallback(
    async (setting: SettingView) => {
      setResettingKey(setting.key);
      try {
        await resetSetting({ scope, key: setting.key }).unwrap();
        onRevertDraft(scope, setting.key);
        toast.success(`Đã khôi phục mặc định: ${settingLabel(setting)}`);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Không khôi phục được giá trị mặc định"));
      } finally {
        setResettingKey(null);
      }
    },
    [onRevertDraft, resetSetting, scope],
  );

  const handleSave = async () => {
    if (changes.length === 0 || invalidCount > 0) return;
    const values = Object.fromEntries(
      changes.map((c) => [c.setting.key, toPayloadValue(c.setting, c.raw)]),
    );
    try {
      await updateSettings({ scope, values }).unwrap();
      onClearDrafts(scope);
      setConfirmOpen(false);
      toast.success(`Đã lưu ${changes.length} thay đổi cho “${tab.title}”`);
    } catch (err) {
      setConfirmOpen(false);
      toast.error(getApiErrorMessage(err, "Không lưu được thay đổi"));
    }
  };

  const Icon = tab.icon;

  return (
    <div className="space-y-4">
      {/* Tiêu đề nhóm */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{tab.title}</h2>
            <p className="text-xs text-muted-foreground">{tab.description}</p>
            {settings.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {settings.length} quy tắc · {overriddenCount} đã tuỳ chỉnh
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 self-start">
          <Button variant="outline" size="sm" onClick={() => onShowHistory(null)}>
            <History className="h-4 w-4" />
            Lịch sử thay đổi
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Làm mới
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SettingsSkeleton />
      ) : error && settings.length === 0 ? (
        isUnsupportedScopeError(error) ? (
          <UnsupportedScope title={tab.title} onRetry={() => refetch()} retrying={isFetching} />
        ) : (
          <ErrorState
            variant="card"
            title="Không tải được cấu hình"
            message={getApiErrorMessage(error, "Đã có lỗi khi tải quy tắc nghiệp vụ. Vui lòng thử lại.")}
            onRetry={() => refetch()}
          />
        )
      ) : settings.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <SlidersHorizontal className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Chưa có quy tắc nào</p>
            <p className="text-xs text-muted-foreground">Service chưa khai báo quy tắc nghiệp vụ cho nhóm này.</p>
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Không tìm thấy quy tắc phù hợp</p>
            <p className="text-xs text-muted-foreground">Không có quy tắc nào khớp “{search.trim()}” trong nhóm này.</p>
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.name} className="overflow-hidden border-border/60">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5 sm:px-6">
              <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
              <span className="text-xs text-muted-foreground">{group.items.length} quy tắc</span>
            </div>
            <div className="divide-y divide-border/60">
              {group.items.map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  draft={drafts?.[setting.key]}
                  resetting={resettingKey === setting.key}
                  disabled={saving}
                  onDraftChange={handleDraftChange}
                  onRevertDraft={handleRevertDraft}
                  onReset={handleReset}
                  onShowHistory={onShowHistory}
                />
              ))}
            </div>
          </Card>
        ))
      )}

      {/* Thanh lưu dính đáy màn hình */}
      {changes.length > 0 && (
        <div className="sticky bottom-4 z-30 pt-2">
          <div
            role="status"
            className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:flex-row sm:items-center sm:justify-between sm:px-4"
          >
            <div className="text-sm">
              <span className="font-semibold text-foreground">{changes.length} thay đổi chưa lưu</span>
              {invalidCount > 0 && (
                <span className="text-destructive"> · {invalidCount} giá trị không hợp lệ</span>
              )}
              {hiddenChanges > 0 && (
                <span className="block text-xs text-muted-foreground">
                  {hiddenChanges} thay đổi đang bị ẩn bởi ô tìm kiếm
                </span>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onClearDrafts(scope)} disabled={saving}>
                Huỷ
              </Button>
              <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={saving || invalidCount > 0}>
                <Save className="h-4 w-4" />
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}

      <SaveChangesDialog
        open={confirmOpen && changes.length > 0}
        scopeTitle={tab.title}
        changes={changes}
        saving={saving}
        onOpenChange={setConfirmOpen}
        onConfirm={handleSave}
      />
    </div>
  );
}

function UnsupportedScope({
  title,
  retrying,
  onRetry,
}: {
  title: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="rounded-full bg-muted p-3">
          <PlugZap className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Service chưa hỗ trợ cấu hình</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Service phụ trách nhóm “{title}” chưa triển khai API cấu hình quy tắc nghiệp vụ, nên
          tạm thời chưa chỉnh được từ trang quản trị. Các nhóm khác vẫn dùng bình thường.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={retrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Kiểm tra lại
        </Button>
      </CardContent>
    </Card>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải cấu hình">
      {[0, 1].map((card) => (
        <Card key={card} className="overflow-hidden border-border/60">
          <div className="border-b border-border/60 bg-muted/40 px-4 py-3 sm:px-6">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="divide-y divide-border/60">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="grid gap-x-8 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full max-w-md" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
