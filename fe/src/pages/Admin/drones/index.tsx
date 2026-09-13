import { useMemo, useState } from "react";
import {
  Plane,
  Plus,
  RefreshCw,
  BatteryCharging,
  Pencil,
  Power,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PageHeader } from "~/components/shared/page-header";
import {
  useGetDronesQuery,
  useCreateDroneMutation,
  useUpdateDroneMutation,
  useDecommissionDroneMutation,
  useUpdateDroneStatusMutation,
  useUpdateDroneBatteryMutation,
  type DroneResponse,
} from "~/stores/apis/admin/drones";
import { useGetLockerStatsQuery } from "~/stores/apis/admin/lockerOps";

const STATUS_OPTIONS = [
  "IDLE",
  "CHARGING",
  "IN_FLIGHT",
  "MAINTENANCE",
  "FAULT",
] as const;

const STATUS_FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: "Tất cả" },
  { value: "IDLE", label: "Sẵn sàng" },
  { value: "CHARGING", label: "Đang sạc" },
  { value: "IN_FLIGHT", label: "Đang bay" },
  { value: "FAULT", label: "Lỗi" },
];

const STATUS_BADGE: Record<string, string> = {
  IDLE: "bg-green-100 text-green-800 border-green-300",
  CHARGING: "bg-amber-100 text-amber-800 border-amber-300",
  IN_FLIGHT: "bg-blue-100 text-blue-800 border-blue-300",
  IN_USE: "bg-blue-100 text-blue-800 border-blue-300",
  MAINTENANCE: "bg-slate-100 text-slate-700 border-slate-300",
  FAULT: "bg-red-100 text-red-800 border-red-300",
};

function batteryColor(pct: number): string {
  if (pct < 20) return "bg-red-500";
  if (pct < 50) return "bg-amber-500";
  return "bg-green-500";
}

export default function DronesPage() {
  const { data, isLoading, isFetching, refetch } = useGetDronesQuery();
  const lockersQuery = useGetLockerStatsQuery();
  const [createDrone, createState] = useCreateDroneMutation();
  const [updateDrone, updateState] = useUpdateDroneMutation();
  const [decommission] = useDecommissionDroneMutation();
  const [updateStatus] = useUpdateDroneStatusMutation();
  const [updateBattery] = useUpdateDroneBatteryMutation();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DroneResponse | null>(null);
  const [managing, setManaging] = useState<DroneResponse | null>(null);

  const drones = useMemo(() => data?.data ?? [], [data]);
  const lockers = lockersQuery.data?.data ?? [];

  const counts = useMemo(
    () => ({
      total: drones.length,
      idle: drones.filter((d) => d.status === "IDLE").length,
      charging: drones.filter((d) => d.status === "CHARGING").length,
      fault: drones.filter((d) => d.status === "FAULT").length,
    }),
    [drones],
  );

  const filtered = statusFilter
    ? drones.filter((d) => d.status === statusFilter)
    : drones;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (d: DroneResponse) => {
    setEditing(d);
    setFormOpen(true);
  };

  const handleDecommission = async (d: DroneResponse) => {
    if (
      !window.confirm(
        `Ngừng hoạt động drone "${d.code}"? Drone sẽ không còn nhận nhiệm vụ.`,
      )
    )
      return;
    try {
      await decommission(d.id).unwrap();
      toast.success(`Đã ngừng hoạt động drone ${d.code}`);
    } catch {
      toast.error("Không ngừng được drone");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Drone"
        description="Đội drone giao/nhận gắn với bãi đáp của tủ"
      />

      {/* Stats + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Tổng" value={counts.total} color="text-primary" />
          <StatCard label="Sẵn sàng" value={counts.idle} color="text-green-700" />
          <StatCard label="Đang sạc" value={counts.charging} color="text-amber-700" />
          <StatCard label="Lỗi" value={counts.fault} color="text-red-700" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Thêm drone
          </Button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                  : "border-border/50 bg-background text-muted-foreground hover:border-border/70"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Drone list */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <Plane className="mx-auto mb-3 h-8 w-8 opacity-40" />
            {drones.length === 0 ? "Chưa có drone nào" : "Không có drone khớp bộ lọc"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => {
            const battery = d.batteryPercent ?? 0;
            return (
              <Card key={d.id} className="border-0 shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{d.code}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={STATUS_BADGE[d.status] ?? "bg-muted text-muted-foreground"}
                    >
                      {d.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {d.lockerName ?? (d.lockerId ? `Tủ #${d.lockerId}` : "Chưa gắn tủ")}
                  </p>

                  <div className="flex items-center gap-2">
                    <BatteryCharging className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${batteryColor(battery)}`}
                        style={{ width: `${Math.max(0, Math.min(100, battery))}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs font-medium text-foreground">
                      {battery.toFixed(0)}%
                    </span>
                  </div>

                  {d.faultReason && (
                    <p className="text-xs text-red-600">{d.faultReason}</p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setManaging(d)}>
                      Trạng thái
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDecommission(d)}
                    >
                      <Power className="mr-1 h-3.5 w-3.5" /> Ngừng
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DroneFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        lockers={lockers}
        isSaving={createState.isLoading || updateState.isLoading}
        onSubmit={async ({ lockerId, code }) => {
          try {
            if (editing) {
              await updateDrone({ id: editing.id, lockerId, code }).unwrap();
              toast.success(`Đã cập nhật drone ${code}`);
            } else {
              await createDrone({ lockerId, code }).unwrap();
              toast.success(`Đã thêm drone ${code}`);
            }
            setFormOpen(false);
          } catch {
            toast.error(editing ? "Không cập nhật được drone" : "Không tạo được drone");
          }
        }}
      />

      <DroneManageDialog
        drone={managing}
        onClose={() => setManaging(null)}
        onSave={async ({ id, status, reason, battery, initialStatus }) => {
          try {
            if (status !== initialStatus || status === "FAULT") {
              await updateStatus({
                id,
                status,
                reason: status === "FAULT" ? reason : undefined,
              }).unwrap();
            }
            if (battery != null) {
              await updateBattery({ id, batteryPercent: battery }).unwrap();
            }
            toast.success("Đã cập nhật drone");
            setManaging(null);
          } catch {
            toast.error("Không cập nhật được drone");
          }
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

interface LockerOption {
  lockerId: number;
  code: string;
  name: string;
}

function DroneFormDialog({
  open,
  onClose,
  editing,
  lockers,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: DroneResponse | null;
  lockers: LockerOption[];
  isSaving: boolean;
  onSubmit: (v: { lockerId: number; code: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [lockerId, setLockerId] = useState<string>("");
  const [touched, setTouched] = useState(false);

  // Đồng bộ form mỗi lần mở dialog cho drone khác nhau.
  const key = `${open}-${editing?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState("");
  if (key !== lastKey) {
    setLastKey(key);
    setCode(editing?.code ?? "");
    setLockerId(editing?.lockerId != null ? String(editing.lockerId) : "");
    setTouched(false);
  }

  const submit = () => {
    setTouched(true);
    const id = Number(lockerId);
    if (!code.trim() || !id) return;
    onSubmit({ lockerId: id, code: code.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Sửa drone" : "Thêm drone"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-1.5 block text-xs">Mã drone *</Label>
            <Input
              placeholder="DRONE-01"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            {touched && !code.trim() && (
              <p className="mt-1 text-xs text-red-600">Nhập mã drone.</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Tủ gốc (bãi đáp) *</Label>
            <Select value={lockerId} onValueChange={setLockerId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn tủ…" />
              </SelectTrigger>
              <SelectContent>
                {lockers.map((l) => (
                  <SelectItem key={l.lockerId} value={String(l.lockerId)}>
                    {l.name} ({l.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {touched && !lockerId && (
              <p className="mt-1 text-xs text-red-600">Chọn tủ gốc.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Lưu" : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DroneManageDialog({
  drone,
  onClose,
  onSave,
}: {
  drone: DroneResponse | null;
  onClose: () => void;
  onSave: (v: {
    id: number;
    status: string;
    reason: string;
    battery: number | null;
    initialStatus: string;
  }) => void;
}) {
  const [status, setStatus] = useState("IDLE");
  const [reason, setReason] = useState("");
  const [battery, setBattery] = useState("");
  const [saving, setSaving] = useState(false);

  const [lastId, setLastId] = useState<number | null>(null);
  if (drone && drone.id !== lastId) {
    setLastId(drone.id);
    setStatus(drone.status);
    setReason(drone.faultReason ?? "");
    setBattery(drone.batteryPercent != null ? String(Math.round(drone.batteryPercent)) : "");
    setSaving(false);
  }

  const submit = async () => {
    if (!drone) return;
    if (status === "FAULT" && !reason.trim()) {
      toast.error("Cần nhập lý do khi chuyển sang FAULT");
      return;
    }
    setSaving(true);
    const parsed = battery.trim() === "" ? null : Number(battery);
    await onSave({
      id: drone.id,
      status,
      reason: reason.trim(),
      battery: parsed != null && !Number.isNaN(parsed) ? parsed : null,
      initialStatus: drone.status,
    });
    setSaving(false);
  };

  return (
    <Dialog open={!!drone} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Drone {drone?.code}
            {drone?.lockerName ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {drone.lockerName}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-1.5 block text-xs">Trạng thái</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {status === "FAULT" && (
            <div>
              <Label className="mb-1.5 block text-xs">Lý do lỗi (bắt buộc)</Label>
              <Input
                placeholder="Hỏng động cơ / pin chai…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label className="mb-1.5 block text-xs">Pin (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="80"
              value={battery}
              onChange={(e) => setBattery(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
