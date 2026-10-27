import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CloudSun, OctagonPause, Plane } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TooltipProvider } from "~/components/ui/tooltip";
import {
  useGetBusinessSettingsQuery,
  useUpdateBusinessSettingsMutation,
  type SettingScope,
} from "~/stores/apis/admin/businessSettings";
import {
  useGetFlightBlockSummaryQuery,
  useGetFlightStationsQuery,
} from "~/stores/apis/admin/droneFlightControl";
import i18n from "~/utils/i18n";
import { AuditHistorySheet } from "../settings/AuditHistorySheet";
import type { ScopeTab } from "../settings/constants";
import { ScopeSettingsPanel } from "../settings/ScopeSettingsPanel";
import { getApiErrorMessage, type DraftMap } from "../settings/setting-utils";
import { FlightBlocksTable } from "./FlightBlocksTable";
import { STATIONS_REFRESH_MS, StationsSection } from "./StationsSection";
import { SuspensionLogTable } from "./SuspensionLogTable";
import { BLOCK_CAUSES, causeLabel, causeTone } from "./labels";

const FLIGHTS_SUSPENDED_KEY = "app.order.drone-flights-suspended";
// Nhóm quy tắc do order-service khai báo (OrderSettingsCatalog) + vài quy tắc bay lẻ trong nhóm "Giao hàng drone".
const RULE_GROUPS = ["Thời tiết & điều kiện bay"];
const RULE_KEYS = [
  "app.order.drone-flight-start-hour",
  "app.order.drone-flight-end-hour",
  "app.order.drone-min-preflight-battery-percent",
  "app.order.drone-return-min-battery-percent",
];

const RULES_TAB: ScopeTab = {
  scope: "order",
  icon: CloudSun,
  get title() {
    return i18n.t("admin.flightControl.rules.title");
  },
  get description() {
    return i18n.t("admin.flightControl.rules.description");
  },
};

/**
 * Thời tiết & điều khiển bay: tắt bay toàn hệ thống, dừng / mở từng trạm, xem trạm nào bay được,
 * lịch sử chặn bay và ngưỡng thời tiết. Ngưỡng và công tắc chung là quy tắc nghiệp vụ scope `order`.
 */
export default function FlightControlPage() {
  const { t } = useTranslation();
  const stations = useGetFlightStationsQuery(undefined, { pollingInterval: STATIONS_REFRESH_MS });
  const stationList = stations.data?.data;
  const stationName = useCallback(
    (lockerId: number | null) => {
      if (lockerId == null) return "—";
      const station = stationList?.find((s) => s.lockerId === lockerId);
      return station?.name ?? station?.code ?? `#${lockerId}`;
    },
    [stationList],
  );

  // Bản nháp ngưỡng thời tiết (cùng cơ chế trang Cấu hình nghiệp vụ).
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const setDraft = useCallback((_scope: SettingScope, key: string, raw: string) => {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
  }, []);
  const revertDraft = useCallback((_scope: SettingScope, key: string) => {
    setDrafts((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  const clearDrafts = useCallback(() => setDrafts({}), []);
  const openHistory = useCallback((key: string | null) => {
    setHistoryKey(key);
    setHistoryOpen(true);
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5 pb-6">
        <PageHeader
          title={t("admin.flightControl.title")}
          description={t("admin.flightControl.description")}
          className="mb-0"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <GlobalSuspensionCard />
          <BlockSummaryCard />
        </div>

        <StationsSection stations={stations} />

        <Tabs defaultValue="blocks" className="space-y-4">
          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <TabsList className="h-auto w-max gap-1 rounded-xl border border-border/50 bg-muted/60 p-1">
              <TabsTrigger value="blocks" className="rounded-lg px-3 py-2 text-xs sm:text-sm">
                {t("admin.flightControl.tabs.blocks")}
              </TabsTrigger>
              <TabsTrigger value="logs" className="rounded-lg px-3 py-2 text-xs sm:text-sm">
                {t("admin.flightControl.tabs.logs")}
              </TabsTrigger>
              <TabsTrigger value="rules" className="rounded-lg px-3 py-2 text-xs sm:text-sm">
                {t("admin.flightControl.tabs.rules")}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="blocks" className="mt-0">
            <FlightBlocksTable stationName={stationName} />
          </TabsContent>
          <TabsContent value="logs" className="mt-0">
            <SuspensionLogTable stationName={stationName} />
          </TabsContent>
          <TabsContent value="rules" className="mt-0">
            <ScopeSettingsPanel
              tab={RULES_TAB}
              drafts={drafts}
              search=""
              groups={RULE_GROUPS}
              keys={RULE_KEYS}
              onDraftChange={setDraft}
              onRevertDraft={revertDraft}
              onClearDrafts={clearDrafts}
              onShowHistory={openHistory}
            />
          </TabsContent>
        </Tabs>

        <AuditHistorySheet
          open={historyOpen}
          scope="order"
          scopeTitle={RULES_TAB.title}
          filterKey={historyKey}
          onFilterKeyChange={setHistoryKey}
          onOpenChange={setHistoryOpen}
        />
      </div>
    </TooltipProvider>
  );
}

/** Công tắc tắt bay toàn hệ thống (quy tắc `app.order.drone-flights-suspended`). */
function GlobalSuspensionCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetBusinessSettingsQuery("order");
  const [updateSettings, { isLoading: saving }] = useUpdateBusinessSettingsMutation();
  const [pending, setPending] = useState<boolean | null>(null);
  const setting = useMemo(
    () => (Array.isArray(data?.data) ? data.data.find((s) => s.key === FLIGHTS_SUSPENDED_KEY) : undefined),
    [data],
  );
  const suspended = setting?.value === "true";

  const apply = async () => {
    if (pending == null) return;
    try {
      await updateSettings({ scope: "order", values: { [FLIGHTS_SUSPENDED_KEY]: pending } }).unwrap();
      toast.success(pending ? t("admin.flightControl.global.suspendedToast") : t("admin.flightControl.global.resumedToast"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.flightControl.global.failed")));
    } finally {
      setPending(null);
    }
  };

  return (
    <Card className={suspended ? "border-amber-500/50 bg-amber-500/5" : undefined}>
      <CardContent className="flex h-full items-start gap-4 p-5">
        <div className={`rounded-lg p-2 ${suspended ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/10 text-emerald-700"}`}>
          {suspended ? <OctagonPause className="h-5 w-5" /> : <Plane className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold">{t("admin.flightControl.global.title")}</p>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? t("admin.flightControl.global.loading")
              : suspended
                ? t("admin.flightControl.global.on")
                : t("admin.flightControl.global.off")}
          </p>
        </div>
        <Switch
          checked={suspended}
          disabled={isLoading || saving || !setting}
          onCheckedChange={(checked) => setPending(checked)}
          aria-label={t("admin.flightControl.global.title")}
        />
      </CardContent>
      <AlertDialog open={pending != null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending ? t("admin.flightControl.global.confirmSuspendTitle") : t("admin.flightControl.global.confirmResumeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? t("admin.flightControl.global.confirmSuspend") : t("admin.flightControl.global.confirmResume")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t("common.cancel")}</AlertDialogCancel>
            <Button
              className={pending ? "bg-amber-600 text-white hover:bg-amber-700" : undefined}
              onClick={apply}
              disabled={saving}
            >
              {pending ? t("admin.flightControl.global.suspendAction") : t("admin.flightControl.global.resumeAction")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Số lần bị chặn bay theo nguyên nhân trong 24 giờ qua. */
function BlockSummaryCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetFlightBlockSummaryQuery(24, { pollingInterval: STATIONS_REFRESH_MS });
  const counts = data?.data ?? {};
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="font-semibold">{t("admin.flightControl.summary.title")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BLOCK_CAUSES.map((cause) => (
            <div key={cause} className={`rounded-lg border p-3 ${causeTone(cause)}`}>
              <p className="text-2xl font-bold tabular-nums">{isLoading ? "…" : (counts[cause] ?? 0)}</p>
              <p className="text-xs">{causeLabel(cause)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
