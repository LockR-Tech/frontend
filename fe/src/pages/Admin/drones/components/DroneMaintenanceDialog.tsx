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
import {
  useCreateDroneIncidentReportMutation,
  useUpdateDroneStatusMutation,
} from "~/stores/apis/admin/drones";

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
 * Dialog puts a Drone into MAINTENANCE and creates a DRONE_MAINTENANCE ticket
 * routed to the assigned drone technician (or all drone technicians if unassigned).
 */
export function DroneMaintenanceDialog({
  open,
  onOpenChange,
  drone,
  onSuccess,
}: DroneMaintenanceDialogProps) {
  const { t } = useTranslation();
  const [createReport, setCreateReport] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [createIncidentReport, { isLoading: isCreatingReport }] =
    useCreateDroneIncidentReportMutation();
  const [updateDroneStatus, { isLoading: isUpdatingStatus }] =
    useUpdateDroneStatusMutation();

  const droneLabel = drone?.code || (drone ? `#${drone.id}` : "");
  const isSubmitting = isCreatingReport || isUpdatingStatus;

  useEffect(() => {
    if (!open || !drone) return;
    setCreateReport(true);
    setTitle(t("admin.drones.maintenanceDialog.defaultTitle", { code: droneLabel }));
    setDescription("");
  }, [open, drone?.id, droneLabel, t]);

  const handleConfirm = async () => {
    if (!drone) return;
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (createReport && (!trimmedTitle || !trimmedDesc)) {
      toast.error(t("admin.drones.maintenanceDialog.validationRequired"));
      return;
    }

    try {
      if (createReport) {
        const res = await createIncidentReport({
          id: drone.id,
          title: trimmedTitle,
          description: trimmedDesc,
          ticketType: "DRONE_MAINTENANCE",
        }).unwrap();
        const reportId = res?.data?.id;
        toast.success(
          reportId
            ? t("admin.drones.maintenanceDialog.createdReportSuccess", {
                id: reportId,
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
              checked={createReport}
              onCheckedChange={(checked) => setCreateReport(checked === true)}
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

          {createReport ? (
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
            disabled={isSubmitting || (createReport && (!title.trim() || !description.trim()))}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Wrench className="h-4 w-4 mr-1.5" />
            {isSubmitting
              ? t("admin.drones.maintenanceDialog.submitting")
              : createReport
                ? t("admin.drones.maintenanceDialog.confirmWithReport")
                : t("admin.drones.maintenanceDialog.confirmOnly")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
