import { useState } from "react";
import {
  Power,
  Wrench,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  Unlock,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { apiPut } from "~/utils/api";
import type { AdminLockerResponse, BoxInfo } from "~/types/admin/locker";
import { BoxStatus, LockerStatus } from "~/types/admin/enums";
import { BOX_CFG, LOCKER_STATUS_CFG } from "./lockerConstants";
import { LockerSettingModal } from "./LockerSettingModal";
import { BoxSettingModal } from "./BoxSettingModal";
import { AddBoxModal } from "./AddBoxModal";

interface Props {
  locker: AdminLockerResponse;
  onRefresh: () => void;
}

export function LockerCard({ locker, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selectedBox, setSelectedBox] = useState<BoxInfo | null>(null);
  const [showLockerSetting, setShowLockerSetting] = useState(false);
  const [showAddBox, setShowAddBox] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const statusCfg =
    LOCKER_STATUS_CFG[locker.status] ??
    LOCKER_STATUS_CFG[LockerStatus.INACTIVE];
  const isActive = locker.status === LockerStatus.ACTIVE;
  const isMaintenance = locker.status === LockerStatus.MAINTENANCE;

  const boxes = locker.boxes ?? [];
  const available =
    boxes.filter((b) => b.status === BoxStatus.AVAILABLE).length ||
    locker.availableBoxes ||
    0;
  const total = boxes.length || locker.totalBoxes || 0;
  const usagePercent =
    total > 0 ? Math.round(((total - available) / total) * 100) : 0;

  const handleToggleActive = async () => {
    setActionLoading(true);
    try {
      await apiPut(`/api/admin/lockers/${locker.id}/status`, {
        status: isActive ? LockerStatus.INACTIVE : LockerStatus.ACTIVE,
      });
      onRefresh();
    } catch {
      alert("Không thể thay đổi trạng thái tủ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    setActionLoading(true);
    try {
      await apiPut(`/api/admin/lockers/${locker.id}/maintenance`, {
        maintenance: !isMaintenance,
      });
      onRefresh();
    } catch {
      alert("Không thể thay đổi trạng thái bảo trì");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div
        className={`flex flex-col rounded-xl border bg-white transition-all hover:shadow-md ${
          isActive ? "border-green-200" : "border-border/50"
        } ${actionLoading ? "opacity-60 pointer-events-none" : ""}`}
      >
        {/* Card header */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${statusCfg.dot}`}
              />
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {locker.name}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 shrink-0 ${statusCfg.badge}`}
            >
              {statusCfg.label}
            </Badge>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/70 truncate pl-3.5">
            {locker.code}
            {locker.address ? ` · ${locker.address}` : ""}
          </p>
        </div>

        {/* Stats row */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">
              <span className="text-green-600 font-bold">{available}</span>/
              {total} trống
            </span>
            <span className="text-muted-foreground/70">{usagePercent}%</span>
          </div>
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent > 80
                  ? "bg-red-400"
                  : usagePercent > 50
                    ? "bg-orange-400"
                    : "bg-green-400"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        {/* Action footer */}
        <div className="flex items-center border-t px-3 py-1.5 gap-1 mt-auto">
          <button
            title={isActive ? "Tắt tủ" : "Bật tủ"}
            onClick={handleToggleActive}
            className={`rounded p-1.5 transition-colors ${
              isActive
                ? "text-green-600 hover:bg-green-50"
                : "text-muted-foreground/70 hover:bg-muted"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          <button
            title={isMaintenance ? "Hủy bảo trì" : "Đặt bảo trì"}
            onClick={handleToggleMaintenance}
            className={`rounded p-1.5 transition-colors ${
              isMaintenance
                ? "text-yellow-500 hover:bg-yellow-50"
                : "text-muted-foreground/70 hover:bg-muted"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
          </button>
          <button
            title="Cài đặt tủ"
            onClick={() => setShowLockerSetting(true)}
            className="rounded p-1.5 text-muted-foreground/70 hover:text-foreground/80 hover:bg-muted transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-blue-600 rounded px-1.5 py-1 hover:bg-blue-50 transition-colors"
          >
            {expanded ? "Thu gọn" : "Xem ngăn"}
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          <button
            title="Thêm ngăn tủ"
            onClick={() => {
              setExpanded(true);
              setShowAddBox(true);
            }}
            className="rounded p-1.5 text-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Expanded: Box grid */}
        {expanded && (
          <div className="px-3 pb-3 border-t pt-3">
            {boxes.length === 0 ? (
              <>
                <p className="text-xs text-muted-foreground/70 italic py-2 text-center">
                  Chưa có ngăn tủ nào
                </p>
                <button
                  onClick={() => setShowAddBox(true)}
                  className="w-full mt-1 flex items-center justify-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 py-2 rounded border border-dashed border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm ngăn đầu tiên
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-2 items-center">
                  {Object.entries(BOX_CFG).map(([s, c]) => (
                    <div key={s} className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-sm border ${c.bg} ${c.border}`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {boxes.map((box) => {
                    const cfg =
                      BOX_CFG[box.status] ?? BOX_CFG[BoxStatus.MAINTENANCE];
                    const canOpen = box.status === BoxStatus.OCCUPIED;
                    return (
                      <button
                        key={box.id}
                        title={`Ngăn #${box.boxNumber} — ${cfg.label} (nhấn để chỉnh)`}
                        onClick={() => setSelectedBox(box)}
                        className={`relative w-9 h-9 rounded border flex items-center justify-center text-xs font-bold transition-all cursor-pointer hover:shadow-md hover:scale-105 ${cfg.bg} ${cfg.border} ${cfg.text}`}
                      >
                        {box.boxNumber}
                        {canOpen && (
                          <Unlock className="h-2 w-2 absolute top-0.5 right-0.5 text-orange-400" />
                        )}
                      </button>
                    );
                  })}
                  <button
                    title="Thêm ngăn mới"
                    onClick={() => setShowAddBox(true)}
                    className="w-9 h-9 rounded border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-400 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {selectedBox && (
        <BoxSettingModal
          box={selectedBox}
          lockerName={locker.name}
          onClose={() => setSelectedBox(null)}
          onRefresh={onRefresh}
        />
      )}

      {showLockerSetting && (
        <LockerSettingModal
          locker={locker}
          onClose={() => setShowLockerSetting(false)}
          onRefresh={onRefresh}
        />
      )}

      {showAddBox && (
        <AddBoxModal
          lockerId={locker.id}
          existingCount={boxes.length}
          onClose={() => setShowAddBox(false)}
          onCreated={onRefresh}
        />
      )}
    </>
  );
}
