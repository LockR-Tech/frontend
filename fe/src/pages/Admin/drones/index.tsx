import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane,
  Plus,
  RefreshCw,
  BatteryCharging,
  Loader2,
  Wrench,
  Power,
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
  useUpdateDroneStatusMutation,
} from "~/stores/apis/admin/drones";
import { useGetLockerStatsQuery } from "~/stores/apis/admin/lockerOps";

const STATUS_LABELS: Record<string, string> = {
  IDLE: "Sẵn sàng",
  RESERVED: "Đã giữ cho nhiệm vụ",
  CHARGING: "Đang sạc",
  IN_FLIGHT: "Đang bay",
  MAINTENANCE: "Bảo trì",
  FAULT: "Đang sửa lỗi",
};

const STATUS_FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: "Tất cả" },
  { value: "IDLE", label: "Sẵn sàng" },
  { value: "CHARGING", label: "Đang sạc" },
  { value: "RESERVED", label: "Đã giữ" },
  { value: "IN_FLIGHT", label: "Đang bay" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "FAULT", label: "Lỗi" },
];

const STATUS_BADGE: Record<string, string> = {
  IDLE: "bg-green-100 text-green-800 border-green-300",
  RESERVED: "bg-cyan-100 text-cyan-800 border-cyan-300",
  CHARGING: "bg-amber-100 text-amber-800 border-amber-300",
  IN_FLIGHT: "bg-blue-100 text-blue-800 border-blue-300",
  IN_USE: "bg-blue-100 text-blue-800 border-blue-300",
  MAINTENANCE: "bg-slate-100 text-slate-700 border-slate-300",
  FAULT: "bg-red-100 text-red-800 border-red-300",
};

function apiErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as
    { data?: { message?: string }; message?: string } | undefined;
  return (
    candidate?.data?.message?.trim() || candidate?.message?.trim() || fallback
  );
}

function batteryColor(pct: number): string {
  if (pct < 20) return "bg-red-500";
  if (pct < 50) return "bg-amber-500";
  return "bg-green-500";
}

export default function DronesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, refetch } = useGetDronesQuery();
  const lockersQuery = useGetLockerStatsQuery();
  const [createDrone, createState] = useCreateDroneMutation();
  const [updateDroneStatus, statusState] = useUpdateDroneStatusMutation();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const drones = useMemo(() => data?.data ?? [], [data]);
  const lockers = lockersQuery.data?.data ?? [];

  const statusCounts = useMemo(
    () =>
      drones.reduce<Record<string, number>>((result, drone) => {
        result[drone.status] = (result[drone.status] ?? 0) + 1;
        return result;
      }, {}),
    [drones],
  );

  const counts = useMemo(
    () => ({
      total: drones.length,
      idle: statusCounts.IDLE ?? 0,
      charging: statusCounts.CHARGING ?? 0,
      fault: statusCounts.FAULT ?? 0,
    }),
    [drones.length, statusCounts],
  );

  const filtered = statusFilter
    ? drones.filter((d) => d.status === statusFilter)
    : drones;

  const openCreate = () => {
    setFormOpen(true);
  };

  const toggleMaintenance = async (drone: (typeof drones)[number]) => {
    const maintenanceEnabled = drone.status === "MAINTENANCE";
    if (["RESERVED", "IN_FLIGHT"].includes(drone.status)) {
      toast.warning("Drone đang thực hiện đơn giao hàng", {
        description:
          "Vui lòng hoàn tất đơn giao hiện tại trước khi chuyển drone sang bảo trì.",
      });
      return;
    }
    try {
      await updateDroneStatus({
        id: drone.id,
        status: maintenanceEnabled ? "IDLE" : "MAINTENANCE",
      }).unwrap();
      toast.success(
        maintenanceEnabled
          ? "Drone đã hoạt động lại"
          : "Đã chuyển drone sang bảo trì",
      );
    } catch {
      toast.error(
        maintenanceEnabled
          ? "Không kích hoạt được drone"
          : "Không chuyển được trạng thái bảo trì",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Drone"
        description="Đội drone giao/nhận gắn với bãi đáp của tủ"
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:max-w-2xl">
              <StatCard
                label="Tổng"
                value={counts.total}
                color="text-primary"
              />
              <StatCard
                label="Sẵn sàng"
                value={counts.idle}
                color="text-emerald-600"
              />
              <StatCard
                label="Đang sạc"
                value={counts.charging}
                color="text-amber-600"
              />
              <StatCard
                label="Lỗi"
                value={counts.fault}
                color="text-rose-600"
              />
            </div>
            <div className="flex shrink-0 gap-2 self-end xl:self-auto">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Làm mới
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Thêm drone
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            {STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.value;
              const count = filter.value
                ? (statusCounts[filter.value] ?? 0)
                : counts.total;
              return (
                <button
                  key={filter.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{filter.label}</span>
                  <span
                    className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Drone list */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <Plane className="mx-auto mb-3 h-8 w-8 opacity-40" />
            {drones.length === 0
              ? "Chưa có drone nào"
              : "Không có drone khớp bộ lọc"}
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
                      <span className="font-semibold text-foreground">
                        {d.code}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        STATUS_BADGE[d.status] ??
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {d.lockerName ??
                      (d.lockerId ? `Tủ #${d.lockerId}` : "Chưa gắn tủ")}
                  </p>

                  <div className="flex items-center gap-2">
                    <BatteryCharging className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${batteryColor(battery)}`}
                        style={{
                          width: `${Math.max(0, Math.min(100, battery))}%`,
                        }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs font-medium text-foreground">
                      {battery.toFixed(0)}%
                    </span>
                  </div>

                  {d.faultReason && (
                    <p className="text-xs text-red-600">{d.faultReason}</p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Phụ trách:{" "}
                    {d.assignedTechnicianName ?? "Chưa có kỹ thuật viên"}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(`/admin/drones/${d.id}`, {
                          state: { droneCode: d.code },
                        })
                      }
                    >
                      Chi tiết
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        d.status === "MAINTENANCE" ? "default" : "outline"
                      }
                      className={
                        d.status === "MAINTENANCE"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "text-amber-600 hover:text-amber-700"
                      }
                      disabled={statusState.isLoading || d.status === "FAULT"}
                      onClick={() => toggleMaintenance(d)}
                    >
                      {d.status === "MAINTENANCE" ? (
                        <Power className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <Wrench className="mr-1 h-3.5 w-3.5" />
                      )}
                      {d.status === "MAINTENANCE" ? "Kích hoạt" : "Bảo trì"}
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
        lockers={lockers}
        isSaving={createState.isLoading}
        onSubmit={async ({ lockerId, code }) => {
          try {
            await createDrone({ lockerId, code }).unwrap();
            toast.success(`Đã thêm drone ${code}`);
            setFormOpen(false);
          } catch (error) {
            toast.error("Không tạo được drone", {
              description: apiErrorMessage(error, "Dữ liệu drone chưa hợp lệ."),
            });
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
    <div className="rounded-xl border border-border/70 bg-background px-4 py-3 shadow-xs">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold leading-none ${color}`}>{value}</p>
    </div>
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
  lockers,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  lockers: LockerOption[];
  isSaving: boolean;
  onSubmit: (v: { lockerId: number; code: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [lockerId, setLockerId] = useState<string>("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setLockerId("");
    setTouched(false);
  }, [open]);

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
          <DialogTitle>Thêm drone</DialogTitle>
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
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
