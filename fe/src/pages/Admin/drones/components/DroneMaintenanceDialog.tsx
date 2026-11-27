import { useEffect, useState } from "react";
import { AlertTriangle, UserCheck, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useUpdateDroneStatusMutation } from "~/stores/apis/admin/drones";
import { useCreateMaintenanceScheduleMutation } from "~/stores/apis/admin/lockerOps";

export interface MaintenanceDroneTarget {
  id: number;
  code: string;
  assignedTechnicianId?: number | null;
  assignedTechnicianName?: string | null;
}

interface DroneMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drone: MaintenanceDroneTarget | null;
  onSuccess?: () => void;
}

/**
 * Dialog puts a Drone into MAINTENANCE and optionally creates a Drone MaintenanceSchedule
 * (shown under /admin/maintenance -> Kế hoạch bảo trì -> Tab Drone).
 */
export function DroneMaintenanceDialog({
  open,
  onOpenChange,
  drone,
  onSuccess,
}: DroneMaintenanceDialogProps) {
  const { t } = useTranslation();
  const [createScheduleFlag, setCreateScheduleFlag] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [intervalDays, setIntervalDays] = useState(0);
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "URGENT">("HIGH");

  const [createSchedule, { isLoading: isCreatingSchedule }] =
    useCreateMaintenanceScheduleMutation();
  const [updateDroneStatus, { isLoading: isUpdatingStatus }] =
    useUpdateDroneStatusMutation();

  const droneLabel = drone?.code || (drone ? `#${drone.id}` : "");
  const isSubmitting = isCreatingSchedule || isUpdatingStatus;

  useEffect(() => {
    if (!open || !drone) return;
    setCreateScheduleFlag(true);
    setTitle(t("admin.drones.maintenanceDialog.defaultTitle", { code: droneLabel }));
    setDescription("");
    setIntervalDays(0);
    setPriority("HIGH");
  }, [open, drone?.id, droneLabel, t]);

  const handleConfirm = async () => {
    if (!drone) return;
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (createScheduleFlag && (!trimmedTitle || !trimmedDesc)) {
      toast.error(t("admin.drones.maintenanceDialog.validationRequired"));
      return;
    }

    try {
      if (createScheduleFlag) {
        const res = await createSchedule({
          droneUnitId: drone.id,
          title: trimmedTitle,
          description: trimmedDesc,
          intervalDays,
          priority,
          assignedTechnicianId: drone.assignedTechnicianId ?? undefined,
          firstDueDate: new Date().toISOString(),
          putInMaintenance: true,
        }).unwrap();
        const scheduleId = res?.data?.id;
        toast.success(
          scheduleId
            ? t("admin.drones.maintenanceDialog.createdReportSuccess", {
                id: scheduleId,
                code: droneLabel,
              })
            : t("admin.drones.toast.maintenanceOn"),
        );
      } else {
        await updateDroneStatus({
          id: drone.id,
          status: "MAINTENANCE",
          reason: trimmedDesc || undefined,
        }).unwrap();
        toast.success(t("admin.drones.toast.maintenanceOn"));
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message;
      toast.error(msg || t("admin.drones.toast.maintenanceFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            {t("admin.drones.maintenanceDialog.title", { code: droneLabel })}
          </DialogTitle>
          <DialogDescription>
            {t("admin.drones.maintenanceDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <Checkbox
              id="drone-maintenance-create-report"
              checked={createScheduleFlag}
              onCheckedChange={(checked) => setCreateScheduleFlag(checked === true)}
              disabled={isSubmitting}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="drone-maintenance-create-report"
                className="text-sm font-semibold leading-none cursor-pointer"
              >
                {t("admin.drones.maintenanceDialog.createReportLabel")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("admin.drones.maintenanceDialog.createReportHint")}
              </p>
            </div>
          </div>

          {createScheduleFlag ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="drone-maintenance-title" className="text-xs font-medium">
                  {t("admin.drones.maintenanceDialog.reportTitleLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="drone-maintenance-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("admin.drones.maintenanceDialog.reportTitlePlaceholder")}
                  disabled={isSubmitting}
                  maxLength={160}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="drone-maintenance-desc" className="text-xs font-medium">
                  {t("admin.drones.maintenanceDialog.reportDescLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="drone-maintenance-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("admin.drones.maintenanceDialog.reportDescPlaceholder")}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="drone-maintenance-interval" className="text-xs font-medium">
                    {t("admin.drones.maintenanceDialog.intervalLabel")}
                  </Label>
                  <select
                    id="drone-maintenance-interval"
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(Number(e.target.value))}
                    disabled={isSubmitting}
                  >
                    <option value={0}>{t("admin.drones.maintenanceDialog.oneTimeOption")}</option>
                    <option value={7}>{t("admin.drones.maintenanceDialog.recurringEveryDays", { days: 7 })}</option>
                    <option value={14}>{t("admin.drones.maintenanceDialog.recurringEveryDays", { days: 14 })}</option>
                    <option value={30}>{t("admin.drones.maintenanceDialog.recurringEveryDays", { days: 30 })}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="drone-maintenance-priority" className="text-xs font-medium">
                    {t("admin.drones.maintenanceDialog.priorityLabel")}
                  </Label>
                  <select
                    id="drone-maintenance-priority"
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "NORMAL" | "HIGH" | "URGENT")}
                    disabled={isSubmitting}
                  >
                    <option value="NORMAL">{t("admin.maintenance.schedules.priority.normal")}</option>
                    <option value="HIGH">{t("admin.maintenance.schedules.priority.high")}</option>
                    <option value="URGENT">{t("admin.maintenance.schedules.priority.urgent")}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <UserCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <span>
                  {drone?.assignedTechnicianName
                    ? t("admin.drones.maintenanceDialog.routingToTechnician", {
                        name: drone.assignedTechnicianName,
                      })
                    : t("admin.drones.maintenanceDialog.routingAllTechnicians")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50/50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("admin.drones.maintenanceDialog.noReportWarning")}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || (createScheduleFlag && (!title.trim() || !description.trim()))}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Wrench className="h-4 w-4 mr-1.5" />
            {isSubmitting
              ? t("admin.drones.maintenanceDialog.submitting")
              : createScheduleFlag
                ? t("admin.drones.maintenanceDialog.confirmWithReport")
                : t("admin.drones.maintenanceDialog.confirmOnly")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
