import { useEffect, useState } from "react";
import { Wrench, AlertTriangle, UserCheck } from "lucide-react";
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
import { useCreateLockerReportMutation } from "~/stores/apis/admin/lockerOps";
import { useSetLockerMaintenanceMutation } from "~/stores/apis/admin/lockers";

export interface MaintenanceLockerTarget {
  id: number;
  code?: string | null;
  name?: string | null;
  assignedTechnicianId?: number | null;
  assignedTechnicianName?: string | null;
}

interface LockerMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locker: MaintenanceLockerTarget | null;
  onSuccess?: () => void;
}

/**
 * Dialog puts an ACTIVE locker into MAINTENANCE and optionally creates a blocking incident report
 * routed to the assigned locker technician (or all locker technicians if unassigned).
 */
export function LockerMaintenanceDialog({
  open,
  onOpenChange,
  locker,
  onSuccess,
}: LockerMaintenanceDialogProps) {
  const { t } = useTranslation();
  const [createReport, setCreateReport] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [submitReport, { isLoading: isCreatingReport }] = useCreateLockerReportMutation();
  const [setMaintenance, { isLoading: isSettingMaintenance }] = useSetLockerMaintenanceMutation();

  const lockerLabel = locker?.code || locker?.name || (locker ? `#${locker.id}` : "");
  const isSubmitting = isCreatingReport || isSettingMaintenance;

  useEffect(() => {
    if (!open || !locker) return;
    setCreateReport(true);
    setTitle(t("admin.lockers.maintenanceDialog.defaultTitle", { code: lockerLabel }));
    setDescription("");
  }, [open, locker?.id, lockerLabel, t]);

  const handleConfirm = async () => {
    if (!locker) return;
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (createReport && (!trimmedTitle || !trimmedDesc)) {
      toast.error(t("admin.lockers.maintenanceDialog.validationRequired"));
      return;
    }

    try {
      if (createReport) {
        const res = await submitReport({
          lockerId: locker.id,
          title: trimmedTitle,
          description: trimmedDesc,
          blocking: true,
          ticketType: "LOCKER_MAINTENANCE",
        }).unwrap();
        const reportId = res?.data?.id;
        toast.success(
          reportId
            ? t("admin.lockers.maintenanceDialog.createdReportSuccess", {
                id: reportId,
                code: lockerLabel,
              })
            : t("admin.lockers.toast.maintenanceOn")
        );
      } else {
        await setMaintenance({ id: locker.id, data: { maintenance: true } }).unwrap();
        toast.success(t("admin.lockers.toast.maintenanceOn"));
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message;
      toast.error(msg || t("admin.lockers.toast.maintenanceFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[500px]" data-tour="adm-locker-maint-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            {t("admin.lockers.maintenanceDialog.title", { code: lockerLabel })}
          </DialogTitle>
          <DialogDescription>
            {t("admin.lockers.maintenanceDialog.description", {
              name: locker?.name || lockerLabel,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div data-tour="adm-locker-maint-dialog-report" className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <Checkbox
              id="locker-maintenance-create-report"
              checked={createReport}
              onCheckedChange={(checked) => setCreateReport(checked === true)}
              disabled={isSubmitting}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="locker-maintenance-create-report"
                className="text-sm font-semibold leading-none cursor-pointer"
              >
                {t("admin.lockers.maintenanceDialog.createReportLabel")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("admin.lockers.maintenanceDialog.createReportHint")}
              </p>
            </div>
          </div>

          {createReport ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="locker-maintenance-title" className="text-xs font-medium">
                  {t("admin.lockers.maintenanceDialog.reportTitleLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="locker-maintenance-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("admin.lockers.maintenanceDialog.reportTitlePlaceholder")}
                  disabled={isSubmitting}
                  maxLength={160}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="locker-maintenance-desc" className="text-xs font-medium">
                  {t("admin.lockers.maintenanceDialog.reportDescLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="locker-maintenance-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("admin.lockers.maintenanceDialog.reportDescPlaceholder")}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <UserCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <span>
                  {locker?.assignedTechnicianName
                    ? t("admin.lockers.layout.routing.toTechnician", {
                        name: locker.assignedTechnicianName,
                      })
                    : t("admin.lockers.layout.routing.allTechnicians")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50/50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("admin.lockers.maintenanceDialog.noReportWarning")}</span>
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
            data-tour="adm-locker-maint-dialog-confirm"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || (createReport && (!title.trim() || !description.trim()))}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Wrench className="h-4 w-4 mr-1.5" />
            {isSubmitting
              ? t("admin.lockers.maintenanceDialog.submitting")
              : createReport
                ? t("admin.lockers.maintenanceDialog.confirmWithReport")
                : t("admin.lockers.maintenanceDialog.confirmOnly")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
