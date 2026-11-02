import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, DoorOpen, Gauge, RotateCcw, Square, ArrowUp, ArrowDown, Home, ScrollText } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useAuth } from "~/context/auth-context";
import { formatDateTime } from "~/lib/datetime";
import { HardwareConfigTab } from "./HardwareConfigTab";
import {
  useGetStaffLockersQuery,
  useGetLockerLayoutQuery,
} from "~/stores/apis/admin/lockerOps";
import {
  useGetCabinetPanelQuery,
  useGetCabinetLogsQuery,
  useOpenCabinetBoxMutation,
  useControlLidMutation,
  useJogLidMutation,
  useTuneLidMutation,
  type CabinetControlLog,
  type LidAction,
  type LidStatus,
} from "~/stores/apis/admin/cabinetControl";

// Lưu khoá i18n; dịch lúc render bằng t()
const ACTION_LABEL_KEYS: Record<string, string> = {
  BOX_OPEN: "admin.cabinetControl.actions.boxOpen",
  BOX_TEST: "admin.cabinetControl.actions.boxTest",
  LID_OPEN: "admin.cabinetControl.actions.lidOpen",
  LID_CLOSE: "admin.cabinetControl.actions.lidClose",
  LID_HOME: "admin.cabinetControl.actions.lidHome",
  LID_STOP: "admin.cabinetControl.actions.lidStop",
  LID_JOG: "admin.cabinetControl.actions.lidJog",
  LID_TUNE: "admin.cabinetControl.actions.lidTune",
  HW_CONFIG: "admin.cabinetControl.actions.hwConfig",
  BLE_TOKEN: "admin.cabinetControl.actions.bleToken",
  BOX_OPEN_BLE: "admin.cabinetControl.actions.boxOpenBle",
  BLE_REJECTED: "admin.cabinetControl.actions.bleRejected",
};

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "OK":
    case "SUCCESS":
    case "ACCEPTED":
    case "OPEN":
    case "ISSUED":
      return "bg-emerald-50 text-emerald-700";
    case "STOPPED":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-rose-50 text-rose-700";
  }
}

const TUNE_FIELDS: { key: string; labelKey: string; step?: number }[] = [
  { key: "rps", labelKey: "admin.cabinetControl.tune.rps", step: 0.1 },
  { key: "pulse_us", labelKey: "admin.cabinetControl.tune.pulseUs", step: 50 },
  { key: "steps_per_rev", labelKey: "admin.cabinetControl.tune.stepsPerRev", step: 100 },
  { key: "max_revs", labelKey: "admin.cabinetControl.tune.maxRevs", step: 1 },
];

function stateColor(state?: string) {
  switch ((state || "").toUpperCase()) {
    case "OPEN": return "text-emerald-600";
    case "CLOSED": return "text-slate-600";
    case "MOVING": return "text-amber-600";
    case "FAULT": return "text-rose-600";
    default: return "text-slate-400";
  }
}

export default function CabinetControlPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { data: lockersResp } = useGetStaffLockersQuery();
  const lockers = useMemo(() => lockersResp?.data ?? [], [lockersResp]);
  const [lockerId, setLockerId] = useState<number | null>(null);

  useEffect(() => {
    if (lockerId == null && lockers.length) setLockerId(lockers[0].id);
  }, [lockers, lockerId]);

  const { data: layoutResp } = useGetLockerLayoutQuery(lockerId as number, { skip: lockerId == null });
  const boxes = useMemo(
    () => [...(layoutResp?.data?.cells ?? [])].sort((a, b) => a.boxNumber - b.boxNumber),
    [layoutResp],
  );

  const { data: panelResp, refetch: refetchPanel, isFetching: panelLoading } =
    useGetCabinetPanelQuery(lockerId as number, {
      skip: lockerId == null,
      pollingInterval: 4000,
    });
  const lids = panelResp?.data?.result?.lids ?? [];

  const { data: logsResp, refetch: refetchLogs } = useGetCabinetLogsQuery(
    { lockerId: lockerId as number },
    { skip: lockerId == null, pollingInterval: 5000 },
  );
  const logs = logsResp?.data ?? [];
  const boxNumberById = useMemo(() => new Map(boxes.map((b) => [b.id, b.boxNumber])), [boxes]);

  const [openBox] = useOpenCabinetBoxMutation();
  const [controlLid] = useControlLidMutation();
  const [jogLid] = useJogLidMutation();
  const [tuneLid] = useTuneLidMutation();

  const run = async (label: string, p: Promise<{ data?: { data?: { accepted?: boolean; message?: string } } }>) => {
    try {
      const res = await p;
      const body = (res as { data?: { data?: { accepted?: boolean; message?: string } } }).data?.data;
      if (body?.accepted) toast.success(body.message || t("admin.cabinetControl.run.sent", { label }));
      else toast.error(body?.message || t("admin.cabinetControl.run.failed", { label }));
      refetchPanel();
    } catch {
      toast.error(t("admin.cabinetControl.run.sendFailed", { label }));
    }
    refetchLogs();
  };

  if (lockerId == null) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("admin.sidebar.cabinetControl")} description="" />
        <p className="text-sm text-muted-foreground">{t("admin.cabinetControl.noLockers")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.sidebar.cabinetControl")}
        description={t("admin.cabinetControl.description")}
      />

      {/* Cảnh báo an toàn */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <Trans i18nKey="admin.cabinetControl.safetyWarning" components={{ b: <b /> }} />
        </div>
      </div>

      {/* Chọn tủ */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">{t("admin.cabinetControl.lockerLabel")}</label>
        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={lockerId}
          onChange={(e) => setLockerId(Number(e.target.value))}
        >
          {lockers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code} — {l.name} ({l.status})
            </option>
          ))}
        </select>
        <button
          onClick={() => refetchPanel()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          <RotateCcw className={`h-4 w-4 ${panelLoading ? "animate-spin" : ""}`} /> {t("button.refresh")}
        </button>
      </div>

      <Tabs defaultValue="control" className="space-y-6">
        <TabsList>
          <TabsTrigger value="control">{t("admin.cabinetControl.tabs.control")}</TabsTrigger>
          <TabsTrigger value="hardware">{t("admin.cabinetControl.tabs.hardware")}</TabsTrigger>
        </TabsList>

        <TabsContent value="hardware">
          <HardwareConfigTab lockerId={lockerId} running={panelResp?.data?.result?.hardware} canEdit={hasPermission("manage_lockers")} />
        </TabsContent>

        <TabsContent value="control" className="space-y-6">
      {/* Mở ô */}
      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-base font-semibold">{t("admin.cabinetControl.openBoxTitle")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {boxes.map((b) => (
            <button
              key={b.id}
              onClick={() => run(t("admin.cabinetControl.openBoxLabel", { n: b.boxNumber }), openBox({ lockerId, boxId: b.id }).unwrap().then((d) => ({ data: d })))}
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-sm hover:border-primary hover:bg-accent"
            >
              <DoorOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">{t("admin.cabinetControl.box", { n: b.boxNumber })}</span>
              <span className="text-[11px] text-muted-foreground">
                {b.cellType === "DRONE" ? "Drone" : b.cellType} · {b.status}
              </span>
            </button>
          ))}
          {boxes.length === 0 && <p className="text-sm text-muted-foreground">{t("admin.cabinetControl.noLayout")}</p>}
        </div>
      </section>

      {/* Nắp / thanh trượt */}
      <section className="grid gap-4 md:grid-cols-2">
        {lids.map((lid) => (
          <LidPanel
            key={lid.axis}
            axis={lid.axis}
            enabled={lid.enabled}
            boxes={lid.boxes ?? []}
            status={lid.status}
            onAction={(action) => run(t("admin.cabinetControl.lidAxisLabel", { axis: lid.axis }), controlLid({ lockerId, axis: lid.axis, action }).unwrap().then((d) => ({ data: d })))}
            onJog={(revolutions, direction) => run(t("admin.cabinetControl.jogAxisLabel", { axis: lid.axis }), jogLid({ lockerId, axis: lid.axis, revolutions, direction }).unwrap().then((d) => ({ data: d })))}
            onTune={(changes) => run(t("admin.cabinetControl.tuneAxisLabel", { axis: lid.axis }), tuneLid({ lockerId, axis: lid.axis, changes }).unwrap().then((d) => ({ data: d })))}
          />
        ))}
        {lids.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("admin.cabinetControl.noLidStatus")}
          </p>
        )}
      </section>

      <CabinetLogSection logs={logs} boxNumberById={boxNumberById} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CabinetLogSection({
  logs, boxNumberById,
}: {
  logs: CabinetControlLog[];
  boxNumberById: Map<number, number>;
}) {
  const { t } = useTranslation();
  const target = (log: CabinetControlLog) => {
    const box = log.boxNumber ?? (log.boxId != null ? boxNumberById.get(log.boxId) : undefined);
    if (box != null) return t("admin.cabinetControl.box", { n: box });
    if (log.axis != null) return t("admin.cabinetControl.log.axis", { axis: log.axis });
    return "—";
  };

  return (
    <section className="rounded-xl border border-border p-4">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
        <ScrollText className="h-4 w-4" /> {t("admin.cabinetControl.log.title")}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        <Trans i18nKey="admin.cabinetControl.log.help" components={{ b: <b /> }} />
      </p>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin.cabinetControl.log.empty")}</p>
      ) : (
        <div className="max-h-120 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">{t("common.time")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.cabinetControl.log.columns.source")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.cabinetControl.log.columns.action")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.cabinetControl.log.columns.target")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.cabinetControl.log.columns.revolutions")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.cabinetControl.log.columns.result")}</th>
                <th className="py-2 font-medium">{t("common.note")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{formatDateTime(log.occurredAt)}</td>
                  <td className="py-2 pr-3">
                    {log.source === "WEB"
                      ? `Web${log.actorUserId != null ? ` · #${log.actorUserId}` : ""}`
                      : t("admin.cabinetControl.log.sourceLocker")}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3">{ACTION_LABEL_KEYS[log.action] ? t(ACTION_LABEL_KEYS[log.action]) : log.action}</td>
                  <td className="py-2 pr-3">{target(log)}</td>
                  <td className="py-2 pr-3 tabular-nums">{log.revolutions != null ? log.revolutions : "—"}</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusClass(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 text-muted-foreground">{log.message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LidPanel({
  axis, enabled, boxes, status, onAction, onJog, onTune,
}: {
  axis: number;
  enabled: boolean;
  boxes: number[];
  status: LidStatus | null;
  onAction: (a: LidAction) => void;
  onJog: (revolutions: number, direction: "open" | "close") => void;
  onTune: (changes: Record<string, number>) => void;
}) {
  const { t } = useTranslation();
  const [revs, setRevs] = useState(2);
  const [tune, setTune] = useState<Record<string, string>>({});

  const cfg = status?.config ?? {};
  const disabled = !enabled;

  return (
    <div className={`rounded-xl border p-4 ${disabled ? "border-dashed border-border opacity-70" : "border-border"}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Gauge className="h-4 w-4" /> {t("admin.cabinetControl.lid.title", { axis })}
          {boxes.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">{t("admin.cabinetControl.lid.overBoxes", { boxes: boxes.join(", ") })}</span>
          )}
        </h3>
        <span className={`text-sm font-semibold ${stateColor(status?.state)}`}>
          {disabled ? t("admin.cabinetControl.lid.notEnabled") : (status?.state ?? "—")}
          {status?.busy ? ` · ${t("admin.cabinetControl.lid.running")}` : ""}
        </span>
      </div>

      {disabled ? (
        <p className="text-sm text-muted-foreground">{t("admin.cabinetControl.lid.disabledHint")}</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <ActBtn onClick={() => onAction("open")} icon={<ArrowUp className="h-4 w-4" />} label={t("admin.cabinetControl.lid.openFully")} />
            <ActBtn onClick={() => onAction("close")} icon={<ArrowDown className="h-4 w-4" />} label={t("admin.cabinetControl.lid.closeFully")} />
            <ActBtn onClick={() => onAction("home")} icon={<Home className="h-4 w-4" />} label={t("admin.cabinetControl.lid.home")} />
            <ActBtn onClick={() => onAction("stop")} icon={<Square className="h-4 w-4" />} label={t("admin.cabinetControl.lid.stop")} danger />
          </div>

          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">{t("admin.cabinetControl.lid.jogLabel")}</label>
              <input
                type="number" min={0.5} step={0.5} value={revs}
                onChange={(e) => setRevs(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <button onClick={() => onJog(revs, "open")} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">{t("admin.cabinetControl.lid.jogOpen")}</button>
            <button onClick={() => onJog(revs, "close")} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">{t("admin.cabinetControl.lid.jogClose")}</button>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">{t("admin.cabinetControl.lid.tuneSummary")}</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TUNE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-muted-foreground">{t(f.labelKey)}</label>
                  <input
                    type="number" step={f.step}
                    placeholder={String((cfg as Record<string, number>)[f.key] ?? "")}
                    value={tune[f.key] ?? ""}
                    onChange={(e) => setTune((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const changes: Record<string, number> = {};
                for (const f of TUNE_FIELDS) {
                  const v = tune[f.key];
                  if (v !== undefined && v !== "" && !Number.isNaN(Number(v))) changes[f.key] = Number(v);
                }
                if (Object.keys(changes).length) { onTune(changes); setTune({}); }
              }}
              className="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t("admin.cabinetControl.lid.saveParams")}
            </button>
          </details>
        </>
      )}
    </div>
  );
}

function ActBtn({ onClick, icon, label, danger }: { onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium hover:bg-accent ${
        danger ? "border-rose-300 text-rose-700 hover:bg-rose-50" : "border-border"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
