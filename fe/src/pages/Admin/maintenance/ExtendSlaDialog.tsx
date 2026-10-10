import { useState } from "react";
import { Clock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { formatDateTime, parseBackendDateTime } from "~/lib/datetime";
import { useExtendReportSlaMutation, type LockerReportResponse } from "~/stores/apis/admin/lockerOps";

const COMMON_REASONS = [
  "Chờ linh kiện thay thế từ kho trung tâm",
  "Sự cố bo mạch phức tạp cần đo kiểm chuyên sâu",
  "Thời tiết mưa gió xấu không thể thử nghiệm bay Drone",
  "Kẹt cơ khí nặng cần công cụ can thiệp chuyên dụng",
  "Khu vực đặt Kiosk tạm thời phong tỏa sửa chữa mặt bằng",
];

const PRESET_HOURS = [
  { label: "+2 giờ", hours: 2 },
  { label: "+4 giờ", hours: 4 },
  { label: "+8 giờ", hours: 8 },
  { label: "+1 ngày (24h)", hours: 24 },
  { label: "+2 ngày (48h)", hours: 48 },
];

export function ExtendSlaDialog({
  report,
  open,
  onOpenChange,
  onSuccess,
}: {
  report: LockerReportResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated?: LockerReportResponse) => void;
}) {
  const [selectedHours, setSelectedHours] = useState<number>(4);
  const [customHours, setCustomHours] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [extendSla, { isLoading: isSubmitting }] = useExtendReportSlaMutation();

  if (!report) return null;

  const usingCustom = customHours.trim() !== "";
  const customValue = Number(customHours);
  const customValid = Number.isInteger(customValue) && customValue >= 1;
  const effectiveHours = usingCustom ? (customValid ? customValue : 0) : selectedHours;

  // Chỉ là ước tính hiển thị — giống cách server tính: quá hạn thì cộng từ bây giờ. Mốc thật lấy từ phản hồi.
  const now = Date.now();
  const currentDue = parseBackendDateTime(report.slaDueAt);
  const baseMs = currentDue && currentDue.getTime() > now ? currentDue.getTime() : now;
  const previewDue = effectiveHours > 0 ? new Date(baseMs + effectiveHours * 3600 * 1000) : null;

  const handleSelectPreset = (hrs: number) => {
    setSelectedHours(hrs);
    setCustomHours("");
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Vui lòng cung cấp lý do gia hạn SLA!");
      return;
    }
    if (effectiveHours < 1) {
      toast.error("Số giờ gia hạn phải là số nguyên từ 1 trở lên");
      return;
    }

    try {
      const res = await extendSla({
        reportId: report.id,
        data: { extensionHours: effectiveHours, reason: reason.trim() },
      }).unwrap();
      const updated = res?.data;
      toast.success(`Đã gia hạn SLA (+${effectiveHours} giờ)`, {
        description: updated?.slaDueAt
          ? `Hạn hoàn tất mới cho phiếu RPT-${report.id}: ${formatDateTime(updated.slaDueAt)}.`
          : `Phiếu RPT-${report.id} đã được gia hạn.`,
      });
      onOpenChange(false);
      onSuccess?.(updated);
    } catch (err: any) {
      // Giữ hộp thoại để admin thử lại; không ghi nhận gì phía client khi server từ chối
      toast.error("Không gia hạn được SLA", {
        description: err?.data?.message || err?.message || "Vui lòng thử lại.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl p-5">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-amber-600" />
            Gia hạn thời gian xử lý sự cố (SLA)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Phiếu RPT-{report.id} · {report.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Hạn hiện tại vs hạn dự kiến sau gia hạn */}
          <div className="p-3 rounded-lg border border-border/70 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hạn SLA hiện tại:</span>
              <span className="font-mono text-muted-foreground">
                {report.slaDueAt ? formatDateTime(report.slaDueAt) : "—"}
              </span>
            </div>
            {(report.slaExtendedHours ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Đã gia hạn trước đó:</span>
                <span className="font-mono text-muted-foreground">+{report.slaExtendedHours}h</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hạn mới (dự kiến):
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {previewDue ? formatDateTime(previewDue) : "—"}
              </span>
            </div>
          </div>

          {/* Mức gia hạn nhanh + số giờ tuỳ chọn */}
          <div>
            <Label className="block text-xs font-semibold mb-1.5 text-foreground">
              Chọn mức thời gian gia hạn thêm:
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESET_HOURS.map((preset) => (
                <Button
                  key={preset.hours}
                  type="button"
                  variant={selectedHours === preset.hours && !usingCustom ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectPreset(preset.hours)}
                  className={`h-8 text-xs font-medium ${
                    selectedHours === preset.hours && !usingCustom
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "border-border/80 text-foreground"
                  }`}
                >
                  {preset.label}
                </Button>
              ))}
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                placeholder="Số giờ khác"
                aria-label="Số giờ gia hạn tuỳ chọn"
                className={`h-8 text-xs ${usingCustom ? (customValid ? "border-amber-500 ring-1 ring-amber-400" : "border-rose-400") : ""}`}
              />
            </div>
            {usingCustom && !customValid && (
              <p className="text-[11px] text-rose-600 mt-1">Nhập số nguyên từ 1 giờ trở lên.</p>
            )}
          </div>

          {/* Lý do gia hạn */}
          <div>
            <Label className="block text-xs font-semibold mb-1.5 text-foreground">
              Lý do gia hạn SLA phổ biến:
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(r)}
                  className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground border border-border/60 transition-colors text-left"
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập chi tiết hoàn cảnh sự cố hoặc khó khăn kỹ thuật khiến việc hoàn tất cần thêm thời gian..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Hạn mới do máy chủ tính (phiếu đã quá hạn thì cộng từ thời điểm gia hạn) và được ghi vào nhật ký xử lý của phiếu.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim() || effectiveHours < 1}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
            Xác nhận gia hạn SLA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
