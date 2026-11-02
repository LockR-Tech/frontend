import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Cpu, Download, Plus, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { formatDateTime } from "~/lib/datetime";
import {
  useApplyCabinetHardwareMutation,
  useGetCabinetHardwareQuery,
  useSaveCabinetHardwareMutation,
  type HardwareConfig,
  type LidAxisConfig,
  type WiringRow,
} from "~/stores/apis/admin/cabinetControl";

// Số GPIO (BCM) → số chân vật lý trên header 40 chân của Pi (chân 1 ở đầu xa cổng USB).
const GPIO_TO_PIN: Record<number, number> = {
  2: 3, 3: 5, 4: 7, 5: 29, 6: 31, 7: 26, 8: 24, 9: 21, 10: 19, 11: 23, 12: 32, 13: 33, 14: 8,
  15: 10, 16: 36, 17: 11, 18: 12, 19: 35, 20: 38, 21: 40, 22: 15, 23: 16, 24: 18, 25: 22, 26: 37, 27: 13,
};
const GPIO_OPTIONS = Object.keys(GPIO_TO_PIN).map(Number).sort((a, b) => a - b);
// labelKey là khoá i18n, dịch lúc render
const LID_PINS: { key: "pulPin" | "dirPin" | "homePin" | "endPin"; labelKey: string }[] = [
  { key: "pulPin", labelKey: "admin.cabinetControl.hardware.pins.pul" },
  { key: "dirPin", labelKey: "admin.cabinetControl.hardware.pins.dir" },
  { key: "homePin", labelKey: "admin.cabinetControl.hardware.pins.home" },
  { key: "endPin", labelKey: "admin.cabinetControl.hardware.pins.end" },
];
const WIRING_COLUMNS: { key: keyof WiringRow; labelKey: string; width: string }[] = [
  { key: "group", labelKey: "admin.cabinetControl.hardware.wiring.group", width: "w-32" },
  { key: "from", labelKey: "admin.cabinetControl.hardware.wiring.from", width: "w-48" },
  { key: "wire", labelKey: "admin.cabinetControl.hardware.wiring.wire", width: "w-28" },
  { key: "to", labelKey: "admin.cabinetControl.hardware.wiring.to", width: "w-48" },
  { key: "via", labelKey: "admin.cabinetControl.hardware.wiring.via", width: "w-44" },
  { key: "note", labelKey: "common.note", width: "w-56" },
];

const pinLabel = (t: TFunction, gpio: number) =>
  GPIO_TO_PIN[gpio] ? t("admin.cabinetControl.hardware.pinLabel", { gpio, pin: GPIO_TO_PIN[gpio] }) : `GPIO${gpio}`;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** {GPIO: các việc đang dùng chân đó} — trục tắt không tính, như luật kiểm tra trên Pi. */
function pinUsage(cfg: HardwareConfig, t: TFunction): Map<number, string[]> {
  const usage = new Map<number, string[]>();
  const add = (pin: number, role: string) => usage.set(pin, [...(usage.get(pin) ?? []), role]);
  cfg.relayPins.forEach((p, i) => add(p, t("admin.cabinetControl.hardware.roles.relay", { n: i + 1 })));
  cfg.doorPins.forEach((p, i) => add(p, t("admin.cabinetControl.hardware.roles.door", { n: i + 1 })));
  cfg.lids.filter((l) => l.enabled).forEach((l) =>
    LID_PINS.forEach(({ key }) => add(l[key], t("admin.cabinetControl.hardware.roles.axis", { axis: l.axis, pin: key }))));
  return usage;
}

/** Lỗi kiểm tra ngay trên trang (server và Pi kiểm lại đầy đủ khi lưu/áp dụng). */
function problems(cfg: HardwareConfig, t: TFunction): string[] {
  const out: string[] = [];
  pinUsage(cfg, t).forEach((roles, pin) => {
    if (roles.length > 1) {
      out.push(t("admin.cabinetControl.hardware.problems.pinTwice", {
        pin,
        roles: roles.join(` ${t("admin.cabinetControl.hardware.problems.and")} `),
      }));
    }
  });
  if (cfg.relayPins.length !== cfg.doorPins.length) out.push(t("admin.cabinetControl.hardware.problems.countMismatch"));
  if (!(cfg.unlockMs >= 100 && cfg.unlockMs <= 10000)) out.push(t("admin.cabinetControl.hardware.problems.unlockRange"));
  const owner = new Map<number, number>();
  cfg.lids.forEach((l) =>
    l.boxes.forEach((b) => {
      if (owner.has(b)) out.push(t("admin.cabinetControl.hardware.problems.boxTwoAxes", { box: b, first: owner.get(b), second: l.axis }));
      owner.set(b, l.axis);
    }),
  );
  return out;
}

function errorMessage(e: unknown, fallback: string) {
  return (e as { data?: { message?: string } })?.data?.message || fallback;
}

export function HardwareConfigTab({
  lockerId, running, canEdit,
}: {
  lockerId: number;
  running?: HardwareConfig;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const { data, refetch, isFetching } = useGetCabinetHardwareQuery(lockerId);
  const view = data?.data;
  const [saveHardware, { isLoading: saving }] = useSaveCabinetHardwareMutation();
  const [applyHardware, { isLoading: applying }] = useApplyCabinetHardwareMutation();

  const [cfg, setCfg] = useState<HardwareConfig | null>(null);
  const [wiring, setWiring] = useState<WiringRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);

  useEffect(() => {
    if (!view) return;
    setCfg(clone(view.config));
    setWiring(clone(view.wiring ?? []));
    setDirty(false);
    setConfirmApply(false);
  }, [view]);

  const usage = useMemo(() => (cfg ? pinUsage(cfg, t) : new Map<number, string[]>()), [cfg, t]);
  const issues = useMemo(() => (cfg ? problems(cfg, t) : []), [cfg, t]);
  const runningDiffs = useMemo(() => {
    if (!running || !view) return 0;
    const a = view.config;
    let n = 0;
    a.relayPins.forEach((p, i) => n += running.relayPins[i] !== p ? 1 : 0);
    a.doorPins.forEach((p, i) => n += running.doorPins[i] !== p ? 1 : 0);
    n += a.relayPins.length !== running.relayPins.length ? 1 : 0;
    (["relayActiveHigh", "unlockMs", "doorClosedLow", "requireDoorSensor", "lidBypassPhysicalMotion"] as const)
      .forEach((k) => n += a[k] !== running[k] ? 1 : 0);
    a.lids.forEach((l) => {
      const r = running.lids.find((x) => x.axis === l.axis);
      if (!r) return;
      (["enabled", "pulPin", "dirPin", "homePin", "endPin", "openDirHigh", "limitActiveLow"] as const)
        .forEach((k) => n += l[k] !== r[k] ? 1 : 0);
      n += JSON.stringify([...l.boxes].sort()) !== JSON.stringify([...r.boxes].sort()) ? 1 : 0;
    });
    return n;
  }, [running, view]);

  if (!cfg || !view) {
    return (
      <p className="text-sm text-muted-foreground">
        {isFetching ? t("admin.cabinetControl.hardware.loading") : t("admin.cabinetControl.hardware.loadFailed")}
      </p>
    );
  }

  const edit = (next: HardwareConfig) => { setCfg(next); setDirty(true); setConfirmApply(false); };
  const editWiring = (next: WiringRow[]) => { setWiring(next); setDirty(true); setConfirmApply(false); };
  const setPin = (kind: "relayPins" | "doorPins", i: number, pin: number) => {
    const next = clone(cfg);
    next[kind][i] = pin;
    edit(next);
  };
  const setLid = (axis: number, patch: Partial<LidAxisConfig>) =>
    edit({ ...cfg, lids: cfg.lids.map((l) => (l.axis === axis ? { ...l, ...patch } : l)) });
  const freePin = (taken: Set<number>) => GPIO_OPTIONS.find((g) => !taken.has(g)) ?? 2;
  const addBox = () => {
    const taken = new Set(usage.keys());
    const relay = freePin(taken);
    taken.add(relay);
    edit({ ...cfg, relayPins: [...cfg.relayPins, relay], doorPins: [...cfg.doorPins, freePin(taken)] });
  };
  const removeBox = () => {
    const n = cfg.relayPins.length;
    if (n <= 1) return;
    edit({
      ...cfg,
      relayPins: cfg.relayPins.slice(0, -1),
      doorPins: cfg.doorPins.slice(0, -1),
      lids: cfg.lids.map((l) => ({ ...l, boxes: l.boxes.filter((b) => b < n) })),
    });
  };

  const save = async () => {
    try {
      await saveHardware({ lockerId, config: cfg, wiring }).unwrap();
      toast.success(t("admin.cabinetControl.hardware.toast.saved"));
      refetch();
    } catch (e) {
      toast.error(errorMessage(e, t("admin.cabinetControl.hardware.toast.saveFailed")));
    }
  };
  const apply = async () => {
    setConfirmApply(false);
    try {
      const res = (await applyHardware(lockerId).unwrap()).data;
      if (res?.accepted) {
        toast.success(t("admin.cabinetControl.hardware.toast.applied"));
        res.warnings?.forEach((w) => toast.warning(w, { duration: 15000 }));
      } else {
        toast.error(res?.errors?.length ? res.errors.join("; ") : res?.message || t("admin.cabinetControl.hardware.toast.rejected"));
      }
      refetch();
    } catch (e) {
      toast.error(errorMessage(e, t("admin.cabinetControl.hardware.toast.applyFailed")));
    }
  };

  const disabled = !canEdit;
  const selectClass = (bad: boolean) =>
    `w-full rounded-md border bg-background px-2 py-1.5 text-sm ${bad ? "border-rose-500 text-rose-700" : "border-border"}`;
  // Giá trị đang chạy trên tủ, chỉ hiện khi khác bản đang sửa. Lựa chọn hai giá trị thì ghi đúng tên lựa chọn.
  const runningHint = (now: number | boolean | undefined, want: number | boolean, names?: [string, string]) =>
    running && now !== undefined && now !== want ? (
      <span className="block text-[11px] text-amber-600">
        {t("admin.cabinetControl.hardware.runningOnLocker", {
          value: typeof now === "number"
            ? pinLabel(t, now)
            : names ? names[now ? 0 : 1] : now ? t("admin.cabinetControl.hardware.on") : t("admin.cabinetControl.hardware.off"),
        })}
      </span>
    ) : null;
  const boxCount = cfg.relayPins.length;

  return (
    <div className="space-y-6">
      {/* Trạng thái */}
      <section className="space-y-2 rounded-xl border border-border p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Cpu className="h-4 w-4" />
          <span className="font-semibold">{t("admin.cabinetControl.hardware.title")}</span>
          {view.defaultTemplate ? (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              {t("admin.cabinetControl.hardware.defaultTemplate")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t("admin.cabinetControl.hardware.savedAt", { time: formatDateTime(view.updatedAt) })}</span>
          )}
          {view.appliedAt && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${view.applyStatus === "ACCEPTED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {t("admin.cabinetControl.hardware.appliedAt", { time: formatDateTime(view.appliedAt), status: view.applyStatus })}
            </span>
          )}
          {dirty && <span className="rounded bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">{t("admin.cabinetControl.hardware.unsaved")}</span>}
        </div>
        {view.applyMessage && <p className="text-xs text-muted-foreground">{view.applyMessage}</p>}
        {running ? (
          runningDiffs > 0 ? (
            <p className="flex items-center gap-1.5 text-amber-700">
              <AlertTriangle className="h-4 w-4" /> {t("admin.cabinetControl.hardware.diffs", { count: runningDiffs })}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> {t("admin.cabinetControl.hardware.synced")}
            </p>
          )
        ) : (
          <p className="text-muted-foreground">{t("admin.cabinetControl.hardware.noRunning")}</p>
        )}
        {!canEdit && <p className="text-muted-foreground">{t("admin.cabinetControl.hardware.readOnly")}</p>}
        {issues.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-rose-700">
            {issues.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
      </section>

      {/* Ô tủ */}
      <section className="rounded-xl border border-border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t("admin.cabinetControl.hardware.boxesTitle")}</h2>
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={addBox} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent">
                <Plus className="h-3.5 w-3.5" /> {t("admin.cabinetControl.hardware.addBox")}
              </button>
              <button onClick={removeBox} disabled={boxCount <= 1} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" /> {t("admin.cabinetControl.hardware.removeLastBox")}
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">{t("admin.cabinetControl.hardware.columns.box")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.cabinetControl.hardware.columns.relayTerminal")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.cabinetControl.hardware.columns.relayPin")}</th>
                <th className="py-2 font-medium">{t("admin.cabinetControl.hardware.columns.doorPin")}</th>
              </tr>
            </thead>
            <tbody>
              {cfg.relayPins.map((relay, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="py-2 pr-3 font-semibold">{t("admin.cabinetControl.box", { n: i + 1 })}</td>
                  <td className="py-2 pr-3 font-mono text-xs">IN{i + 1} → K{i + 1}</td>
                  <td className="py-2 pr-3">
                    <select disabled={disabled} value={relay} onChange={(e) => setPin("relayPins", i, Number(e.target.value))}
                      className={selectClass((usage.get(relay)?.length ?? 0) > 1)}>
                      {GPIO_OPTIONS.map((g) => <option key={g} value={g}>{pinLabel(t, g)}</option>)}
                    </select>
                    {runningHint(running?.relayPins[i], relay)}
                  </td>
                  <td className="py-2">
                    <select disabled={disabled} value={cfg.doorPins[i]} onChange={(e) => setPin("doorPins", i, Number(e.target.value))}
                      className={selectClass((usage.get(cfg.doorPins[i])?.length ?? 0) > 1)}>
                      {GPIO_OPTIONS.map((g) => <option key={g} value={g}>{pinLabel(t, g)}</option>)}
                    </select>
                    {runningHint(running?.doorPins[i], cfg.doorPins[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tuỳ chọn chung */}
      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-base font-semibold">{t("admin.cabinetControl.hardware.optionsTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">{t("admin.cabinetControl.hardware.relayActiveLevel")}</span>
            <select disabled={disabled} value={cfg.relayActiveHigh ? "1" : "0"} onChange={(e) => edit({ ...cfg, relayActiveHigh: e.target.value === "1" })} className={selectClass(false)}>
              <option value="1">{t("admin.cabinetControl.hardware.levelHighJumper")}</option>
              <option value="0">{t("admin.cabinetControl.hardware.levelLowJumper")}</option>
            </select>
            {runningHint(running?.relayActiveHigh, cfg.relayActiveHigh, [
              t("admin.cabinetControl.hardware.levelHighJumperLower"),
              t("admin.cabinetControl.hardware.levelLowJumperLower"),
            ])}
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">{t("admin.cabinetControl.hardware.unlockMs")}</span>
            <input type="number" min={100} max={10000} step={100} disabled={disabled} value={cfg.unlockMs}
              onChange={(e) => edit({ ...cfg, unlockMs: Number(e.target.value) })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
            {running && running.unlockMs !== cfg.unlockMs && (
              <span className="block text-[11px] text-amber-600">
                {t("admin.cabinetControl.hardware.runningOnLocker", { value: `${running.unlockMs} ms` })}
              </span>
            )}
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">{t("admin.cabinetControl.hardware.doorClosedLevel")}</span>
            <select disabled={disabled} value={cfg.doorClosedLow ? "1" : "0"} onChange={(e) => edit({ ...cfg, doorClosedLow: e.target.value === "1" })} className={selectClass(false)}>
              <option value="1">{t("admin.cabinetControl.hardware.doorLowClosed")}</option>
              <option value="0">{t("admin.cabinetControl.hardware.doorHighClosed")}</option>
            </select>
            {runningHint(running?.doorClosedLow, cfg.doorClosedLow, [
              t("admin.cabinetControl.hardware.doorLowClosedLower"),
              t("admin.cabinetControl.hardware.doorHighClosedLower"),
            ])}
          </label>
          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" disabled={disabled} checked={cfg.requireDoorSensor}
                onChange={(e) => edit({ ...cfg, requireDoorSensor: e.target.checked })} className="mt-1" />
              <span>{t("admin.cabinetControl.hardware.requireDoorSensor")} <span className="text-xs text-muted-foreground">{t("admin.cabinetControl.hardware.requireDoorSensorHint")}</span></span>
            </label>
            {runningHint(running?.requireDoorSensor, cfg.requireDoorSensor)}
            <label className="flex items-start gap-2">
              <input type="checkbox" disabled={disabled} checked={cfg.lidBypassPhysicalMotion}
                onChange={(e) => edit({ ...cfg, lidBypassPhysicalMotion: e.target.checked })} className="mt-1" />
              <span>{t("admin.cabinetControl.hardware.lidBypass")}</span>
            </label>
            {runningHint(running?.lidBypassPhysicalMotion, cfg.lidBypassPhysicalMotion)}
          </div>
        </div>
      </section>

      {/* Nắp trượt */}
      <section className="grid gap-4 md:grid-cols-2">
        {cfg.lids.map((lid) => {
          const live = running?.lids.find((l) => l.axis === lid.axis);
          return (
            <div key={lid.axis} className={`space-y-3 rounded-xl border p-4 ${lid.enabled ? "border-border" : "border-dashed border-border"}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{t("admin.cabinetControl.hardware.lidTitle", { axis: lid.axis })}</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" disabled={disabled} checked={lid.enabled} onChange={(e) => setLid(lid.axis, { enabled: e.target.checked })} />
                  {t("admin.cabinetControl.hardware.wired")}
                </label>
              </div>
              {runningHint(live?.enabled, lid.enabled, [
                t("admin.cabinetControl.hardware.wiredLower"),
                t("admin.cabinetControl.hardware.notWiredLower"),
              ])}
              <div className="grid grid-cols-2 gap-3">
                {LID_PINS.map(({ key, labelKey }) => (
                  <label key={key} className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">{t(labelKey)}</span>
                    <select disabled={disabled} value={lid[key]} onChange={(e) => setLid(lid.axis, { [key]: Number(e.target.value) })}
                      className={selectClass(lid.enabled && (usage.get(lid[key])?.length ?? 0) > 1)}>
                      {GPIO_OPTIONS.map((g) => <option key={g} value={g}>{pinLabel(t, g)}</option>)}
                    </select>
                    {runningHint(live?.[key], lid[key])}
                  </label>
                ))}
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">{t("admin.cabinetControl.hardware.openDirection")}</span>
                  <select disabled={disabled} value={lid.openDirHigh ? "1" : "0"} onChange={(e) => setLid(lid.axis, { openDirHigh: e.target.value === "1" })} className={selectClass(false)}>
                    <option value="1">{t("admin.cabinetControl.hardware.dirHighOpen")}</option>
                    <option value="0">{t("admin.cabinetControl.hardware.dirLowOpen")}</option>
                  </select>
                  {runningHint(live?.openDirHigh, lid.openDirHigh, [
                    t("admin.cabinetControl.hardware.dirHighOpen"),
                    t("admin.cabinetControl.hardware.dirLowOpen"),
                  ])}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">{t("admin.cabinetControl.hardware.limitPressed")}</span>
                  <select disabled={disabled} value={lid.limitActiveLow ? "1" : "0"} onChange={(e) => setLid(lid.axis, { limitActiveLow: e.target.value === "1" })} className={selectClass(false)}>
                    <option value="1">{t("admin.cabinetControl.hardware.limitLow")}</option>
                    <option value="0">{t("admin.cabinetControl.hardware.limitHigh")}</option>
                  </select>
                  {runningHint(live?.limitActiveLow, lid.limitActiveLow, [
                    t("admin.cabinetControl.hardware.limitLowLower"),
                    t("admin.cabinetControl.hardware.limitHighLower"),
                  ])}
                </label>
              </div>
              <div className="text-sm">
                <span className="text-xs text-muted-foreground">{t("admin.cabinetControl.hardware.lidBoxes", { axis: lid.axis })}</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {Array.from({ length: boxCount }, (_, i) => i + 1).map((box) => (
                    <label key={box} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs">
                      <input type="checkbox" disabled={disabled} checked={lid.boxes.includes(box)}
                        onChange={(e) => setLid(lid.axis, { boxes: e.target.checked ? [...lid.boxes, box].sort((a, b) => a - b) : lid.boxes.filter((b) => b !== box) })} />
                      {t("admin.cabinetControl.box", { n: box })}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Sơ đồ đấu dây */}
      <section className="rounded-xl border border-border p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t("admin.cabinetControl.hardware.wiringTitle")}</h2>
          {canEdit && (
            <button onClick={() => editWiring([...wiring, { group: "", from: "", to: "", via: "", wire: "", note: "" }])}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent">
              <Plus className="h-3.5 w-3.5" /> {t("admin.cabinetControl.hardware.addRow")}
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{t("admin.cabinetControl.hardware.wiringHelp")}</p>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
              <tr>
                {WIRING_COLUMNS.map((c) => <th key={c.key} className={`py-2 pr-2 font-medium ${c.width}`}>{t(c.labelKey)}</th>)}
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {wiring.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {WIRING_COLUMNS.map((c) => (
                    <td key={c.key} className="py-1 pr-2">
                      <input disabled={disabled} value={row[c.key]} maxLength={300}
                        onChange={(e) => editWiring(wiring.map((r, j) => (j === i ? { ...r, [c.key]: e.target.value } : r)))}
                        className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-border focus:border-border focus:outline-none disabled:hover:border-transparent" />
                    </td>
                  ))}
                  {canEdit && (
                    <td className="py-1">
                      <button aria-label={t("admin.cabinetControl.hardware.deleteRow")} onClick={() => editWiring(wiring.filter((_, j) => j !== i))}
                        className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Hành động */}
      {canEdit && (
        <section className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-3">
          <button onClick={save} disabled={saving || issues.length > 0 || !dirty && !view.defaultTemplate}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? t("admin.cabinetControl.hardware.saving") : t("button.save")}
          </button>
          {!confirmApply ? (
            <button onClick={() => setConfirmApply(true)} disabled={applying || dirty || view.defaultTemplate || issues.length > 0}
              title={dirty || view.defaultTemplate ? t("admin.cabinetControl.hardware.saveBeforeApply") : undefined}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50">
              <Send className="h-4 w-4" /> {applying ? t("admin.cabinetControl.hardware.sending") : t("admin.cabinetControl.hardware.applyToLocker")}
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
              {t("admin.cabinetControl.hardware.applyConfirm")}
              <button onClick={apply} className="rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700">{t("admin.cabinetControl.hardware.applyNow")}</button>
              <button onClick={() => setConfirmApply(false)} className="rounded border border-amber-300 px-2.5 py-1 text-xs hover:bg-amber-100">{t("common.cancel")}</button>
            </span>
          )}
          {running && (
            <button onClick={() => edit(clone(running))} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
              <Download className="h-4 w-4" /> {t("admin.cabinetControl.hardware.loadRunning")}
            </button>
          )}
          {dirty && (
            <button onClick={() => { setCfg(clone(view.config)); setWiring(clone(view.wiring ?? [])); setDirty(false); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
              <RotateCcw className="h-4 w-4" /> {t("admin.cabinetControl.hardware.discard")}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
