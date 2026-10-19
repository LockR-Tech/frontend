import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plane,
  Plus,
  RefreshCw,
  BatteryCharging,
  Loader2,
  Wrench,
  Power,
  UserCheck,
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
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { extractList } from "~/lib/extract-list";

// Giá trị là khoá i18n; dịch lúc render.
const STATUS_LABELS: Record<string, string> = {
  IDLE: "admin.drones.status.idle",
  RESERVED: "admin.drones.status.reserved",
  CHARGING: "admin.drones.status.charging",
  IN_FLIGHT: "admin.drones.status.inFlight",
  MAINTENANCE: "admin.drones.status.maintenance",
  FAULT: "admin.drones.status.fault",
};

const STATUS_FILTERS: { value: string | null; labelKey: string }[] = [
  { value: null, labelKey: "common.all" },
  { value: "IDLE", labelKey: "admin.drones.status.idle" },
  { value: "CHARGING", labelKey: "admin.drones.status.charging" },
  { value: "RESERVED", labelKey: "admin.drones.filter.reserved" },
  { value: "IN_FLIGHT", labelKey: "admin.drones.status.inFlight" },
  { value: "MAINTENANCE", labelKey: "admin.drones.status.maintenance" },
  { value: "FAULT", labelKey: "admin.drones.filter.fault" },
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isFetching, refetch } = useGetDronesQuery();
  const lockersQuery = useGetLockerStatsQuery();
  const usersQuery = useGetAllUsersQuery({ page: 0, size: 1000 });
  const [createDrone, createState] = useCreateDroneMutation();
  const [updateDroneStatus, statusState] = useUpdateDroneStatusMutation();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const technicianNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of extractList<{ id: number; fullName?: string; name?: string }>(usersQuery.data?.data)) {
      const name = (u.fullName || u.name || "").trim();
      if (name) m.set(u.id, name);
    }
    return m;
  }, [usersQuery.data]);

  const drones = useMemo(() => data?.data ?? [], [data]);
  // Drone chỉ đậu được ở Kiosk có bãi đáp
  const landingPadLockers = useMemo(
    () => (lockersQuery.data?.data ?? []).filter((locker) => locker.landingPad),
    [lockersQuery.data],
  );

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
      toast.warning(t("admin.drones.toast.busyTitle"), {
        description: t("admin.drones.toast.busyDescription"),
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
          ? t("admin.drones.toast.reactivated")
          : t("admin.drones.toast.maintenanceOn"),
      );
    } catch {
      toast.error(
        maintenanceEnabled
          ? t("admin.drones.toast.reactivateFailed")
          : t("admin.drones.toast.maintenanceFailed"),
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.drones.title")}
        description={t("admin.drones.description")}
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:max-w-2xl">
              <StatCard
                label={t("admin.drones.stats.total")}
                value={counts.total}
                color="text-primary"
              />
              <StatCard
                label={t("admin.drones.status.idle")}
                value={counts.idle}
                color="text-emerald-600"
              />
              <StatCard
                label={t("admin.drones.status.charging")}
                value={counts.charging}
                color="text-amber-600"
              />
              <StatCard
                label={t("admin.drones.filter.fault")}
                value={counts.fault}
                color="text-rose-600"
              />
            </div>
            <div className="flex shrink-0 gap-2 self-end xl:self-auto">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                {t("button.refresh")}
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> {t("admin.drones.add")}
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
                  key={filter.labelKey}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{t(filter.labelKey)}</span>
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
              ? t("admin.drones.empty")
              : t("admin.drones.emptyFiltered")}
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
                      {STATUS_LABELS[d.status] ? t(STATUS_LABELS[d.status]) : d.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {d.lockerName ??
                      (d.lockerId
                        ? t("admin.drones.card.lockerFallback", { id: d.lockerId })
                        : t("admin.drones.card.noLocker"))}
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

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                    <span>{t("admin.drones.card.assignee", { name: "" }).replace(/:\s*$/, "")}:</span>
                    {d.assignedTechnicianId ? (
                      <Link
                        to={`/admin/technicians/${d.assignedTechnicianId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-primary hover:underline hover:text-primary/80 transition-colors truncate"
                      >
                        {(d.assignedTechnicianId ? technicianNameById.get(d.assignedTechnicianId) : null) ||
                          (d.assignedTechnicianName && !d.assignedTechnicianName.startsWith("KTV #")
                            ? d.assignedTechnicianName
                            : null) ||
                          t("admin.lockers.table.technicianId", {
                            id: d.assignedTechnicianId,
                          })}
                      </Link>
                    ) : (
                      <span className="truncate">{d.assignedTechnicianName ?? t("admin.drones.card.noTechnician")}</span>
                    )}
                  </div>

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
                      {t("button.detail")}
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
                      {d.status === "MAINTENANCE"
                        ? t("dropdown.activate")
                        : t("dropdown.maintenance")}
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
        lockers={landingPadLockers}
        lockersLoading={lockersQuery.isLoading}
        isSaving={createState.isLoading}
        onSubmit={async ({ lockerId, code }) => {
          try {
            await createDrone({ lockerId, code }).unwrap();
            toast.success(t("admin.drones.toast.created", { code }));
            setFormOpen(false);
          } catch (error) {
            toast.error(t("admin.drones.toast.createFailed"), {
              description: apiErrorMessage(error, t("admin.drones.toast.invalidData")),
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
  lockersLoading,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  lockers: LockerOption[];
  lockersLoading: boolean;
  isSaving: boolean;
  onSubmit: (v: { lockerId: number; code: string }) => void;
}) {
  const { t } = useTranslation();
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
          <DialogTitle>{t("admin.drones.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-1.5 block text-xs">{t("admin.drones.form.codeLabel")}</Label>
            <Input
              placeholder="DRONE-01"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            {touched && !code.trim() && (
              <p className="mt-1 text-xs text-red-600">{t("admin.drones.form.codeRequired")}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">{t("admin.drones.form.homeLockerLabel")}</Label>
            <Select
              value={lockerId}
              onValueChange={setLockerId}
              disabled={lockers.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    lockersLoading
                      ? t("admin.drones.form.lockersLoading")
                      : lockers.length === 0
                        ? t("admin.drones.form.noLandingPadLockers")
                        : t("admin.drones.form.selectLocker")
                  }
                />
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
              <p className="mt-1 text-xs text-red-600">{t("admin.drones.form.lockerRequired")}</p>
            )}
            {!lockersLoading && lockers.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("admin.drones.form.noLandingPadHint")}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("admin.drones.form.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
