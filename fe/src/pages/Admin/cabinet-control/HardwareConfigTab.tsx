import { useEffect, useMemo, useState } from "react";
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
const LID_PINS: { key: "pulPin" | "dirPin" | "homePin" | "endPin"; label: string }[] = [
  { key: "pulPin", label: "PUL− (xung)" },
  { key: "dirPin", label: "DIR− (chiều)" },
  { key: "homePin", label: "Công tắc gốc (đóng hết)" },
  { key: "endPin", label: "Công tắc cuối (mở hết)" },
];
const WIRING_COLUMNS: { key: keyof WiringRow; label: string; width: string }[] = [
  { key: "group", label: "Nhóm", width: "w-32" },
  { key: "from", label: "Chân Pi / từ", width: "w-48" },
  { key: "wire", label: "Tên dây", width: "w-28" },
  { key: "to", label: "Tới", width: "w-48" },
  { key: "via", label: "Qua", width: "w-44" },
  { key: "note", label: "Ghi chú", width: "w-56" },
];

const pinLabel = (gpio: number) => (GPIO_TO_PIN[gpio] ? `GPIO${gpio} · chân ${GPIO_TO_PIN[gpio]}` : `GPIO${gpio}`);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** {GPIO: các việc đang dùng chân đó} — trục tắt không tính, như luật kiểm tra trên Pi. */
function pinUsage(cfg: HardwareConfig): Map<number, string[]> {
  const usage = new Map<number, string[]>();
  const add = (pin: number, role: string) => usage.set(pin, [...(usage.get(pin) ?? []), role]);
  cfg.relayPins.forEach((p, i) => add(p, `relay ô ${i + 1}`));
  cfg.doorPins.forEach((p, i) => add(p, `cảm biến ô ${i + 1}`));
  cfg.lids.filter((l) => l.enabled).forEach((l) => LID_PINS.forEach(({ key }) => add(l[key], `trục ${l.axis} ${key}`)));
  return usage;
}

/** Lỗi kiểm tra ngay trên trang (server và Pi kiểm lại đầy đủ khi lưu/áp dụng). */
function problems(cfg: HardwareConfig): string[] {
  const out: string[] = [];
  pinUsage(cfg).forEach((roles, pin) => {
    if (roles.length > 1) out.push(`GPIO${pin} bị dùng hai lần: ${roles.join(" và ")}`);
  });
  if (cfg.relayPins.length !== cfg.doorPins.length) out.push("Số chân relay phải bằng số chân cảm biến cửa");
  if (!(cfg.unlockMs >= 100 && cfg.unlockMs <= 10000)) out.push("Thời gian kích relay phải từ 100 tới 10000 ms");
  const owner = new Map<number, number>();
  cfg.lids.forEach((l) =>
    l.boxes.forEach((b) => {
      if (owner.has(b)) out.push(`Ô ${b} không thể nằm dưới cả trục ${owner.get(b)} và trục ${l.axis}`);
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

  const usage = useMemo(() => (cfg ? pinUsage(cfg) : new Map<number, string[]>()), [cfg]);
  const issues = useMemo(() => (cfg ? problems(cfg) : []), [cfg]);
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
    return <p className="text-sm text-muted-foreground">{isFetching ? "Đang tải cấu hình…" : "Chưa tải được cấu hình."}</p>;
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
      toast.success("Đã lưu cấu hình phần cứng. Bấm Áp dụng để gửi xuống tủ.");
      refetch();
    } catch (e) {
      toast.error(errorMessage(e, "Không lưu được cấu hình"));
    }
  };
  const apply = async () => {
    setConfirmApply(false);
    try {
      const res = (await applyHardware(lockerId).unwrap()).data;
      if (res?.accepted) {
        toast.success("Tủ đã nhận cấu hình mới và đang khởi động lại bộ điều khiển (khoảng 10 giây).");
        res.warnings?.forEach((w) => toast.warning(w, { duration: 15000 }));
      } else {
        toast.error(res?.errors?.length ? res.errors.join("; ") : res?.message || "Tủ không nhận cấu hình");
      }
      refetch();
    } catch (e) {
      toast.error(errorMessage(e, "Không gửi được cấu hình xuống tủ"));
    }
  };

  const disabled = !canEdit;
  const selectClass = (bad: boolean) =>
    `w-full rounded-md border bg-background px-2 py-1.5 text-sm ${bad ? "border-rose-500 text-rose-700" : "border-border"}`;
  // Giá trị đang chạy trên tủ, chỉ hiện khi khác bản đang sửa. Lựa chọn hai giá trị thì ghi đúng tên lựa chọn.
  const runningHint = (now: number | boolean | undefined, want: number | boolean, names?: [string, string]) =>
    running && now !== undefined && now !== want ? (
      <span className="block text-[11px] text-amber-600">
        Tủ đang chạy: {typeof now === "number" ? pinLabel(now) : names ? names[now ? 0 : 1] : now ? "bật" : "tắt"}
      </span>
    ) : null;
  const boxCount = cfg.relayPins.length;

  return (
    <div className="space-y-6">
      {/* Trạng thái */}
      <section className="space-y-2 rounded-xl border border-border p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Cpu className="h-4 w-4" />
          <span className="font-semibold">Cấu hình phần cứng</span>
          {view.defaultTemplate ? (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Chưa lưu cho tủ này — đang hiện mẫu tủ TU01
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Lưu lúc {formatDateTime(view.updatedAt)}</span>
          )}
          {view.appliedAt && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${view.applyStatus === "ACCEPTED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              Áp dụng {formatDateTime(view.appliedAt)}: {view.applyStatus}
            </span>
          )}
          {dirty && <span className="rounded bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Có thay đổi chưa lưu</span>}
        </div>
        {view.applyMessage && <p className="text-xs text-muted-foreground">{view.applyMessage}</p>}
        {running ? (
          runningDiffs > 0 ? (
            <p className="flex items-center gap-1.5 text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Bản đã lưu khác cấu hình đang chạy trên tủ ở {runningDiffs} chỗ — chỗ khác được ghi "Tủ đang chạy" ngay dưới ô.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Bản đã lưu khớp với cấu hình đang chạy trên tủ.
            </p>
          )
        ) : (
          <p className="text-muted-foreground">Chưa đọc được cấu hình đang chạy trên tủ (tủ mất kết nối hoặc bộ điều khiển bản cũ).</p>
        )}
        {!canEdit && <p className="text-muted-foreground">Bạn chỉ xem được. Chỉ quản trị viên được sửa và áp dụng cấu hình.</p>}
        {issues.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-rose-700">
            {issues.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
      </section>

      {/* Ô tủ */}
      <section className="rounded-xl border border-border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Ô tủ: relay và cảm biến cửa</h2>
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={addBox} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent">
                <Plus className="h-3.5 w-3.5" /> Thêm ô
              </button>
              <button onClick={removeBox} disabled={boxCount <= 1} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" /> Bỏ ô cuối
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Ô</th>
                <th className="py-2 pr-3 font-medium">Cọc relay</th>
                <th className="py-2 pr-3 font-medium">Chân điều khiển relay</th>
                <th className="py-2 font-medium">Chân cảm biến cửa</th>
              </tr>
            </thead>
            <tbody>
              {cfg.relayPins.map((relay, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="py-2 pr-3 font-semibold">Ô {i + 1}</td>
                  <td className="py-2 pr-3 font-mono text-xs">IN{i + 1} → K{i + 1}</td>
                  <td className="py-2 pr-3">
                    <select disabled={disabled} value={relay} onChange={(e) => setPin("relayPins", i, Number(e.target.value))}
                      className={selectClass((usage.get(relay)?.length ?? 0) > 1)}>
                      {GPIO_OPTIONS.map((g) => <option key={g} value={g}>{pinLabel(g)}</option>)}
                    </select>
                    {runningHint(running?.relayPins[i], relay)}
                  </td>
                  <td className="py-2">
                    <select disabled={disabled} value={cfg.doorPins[i]} onChange={(e) => setPin("doorPins", i, Number(e.target.value))}
                      className={selectClass((usage.get(cfg.doorPins[i])?.length ?? 0) > 1)}>
                      {GPIO_OPTIONS.map((g) => <option key={g} value={g}>{pinLabel(g)}</option>)}
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
        <h2 className="mb-3 text-base font-semibold">Relay, cảm biến, drone</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Relay kích ở mức</span>
            <select disabled={disabled} value={cfg.relayActiveHigh ? "1" : "0"} onChange={(e) => edit({ ...cfg, relayActiveHigh: e.target.value === "1" })} className={selectClass(false)}>
              <option value="1">Mức cao (jumper H)</option>
              <option value="0">Mức thấp (jumper L)</option>
            </select>
            {runningHint(running?.relayActiveHigh, cfg.relayActiveHigh, ["mức cao (jumper H)", "mức thấp (jumper L)"])}
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Thời gian kích relay mở khoá (ms, 100–10000)</span>
            <input type="number" min={100} max={10000} step={100} disabled={disabled} value={cfg.unlockMs}
              onChange={(e) => edit({ ...cfg, unlockMs: Number(e.target.value) })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
            {running && running.unlockMs !== cfg.unlockMs && <span className="block text-[11px] text-amber-600">Tủ đang chạy: {running.unlockMs} ms</span>}
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Cảm biến cửa báo đóng ở mức</span>
            <select disabled={disabled} value={cfg.doorClosedLow ? "1" : "0"} onChange={(e) => edit({ ...cfg, doorClosedLow: e.target.value === "1" })} className={selectClass(false)}>
              <option value="1">Mức thấp = cửa đóng</option>
              <option value="0">Mức cao = cửa đóng</option>
            </select>
            {runningHint(running?.doorClosedLow, cfg.doorClosedLow, ["mức thấp = cửa đóng", "mức cao = cửa đóng"])}
          </label>
          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" disabled={disabled} checked={cfg.requireDoorSensor}
                onChange={(e) => edit({ ...cfg, requireDoorSensor: e.target.checked })} className="mt-1" />
              <span>Chỉ báo mở ô thành công khi cảm biến thấy cửa mở <span className="text-xs text-muted-foreground">(tắt khi cảm biến chưa nối)</span></span>
            </label>
            {runningHint(running?.requireDoorSensor, cfg.requireDoorSensor)}
            <label className="flex items-start gap-2">
              <input type="checkbox" disabled={disabled} checked={cfg.lidBypassPhysicalMotion}
                onChange={(e) => edit({ ...cfg, lidBypassPhysicalMotion: e.target.checked })} className="mt-1" />
              <span>Lệnh nắp của drone chỉ giả lập, không quay động cơ</span>
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
                <h3 className="text-base font-semibold">Nắp trượt trục {lid.axis}</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" disabled={disabled} checked={lid.enabled} onChange={(e) => setLid(lid.axis, { enabled: e.target.checked })} />
                  Đang nối
                </label>
              </div>
              {runningHint(live?.enabled, lid.enabled, ["đang nối", "chưa nối"])}
              <div className="grid grid-cols-2 gap-3">
                {LID_PINS.map(({ key, label }) => (
                  <label key={key} className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <select disabled={disabled} value={lid[key]} onChange={(e) => setLid(lid.axis, { [key]: Number(e.target.value) })}
                      className={selectClass(lid.enabled && (usage.get(lid[key])?.length ?? 0) > 1)}>
                      {GPIO_OPTIONS.map((g) => <option key={g} value={g}>{pinLabel(g)}</option>)}
                    </select>
                    {runningHint(live?.[key], lid[key])}
                  </label>
                ))}
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Chiều mở</span>
                  <select disabled={disabled} value={lid.openDirHigh ? "1" : "0"} onChange={(e) => setLid(lid.axis, { openDirHigh: e.target.value === "1" })} className={selectClass(false)}>
                    <option value="1">DIR mức cao = mở</option>
                    <option value="0">DIR mức thấp = mở</option>
                  </select>
                  {runningHint(live?.openDirHigh, lid.openDirHigh, ["DIR mức cao = mở", "DIR mức thấp = mở"])}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Công tắc hành trình khi bị nhấn</span>
                  <select disabled={disabled} value={lid.limitActiveLow ? "1" : "0"} onChange={(e) => setLid(lid.axis, { limitActiveLow: e.target.value === "1" })} className={selectClass(false)}>
                    <option value="1">Báo mức thấp</option>
                    <option value="0">Báo mức cao (module 3 dây)</option>
                  </select>
                  {runningHint(live?.limitActiveLow, lid.limitActiveLow, ["báo mức thấp", "báo mức cao"])}
                </label>
              </div>
              <div className="text-sm">
                <span className="text-xs text-muted-foreground">Nắp nằm trên ô (lệnh drone vào ô này sẽ trượt nắp trục {lid.axis})</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {Array.from({ length: boxCount }, (_, i) => i + 1).map((box) => (
                    <label key={box} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs">
                      <input type="checkbox" disabled={disabled} checked={lid.boxes.includes(box)}
                        onChange={(e) => setLid(lid.axis, { boxes: e.target.checked ? [...lid.boxes, box].sort((a, b) => a - b) : lid.boxes.filter((b) => b !== box) })} />
                      Ô {box}
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
          <h2 className="text-base font-semibold">Sơ đồ đấu dây</h2>
          {canEdit && (
            <button onClick={() => editWiring([...wiring, { group: "", from: "", to: "", via: "", wire: "", note: "" }])}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent">
              <Plus className="h-3.5 w-3.5" /> Thêm dòng
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Ghi chép để tra cứu khi lần dây tại tủ. Bộ điều khiển không dùng bảng này — chân thật lấy từ các mục phía trên.</p>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
              <tr>
                {WIRING_COLUMNS.map((c) => <th key={c.key} className={`py-2 pr-2 font-medium ${c.width}`}>{c.label}</th>)}
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
                      <button aria-label="Xoá dòng" onClick={() => editWiring(wiring.filter((_, j) => j !== i))}
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
            <Save className="h-4 w-4" /> {saving ? "Đang lưu…" : "Lưu"}
          </button>
          {!confirmApply ? (
            <button onClick={() => setConfirmApply(true)} disabled={applying || dirty || view.defaultTemplate || issues.length > 0}
              title={dirty || view.defaultTemplate ? "Lưu trước rồi mới áp dụng" : undefined}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50">
              <Send className="h-4 w-4" /> {applying ? "Đang gửi…" : "Áp dụng xuống tủ"}
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
              Tủ sẽ khởi động lại bộ điều khiển khoảng 10 giây và chạy theo bản đồ chân mới.
              <button onClick={apply} className="rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700">Áp dụng ngay</button>
              <button onClick={() => setConfirmApply(false)} className="rounded border border-amber-300 px-2.5 py-1 text-xs hover:bg-amber-100">Huỷ</button>
            </span>
          )}
          {running && (
            <button onClick={() => edit(clone(running))} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
              <Download className="h-4 w-4" /> Lấy cấu hình đang chạy trên tủ
            </button>
          )}
          {dirty && (
            <button onClick={() => { setCfg(clone(view.config)); setWiring(clone(view.wiring ?? [])); setDirty(false); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
              <RotateCcw className="h-4 w-4" /> Bỏ thay đổi
            </button>
          )}
        </section>
      )}
    </div>
  );
}
