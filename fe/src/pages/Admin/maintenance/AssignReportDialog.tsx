import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserCheck, Boxes, AlertTriangle, CheckCircle2, User, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import {
  useAssignReportToTechnicianMutation,
  type LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import type { TechnicianSummary } from "./technician-detail";
import { isDroneReport } from "./maintenancePhotos";

interface AssignReportDialogProps {
  report: LockerReportResponse | null;
  technicians: TechnicianSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AssignReportDialog({
  report,
  technicians,
  open,
  onOpenChange,
  onSuccess,
}: AssignReportDialogProps) {
  const { t } = useTranslation();
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [assign, { isLoading }] = useAssignReportToTechnicianMutation();

  useEffect(() => {
    setSelectedTechId("");
  }, [report?.id]);

  if (!report) return null;

  // Server chỉ nhận đúng vai trò: phiếu drone ⇒ DRONE_TECHNICIAN, còn lại LOCKER_TECHNICIAN
  const isDroneIncident = isDroneReport(report);
  const requiredRole = isDroneIncident ? "DRONE_TECHNICIAN" : "LOCKER_TECHNICIAN";
  const hasRequiredRole = (tech: TechnicianSummary) =>
    (tech.roles ?? []).some((role) => role.replace(/^ROLE_/, "") === requiredRole);
  const eligibleTechnicians = technicians.filter(hasRequiredRole);

  const handleAssign = async () => {
    if (!selectedTechId) {
      toast.error(t("admin.maintenance.assign.selectRequired"));
      return;
    }
    const techId = Number(selectedTechId);
    const tech = technicians.find((item) => item.id === techId);

    try {
      await assign({
        reportId: report.id,
        technicianId: techId,
      }).unwrap();

      toast.success(t("admin.maintenance.assign.success", { id: report.id, name: tech?.fullName || `#${techId}` }), {
        description: t("admin.maintenance.assign.successDesc"),
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errMsg = err?.data?.message || err?.message;
      toast.error(t("admin.maintenance.assign.failed"), {
        description: errMsg || t("common.pleaseRetry"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            {t("admin.maintenance.assign.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isDroneIncident
              ? t("admin.maintenance.assign.descDrone")
              : t("admin.maintenance.assign.descKiosk")}
          </DialogDescription>
        </DialogHeader>

        {/* Report Summary Card */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">
              {t("admin.maintenance.reportLabel", { id: report.id, title: report.title })}
            </span>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
              {report.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{report.description}</p>
          <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-2">
            <span className="font-medium text-foreground">
              {report.lockerName ?? `Kiosk #${report.lockerId}`}
            </span>
            {report.boxNumber && <span>· {t("admin.maintenance.boxNumber", { number: report.boxNumber })}</span>}
          </div>
        </div>

        {/* Technician Selection */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-foreground block">
            {t("admin.maintenance.assign.chooseTech")}
          </label>
          <Select value={selectedTechId} onValueChange={setSelectedTechId}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder={t("admin.maintenance.assign.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {eligibleTechnicians.map((tech) => (
                <SelectItem key={tech.id} value={String(tech.id)} disabled={!tech.enabled}>
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="font-medium">{tech.fullName}</span>
                    <span className="text-muted-foreground text-[11px]">
                      ({tech.phoneNumber ? `${tech.phoneNumber}` : ""})
                    </span>
                    {isDroneIncident ? (
                      <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-purple-200">
                        {t("admin.maintenance.specialty.droneShort")}
                      </span>
                    ) : (
                      <span className="text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-sky-200">
                        {t("admin.maintenance.specialty.kioskShort")}
                      </span>
                    )}
                    {!tech.enabled && (
                      <span className="text-rose-500 text-[10px] font-semibold">
                        {t("admin.maintenance.assign.suspendedTag")}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {eligibleTechnicians.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  {t("admin.maintenance.assign.noEligible", { type: isDroneIncident ? "Drone" : "Kiosk" })}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3">
          <Button
            type="button"
            variant="outline"
            className="h-9 text-xs"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancelAction")}
          </Button>
          <Button
            type="button"
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
            onClick={handleAssign}
            disabled={isLoading || !selectedTechId}
          >
            <CheckCircle2 className="w-4 h-4" />
            {t("admin.maintenance.assign.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
