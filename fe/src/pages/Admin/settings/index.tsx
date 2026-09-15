import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TooltipProvider } from "~/components/ui/tooltip";
import {
  useGetBusinessSettingsQuery,
  type SettingScope,
} from "~/stores/apis/admin/businessSettings";
import { DEFAULT_SCOPE, SCOPE_TABS, isSettingScope, scopeTitle } from "./constants";
import { ScopeSettingsPanel } from "./ScopeSettingsPanel";
import { AuditHistorySheet } from "./AuditHistorySheet";
import { collectChanges, type DraftMap, type ScopeDrafts } from "./setting-utils";

/**
 * Cấu hình quy tắc nghiệp vụ (ADR-0005): giá, phí, thời hạn, SLA, giới hạn… của từng
 * service. Mọi quy tắc, nhóm, kiểu dữ liệu và ràng buộc đều lấy từ API theo scope.
 */
export default function BusinessSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeScope: SettingScope = isSettingScope(tabParam) ? tabParam : DEFAULT_SCOPE;

  // Bản nháp giữ ở cấp trang để chuyển tab không mất thay đổi chưa lưu.
  const [drafts, setDrafts] = useState<ScopeDrafts>({});
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  const openHistory = useCallback((key: string | null) => {
    setHistoryKey(key);
    setHistoryOpen(true);
  }, []);

  const handleTabChange = (value: string) => {
    if (!isSettingScope(value)) return;
    setHistoryKey(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", value);
        return next;
      },
      { replace: true },
    );
  };

  const setDraft = useCallback((scope: SettingScope, key: string, raw: string) => {
    setDrafts((prev) => ({ ...prev, [scope]: { ...prev[scope], [key]: raw } }));
  }, []);

  const revertDraft = useCallback((scope: SettingScope, key: string) => {
    setDrafts((prev) => {
      const current = prev[scope];
      if (!current || !(key in current)) return prev;
      const next = { ...current };
      delete next[key];
      return { ...prev, [scope]: next };
    });
  }, []);

  const clearDrafts = useCallback((scope: SettingScope) => {
    setDrafts((prev) => ({ ...prev, [scope]: {} }));
  }, []);

  // Cảnh báo khi đóng/tải lại trang lúc còn bản nháp.
  const hasDrafts = Object.values(drafts).some((d) => d && Object.keys(d).length > 0);
  useEffect(() => {
    if (!hasDrafts) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasDrafts]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5 pb-6">
        <PageHeader
          title="Cấu hình quy tắc nghiệp vụ"
          description="Giá, phí, thời hạn, SLA và giới hạn của từng service. Mọi thay đổi được kiểm tra và ghi lịch sử."
          className="mb-0"
        />

        <Tabs value={activeScope} onValueChange={handleTabChange} className="space-y-5">
          <div className="space-y-3">
            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <TabsList className="h-auto w-max gap-1 rounded-xl border border-border/50 bg-muted/60 p-1">
                {SCOPE_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.scope}
                      value={tab.scope}
                      className="gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm"
                    >
                      <Icon className="h-4 w-4" />
                      {tab.title}
                      <TabDirtyBadge scope={tab.scope} drafts={drafts[tab.scope]} />
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên, key, mô tả…"
                  aria-label="Tìm quy tắc trong nhóm đang xem"
                  className="h-9 pl-9 pr-8"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Xoá tìm kiếm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {SCOPE_TABS.map((tab) => (
            <TabsContent key={tab.scope} value={tab.scope} className="mt-0">
              <ScopeSettingsPanel
                tab={tab}
                drafts={drafts[tab.scope]}
                search={search}
                onDraftChange={setDraft}
                onRevertDraft={revertDraft}
                onClearDrafts={clearDrafts}
                onShowHistory={openHistory}
              />
            </TabsContent>
          ))}
        </Tabs>

        <AuditHistorySheet
          open={historyOpen}
          scope={activeScope}
          scopeTitle={scopeTitle(activeScope)}
          filterKey={historyKey}
          onFilterKeyChange={setHistoryKey}
          onOpenChange={setHistoryOpen}
        />
      </div>
    </TooltipProvider>
  );
}

/** Số thay đổi chưa lưu của một tab (chỉ đọc cache khi tab đó có bản nháp). */
function TabDirtyBadge({ scope, drafts }: { scope: SettingScope; drafts: DraftMap | undefined }) {
  const hasDrafts = !!drafts && Object.keys(drafts).length > 0;
  const { data } = useGetBusinessSettingsQuery(scope, { skip: !hasDrafts });
  const count = useMemo(() => {
    if (!hasDrafts) return 0;
    const settings = Array.isArray(data?.data) ? data.data : null;
    return settings ? collectChanges(settings, drafts).length : Object.keys(drafts).length;
  }, [data, drafts, hasDrafts]);

  if (count === 0) return null;
  return (
    <span
      className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white"
      aria-label={`${count} thay đổi chưa lưu`}
    >
      {count}
    </span>
  );
}
