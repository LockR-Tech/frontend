import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, DoorOpen, Gauge, RotateCcw, Square, ArrowUp, ArrowDown, Home, ScrollText } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { formatDateTime } from "~/lib/datetime";
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

const ACTION_LABELS: Record<string, string> = {
  BOX_OPEN: "Mở ô",
  BOX_TEST: "Thử ô",
  LID_OPEN: "Nắp: mở hết",
  LID_CLOSE: "Nắp: đóng hết",
  LID_HOME: "Nắp: về gốc",
  LID_STOP: "Nắp: dừng",
  LID_JOG: "Nắp: chạy thử",
  LID_TUNE: "Nắp: chỉnh thông số",
};

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "OK":
    case "SUCCESS":
    case "ACCEPTED":
    case "OPEN":
      return "bg-emerald-50 text-emerald-700";
    case "STOPPED":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-rose-50 text-rose-700";
  }
}

const TUNE_FIELDS: { key: string; label: string; step?: number }[] = [
  { key: "rps", label: "Tốc độ (vòng/giây)", step: 0.1 },
  { key: "pulse_us", label: "Độ rộng xung (µs)", step: 50 },
  { key: "steps_per_rev", label: "Số xung mỗi vòng", step: 100 },
  { key: "max_revs", label: "Giới hạn vòng mỗi lần", step: 1 },
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
      if (body?.accepted) toast.success(body.message || `${label}: đã gửi lệnh`);
      else toast.error(body?.message || `${label} không thành công`);
      refetchPanel();
    } catch {
      toast.error(`${label} không gửi được — kiểm tra kết nối`);
    }
    refetchLogs();
  };

  if (lockerId == null) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("admin.sidebar.cabinetControl", { defaultValue: "Điều khiển tủ" })} description="" />
        <p className="text-sm text-muted-foreground">Chưa có tủ nào để điều khiển.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.sidebar.cabinetControl", { defaultValue: "Điều khiển tủ" })}
        description={t("admin.cabinetControl.description", {
          defaultValue: "Mở ô, điều khiển nắp/thanh trượt và xem trạng thái phần cứng của tủ. Lệnh gửi qua MQTT tới bộ điều khiển Raspberry Pi của tủ.",
        })}
      />

      {/* Cảnh báo an toàn */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <b>Điều khiển phần cứng thật.</b> Nút nắp quay động cơ của tủ. Chỉ chạy khi chắc chắn không ai đang thao tác tại tủ; nếu nắp kêu hoặc kẹt, bấm <b>Dừng</b> ngay. Lệnh chạy nắp trả về ngay rồi tủ mới chạy — theo dõi trạng thái bên dưới.
        </div>
      </div>

      {/* Chọn tủ */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Tủ:</label>
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
          <RotateCcw className={`h-4 w-4 ${panelLoading ? "animate-spin" : ""}`} /> Làm mới
        </button>
      </div>

      {/* Mở ô */}
      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-base font-semibold">Mở ô tủ</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {boxes.map((b) => (
            <button
              key={b.id}
              onClick={() => run(`Mở ô ${b.boxNumber}`, openBox({ lockerId, boxId: b.id }).unwrap().then((d) => ({ data: d })))}
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-sm hover:border-primary hover:bg-accent"
            >
              <DoorOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">Ô {b.boxNumber}</span>
              <span className="text-[11px] text-muted-foreground">
                {b.cellType === "DRONE" ? "Drone" : b.cellType} · {b.status}
              </span>
            </button>
          ))}
          {boxes.length === 0 && <p className="text-sm text-muted-foreground">Chưa lấy được sơ đồ ô.</p>}
        </div>
      </section>

      {/* Nắp / thanh trượt */}
      <section className="grid gap-4 md:grid-cols-2">
        {lids.map((lid) => (
          <LidPanel
            key={lid.axis}
            axis={lid.axis}
            enabled={lid.enabled}
            status={lid.status}
            onAction={(action) => run(`Nắp trục ${lid.axis}`, controlLid({ lockerId, axis: lid.axis, action }).unwrap().then((d) => ({ data: d })))}
            onJog={(revolutions, direction) => run(`Chạy nắp trục ${lid.axis}`, jogLid({ lockerId, axis: lid.axis, revolutions, direction }).unwrap().then((d) => ({ data: d })))}
            onTune={(changes) => run(`Chỉnh nắp trục ${lid.axis}`, tuneLid({ lockerId, axis: lid.axis, changes }).unwrap().then((d) => ({ data: d })))}
          />
        ))}
        {lids.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Chưa lấy được trạng thái nắp. Tủ có thể đang mất kết nối — bấm Làm mới.
          </p>
        )}
      </section>

      <CabinetLogSection logs={logs} boxNumberById={boxNumberById} />
    </div>
  );
}

function CabinetLogSection({
  logs, boxNumberById,
}: {
  logs: CabinetControlLog[];
  boxNumberById: Map<number, number>;
}) {
  const target = (log: CabinetControlLog) => {
    const box = log.boxNumber ?? (log.boxId != null ? boxNumberById.get(log.boxId) : undefined);
    if (box != null) return `Ô ${box}`;
    if (log.axis != null) return `Trục ${log.axis}`;
    return "—";
  };

  return (
    <section className="rounded-xl border border-border p-4">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
        <ScrollText className="h-4 w-4" /> Nhật ký điều khiển
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        <b>Web</b>: lệnh gửi từ trang này. <b>Tủ</b>: việc tủ thực sự làm (kích relay, chạy nắp) từ mọi nguồn —
        tủ lưu lại khi mất mạng và gửi lên khi có mạng lại, nên có thể hiện muộn nhưng đúng giờ xảy ra.
      </p>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có nhật ký.</p>
      ) : (
        <div className="max-h-120 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Thời gian</th>
                <th className="py-2 pr-3 font-medium">Nguồn</th>
                <th className="py-2 pr-3 font-medium">Hành động</th>
                <th className="py-2 pr-3 font-medium">Ô / trục</th>
                <th className="py-2 pr-3 font-medium">Số vòng</th>
                <th className="py-2 pr-3 font-medium">Kết quả</th>
                <th className="py-2 font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{formatDateTime(log.occurredAt)}</td>
                  <td className="py-2 pr-3">
                    {log.source === "WEB"
                      ? `Web${log.actorUserId != null ? ` · #${log.actorUserId}` : ""}`
                      : "Tủ"}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3">{ACTION_LABELS[log.action] ?? log.action}</td>
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
  axis, enabled, status, onAction, onJog, onTune,
}: {
  axis: number;
  enabled: boolean;
  status: LidStatus | null;
  onAction: (a: LidAction) => void;
  onJog: (revolutions: number, direction: "open" | "close") => void;
  onTune: (changes: Record<string, number>) => void;
}) {
  const [revs, setRevs] = useState(2);
  const [tune, setTune] = useState<Record<string, string>>({});

  const cfg = status?.config ?? {};
  const disabled = !enabled;

  return (
    <div className={`rounded-xl border p-4 ${disabled ? "border-dashed border-border opacity-70" : "border-border"}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Gauge className="h-4 w-4" /> Trục nắp {axis}
        </h3>
        <span className={`text-sm font-semibold ${stateColor(status?.state)}`}>
          {disabled ? "Chưa bật" : (status?.state ?? "—")}
          {status?.busy ? " · đang chạy" : ""}
        </span>
      </div>

      {disabled ? (
        <p className="text-sm text-muted-foreground">Trục này chưa bật trên bộ điều khiển của tủ (LID2_ENABLED=false).</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <ActBtn onClick={() => onAction("open")} icon={<ArrowUp className="h-4 w-4" />} label="Mở hết" />
            <ActBtn onClick={() => onAction("close")} icon={<ArrowDown className="h-4 w-4" />} label="Đóng hết" />
            <ActBtn onClick={() => onAction("home")} icon={<Home className="h-4 w-4" />} label="Về gốc" />
            <ActBtn onClick={() => onAction("stop")} icon={<Square className="h-4 w-4" />} label="Dừng" danger />
          </div>

          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Chạy thử (số vòng)</label>
              <input
                type="number" min={0.5} step={0.5} value={revs}
                onChange={(e) => setRevs(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <button onClick={() => onJog(revs, "open")} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">↑ mở</button>
            <button onClick={() => onJog(revs, "close")} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">↓ đóng</button>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Chỉnh tốc độ / xung</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TUNE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-muted-foreground">{f.label}</label>
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
              Lưu thông số
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
