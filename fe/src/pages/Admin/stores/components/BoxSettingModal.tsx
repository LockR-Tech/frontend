import { useState } from "react";
import { Unlock, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { apiPut, apiPost } from "~/utils/api";
import type { BoxInfo } from "~/types/admin/locker";
import { BoxStatus } from "~/types/admin/enums";
import { BOX_CFG } from "./lockerConstants";

// ─── Force-Open confirmation modal ──────────────────────────────────────────
interface ForceOpenProps {
  box: BoxInfo;
  lockerName: string;
  onClose: () => void;
  onConfirm: () => void;
}

function ForceOpenModal({
  box,
  lockerName,
  onClose,
  onConfirm,
}: ForceOpenProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Unlock className="h-5 w-5" />
            Mở ngăn khẩn cấp
          </DialogTitle>
          <DialogDescription>
            Hành động này sẽ được ghi lại trong nhật ký hệ thống.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center font-bold text-orange-600 text-lg">
              {box.boxNumber}
            </div>
            <div>
              <p className="font-semibold">
                Ngăn #{box.boxNumber} — {lockerName}
              </p>
              {box.description && (
                <p className="text-sm text-muted-foreground">{box.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-700">
              Lệnh mở tủ sẽ được gửi qua MQTT đến thiết bị. Đảm bảo có nhân viên
              tại chỗ trước khi thực hiện.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Unlock className="mr-2 h-4 w-4" />
            Xác nhận mở
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Box Setting modal ───────────────────────────────────────────────────────
interface Props {
  box: BoxInfo;
  lockerName: string;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS = [
  { value: BoxStatus.AVAILABLE, label: "● Trống" },
  { value: BoxStatus.OCCUPIED, label: "● Có đồ" },
  { value: BoxStatus.RESERVED, label: "● Đã đặt" },
  { value: BoxStatus.MAINTENANCE, label: "● Bảo trì" },
];

export function BoxSettingModal({
  box,
  lockerName,
  onClose,
  onRefresh,
}: Props) {
  const [status, setStatus] = useState<string>(box.status);
  const [saving, setSaving] = useState(false);
  const [confirmForceOpen, setConfirmForceOpen] = useState(false);

  const cfg = BOX_CFG[status] ?? BOX_CFG[BoxStatus.MAINTENANCE];

  const handleSaveStatus = async () => {
    if (status === box.status) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await apiPut(`/api/admin/lockers/boxes/${box.id}/status`, { status });
      onRefresh();
      onClose();
    } catch {
      alert("Không thể cập nhật trạng thái ngăn");
    } finally {
      setSaving(false);
    }
  };

  const handleForceOpen = async () => {
    try {
      await apiPost(`/api/maintenance/boxes/${box.id}/force-open`, {});
      setConfirmForceOpen(false);
      onRefresh();
      onClose();
    } catch {
      alert("Không thể gửi lệnh mở tủ");
      setConfirmForceOpen(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded border flex items-center justify-center text-sm font-bold ${cfg.bg} ${cfg.border} ${cfg.text}`}
              >
                {box.boxNumber}
              </div>
              Ngăn #{box.boxNumber} — {lockerName}
            </DialogTitle>
            {box.description && (
              <DialogDescription>{box.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div
              className={`rounded-lg border px-3 py-2.5 flex items-center gap-2 ${cfg.bg} ${cfg.border}`}
            >
              <span className={`text-xs font-semibold ${cfg.text}`}>
                Trạng thái hiện tại:
              </span>
              <span className={`text-sm font-bold ${cfg.text}`}>
                {BOX_CFG[box.status]?.label ?? box.status}
              </span>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                Đổi trạng thái
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const optCfg = BOX_CFG[opt.value];
                  const isSelected = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        isSelected
                          ? `${optCfg.bg} ${optCfg.border} ${optCfg.text} ring-2 ring-offset-1 ring-current`
                          : "bg-background border-border/50 text-muted-foreground hover:border-border/70"
                      }`}
                    >
                      {optCfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {box.status === BoxStatus.OCCUPIED && (
              <div className="pt-1 border-t">
                <p className="text-xs text-muted-foreground mb-2">Thao tác khẩn cấp</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
                  onClick={() => setConfirmForceOpen(true)}
                >
                  <Unlock className="mr-2 h-3.5 w-3.5" />
                  Mở ngăn khẩn cấp
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveStatus}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmForceOpen && (
        <ForceOpenModal
          box={box}
          lockerName={lockerName}
          onClose={() => setConfirmForceOpen(false)}
          onConfirm={handleForceOpen}
        />
      )}
    </>
  );
}
