import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlaskConical, Power, Rocket } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  useGetBusinessSettingsQuery,
  useUpdateBusinessSettingsMutation,
  type SettingScope,
  type SettingView,
} from "~/stores/apis/admin/businessSettings";
import { getApiErrorMessage } from "./setting-utils";

/**
 * Cụm "Giả lập & demo" (F3-G14): gom mọi cờ giả lập / dữ liệu demo đang nằm rải ở nhiều service để
 * tắt hàng loạt khi vận hành chính thức và bật lại khi cần demo. Mỗi cờ vẫn là quy tắc nghiệp vụ của
 * service sở hữu (ADR-0005) — cụm này chỉ đọc/ghi qua cùng API `/api/admin/settings/{scope}`.
 *
 * "Bật chế độ demo" chỉ bật các cờ `demo: true`. Hai công cụ thử tủ (mở thử bằng QR, thử nắp trượt)
 * điều khiển phần cứng thật nên chỉ bật từng cái bằng công tắc riêng.
 */
interface SimulationFlag {
  scope: SettingScope;
  key: string;
  /** Khoá i18n `admin.settings.simulation.flags.<id>.title|desc`. */
  id: string;
  demo: boolean;
}

const SIMULATION_FLAGS: SimulationFlag[] = [
  { scope: "payment", key: "app.payment.simulation-enabled", id: "payment", demo: true },
  { scope: "order", key: "app.drone.demo.enabled", id: "droneDemo", demo: true },
  { scope: "locker", key: "app.locker.demo.visible", id: "demoLockers", demo: true },
  { scope: "store", key: "app.store.demo.visible", id: "demoStores", demo: true },
  { scope: "iot", key: "app.iot.ble-test.enabled", id: "bleTest", demo: true },
  { scope: "iot", key: "app.iot.test-open.enabled", id: "testOpen", demo: false },
  { scope: "order", key: "app.drone.lid-test.enabled", id: "lidTest", demo: false },
];

const SCOPES = Array.from(new Set(SIMULATION_FLAGS.map((f) => f.scope)));

type Mode = "off" | "demo";

function isOn(setting: SettingView | undefined): boolean | null {
  if (!setting) return null;
  return (setting.value ?? setting.defaultValue ?? "false").toLowerCase() === "true";
}

function useScopeSettings(scope: SettingScope) {
  return useGetBusinessSettingsQuery(scope);
}

export function SimulationClusterCard() {
  const { t } = useTranslation();
  // Số scope cố định ⇒ gọi hook theo thứ tự ổn định.
  const payment = useScopeSettings("payment");
  const order = useScopeSettings("order");
  const locker = useScopeSettings("locker");
  const store = useScopeSettings("store");
  const iot = useScopeSettings("iot");
  const byScope: Record<string, ReturnType<typeof useScopeSettings>> = { payment, order, locker, store, iot };
  const [updateSettings, { isLoading: saving }] = useUpdateBusinessSettingsMutation();
  const [confirm, setConfirm] = useState<Mode | null>(null);

  const states = useMemo(
    () =>
      SIMULATION_FLAGS.map((flag) => {
        const list = byScope[flag.scope]?.data?.data;
        const setting = Array.isArray(list) ? list.find((s) => s.key === flag.key) : undefined;
        return { flag, on: isOn(setting), loading: byScope[flag.scope]?.isLoading ?? false };
      }),
    [payment.data, order.data, locker.data, store.data, iot.data, payment.isLoading, order.isLoading, locker.isLoading, store.isLoading, iot.isLoading],
  );
  const known = states.filter((s) => s.on !== null);
  const onCount = known.filter((s) => s.on).length;

  /** Ghi theo từng scope; trả số cờ đã đổi. */
  const apply = async (targets: { flag: SimulationFlag; value: boolean }[]) => {
    let changed = 0;
    for (const scope of SCOPES) {
      const values: Record<string, boolean> = {};
      for (const { flag, value } of targets) if (flag.scope === scope) values[flag.key] = value;
      if (Object.keys(values).length === 0) continue;
      await updateSettings({ scope, values }).unwrap();
      changed += Object.keys(values).length;
    }
    return changed;
  };

  const plan = (mode: Mode) =>
    states
      .filter((s) => s.on !== null)
      .filter((s) => (mode === "off" ? s.on : s.flag.demo && !s.on))
      .map((s) => ({ flag: s.flag, value: mode === "demo" }));

  const runMode = async (mode: Mode) => {
    try {
      const changed = await apply(plan(mode));
      toast.success(
        mode === "off"
          ? t("admin.settings.simulation.toast.allOff", { count: changed })
          : t("admin.settings.simulation.toast.demoOn", { count: changed }),
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.settings.simulation.toast.failed")));
    } finally {
      setConfirm(null);
    }
  };

  const toggleOne = async (flag: SimulationFlag, value: boolean) => {
    try {
      await apply([{ flag, value }]);
      toast.success(
        t(value ? "admin.settings.simulation.toast.oneOn" : "admin.settings.simulation.toast.oneOff", {
          name: t(`admin.settings.simulation.flags.${flag.id}.title`),
        }),
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.settings.simulation.toast.failed")));
    }
  };

  const pending = confirm ? plan(confirm) : [];
  const status =
    known.length === 0 ? null : onCount === 0 ? "off" : onCount === known.length ? "all" : "some";

  return (
    <Card data-tour="settings-simulation" className="border-amber-300/70 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold">{t("admin.settings.simulation.title")}</h2>
                {status && (
                  <Badge
                    data-tour="settings-simulation-status"
                    variant="outline"
                    className={
                      status === "off"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                    }
                  >
                    {status === "off"
                      ? t("admin.settings.simulation.status.off")
                      : t("admin.settings.simulation.status.on", { on: onCount, total: known.length })}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{t("admin.settings.simulation.description")}</p>
            </div>
          </div>
          <div data-tour="settings-simulation-actions" className="flex shrink-0 flex-wrap gap-2">
            <Button
              size="sm"
              variant="default"
              data-tour="settings-simulation-off"
              disabled={saving || onCount === 0}
              onClick={() => setConfirm("off")}
              className="gap-1.5"
            >
              <Power className="h-4 w-4" />
              {t("admin.settings.simulation.allOff")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={saving || plan("demo").length === 0}
              onClick={() => setConfirm("demo")}
              className="gap-1.5"
            >
              <Rocket className="h-4 w-4" />
              {t("admin.settings.simulation.demoOn")}
            </Button>
          </div>
        </div>

        <div data-tour="settings-simulation-list" className="grid gap-2 md:grid-cols-2">
          {states.map(({ flag, on, loading }) => (
            <div
              key={flag.key}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{t(`admin.settings.simulation.flags.${flag.id}.title`)}</p>
                <p className="text-xs text-muted-foreground">{t(`admin.settings.simulation.flags.${flag.id}.desc`)}</p>
                <p className="font-mono text-[10px] text-muted-foreground/80">{flag.key}</p>
              </div>
              {on === null ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {loading ? t("admin.settings.simulation.loading") : t("admin.settings.simulation.unsupported")}
                </span>
              ) : (
                <Switch
                  checked={on}
                  disabled={saving}
                  aria-label={t(`admin.settings.simulation.flags.${flag.id}.title`)}
                  onCheckedChange={(value) => void toggleOne(flag, value)}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent data-tour="settings-simulation-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "off"
                ? t("admin.settings.simulation.confirmOff.title")
                : t("admin.settings.simulation.confirmDemo.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "off"
                ? t("admin.settings.simulation.confirmOff.description")
                : t("admin.settings.simulation.confirmDemo.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {pending.map(({ flag }) => (
              <li key={flag.key}>{t(`admin.settings.simulation.flags.${flag.id}.title`)}</li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || pending.length === 0}
              onClick={(event) => {
                event.preventDefault();
                if (confirm) void runMode(confirm);
              }}
            >
              {confirm === "off"
                ? t("admin.settings.simulation.confirmOff.action", { count: pending.length })
                : t("admin.settings.simulation.confirmDemo.action", { count: pending.length })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
