import { useState } from "react";
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
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [assign, { isLoading }] = useAssignReportToTechnicianMutation();

  if (!report) return null;

  const handleAssign = async () => {
    if (!selectedTechId) {
      toast.error("Vui lòng chọn kỹ thuật viên để phân công!");
      return;
    }
    const techId = Number(selectedTechId);
    const tech = technicians.find((t) => t.id === techId);

    try {
      await assign({
        reportId: report.id,
        technicianId: techId,
      }).unwrap();

      toast.success(`Đã phân công phiếu #${report.id} cho KTV ${tech?.fullName || `#${techId}`}`, {
        description: "Thông báo điều phối đã được gửi đến ứng dụng di động của kỹ thuật viên.",
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errMsg = err?.data?.message || err?.message;
      toast.error("Không thể phân công phiếu sự cố", {
        description:
          errMsg ||
          "Máy chủ backend chưa cập nhật endpoint phân công mới. Kỹ thuật viên có thể bấm 'Nhận việc' trực tiếp từ ứng dụng Mobile.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Phân công Kỹ thuật viên xử lý sự cố
          </DialogTitle>
          <DialogDescription className="text-xs">
            Giao phiếu sự cố Kiosk cho nhân sự kỹ thuật tiếp nhận và khắc phục tại hiện trường
          </DialogDescription>
        </DialogHeader>

        {/* Report Summary Card */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">
              Phiếu #{report.id} · {report.title}
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
            {report.boxNumber && <span>· Ô #{report.boxNumber}</span>}
          </div>
        </div>

        {/* Technician Selection */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-foreground block">
            Chọn Kỹ thuật viên phụ trách:
          </label>
          <Select value={selectedTechId} onValueChange={setSelectedTechId}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="-- Chọn kỹ thuật viên sẵn sàng --" />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={String(t.id)} disabled={!t.enabled}>
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="font-medium">{t.fullName}</span>
                    <span className="text-muted-foreground text-[11px]">
                      (#{t.id} {t.phoneNumber ? `· ${t.phoneNumber}` : ""})
                    </span>
                    {t.specialty === "KIOSK" ? (
                      <span className="text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-sky-200">
                        KTV Kiosk
                      </span>
                    ) : (
                      <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-purple-200">
                        KTV Drone
                      </span>
                    )}
                    {!t.enabled && (
                      <span className="text-rose-500 text-[10px] font-semibold">
                        [Đã đình chỉ]
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
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
            Hủy bỏ
          </Button>
          <Button
            type="button"
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
            onClick={handleAssign}
            disabled={isLoading || !selectedTechId}
          >
            <CheckCircle2 className="w-4 h-4" />
            Xác nhận phân công
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
