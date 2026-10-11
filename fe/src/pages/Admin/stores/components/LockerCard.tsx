import { useCallback, useEffect, useState } from "react";
import {
  Power,
  Wrench,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  Unlock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { apiGet, apiPut } from "~/utils/api";
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

/** LockerBoxSummary của GET /api/lockers/{lockerId}/boxes. */
interface LockerBoxSummary {
  lockerId: number;
  boxId: number;
  lockerCode?: string | null;
  boxNumber: number;
  status: string;
}

const toBoxInfo = (b: LockerBoxSummary): BoxInfo => ({
  id: b.boxId,
  boxNumber: b.boxNumber,
  status: b.status as BoxInfo["status"],
  description: "",
});

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export function LockerCard({ locker, onRefresh }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [selectedBox, setSelectedBox] = useState<BoxInfo | null>(null);
  const [showLockerSetting, setShowLockerSetting] = useState(false);
  const [showAddBox, setShowAddBox] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  // LockerResponse không kèm danh sách ô → tải riêng khi mở rộng thẻ.
  const [boxes, setBoxes] = useState<BoxInfo[] | null>(null);
  const [boxesLoading, setBoxesLoading] = useState(false);
  const [boxesError, setBoxesError] = useState<string | null>(null);

  const statusCfg =
    LOCKER_STATUS_CFG[locker.status] ??
    LOCKER_STATUS_CFG[LockerStatus.INACTIVE];
  const isActive = locker.status === LockerStatus.ACTIVE;
  const isMaintenance = locker.status === LockerStatus.MAINTENANCE;

  const loadBoxes = useCallback(async () => {
    setBoxesLoading(true);
    setBoxesError(null);
    try {
      const res = await apiGet<{ data: LockerBoxSummary[] }>(
        `/api/lockers/${locker.id}/boxes`,
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      setBoxes(
        list.map(toBoxInfo).sort((a, b) => a.boxNumber - b.boxNumber),
      );
    } catch (err) {
      setBoxesError(errorText(err, t("admin.stores.lockerCard.loadBoxesFailed")));
    } finally {
      setBoxesLoading(false);
    }
  }, [locker.id, t]);

  useEffect(() => {
    if (expanded && boxes === null && !boxesLoading && !boxesError) void loadBoxes();
  }, [expanded, boxes, boxesLoading, boxesError, loadBoxes]);

  const refreshAll = () => {
    onRefresh();
    if (boxes !== null) void loadBoxes();
  };

  const available = boxes
    ? boxes.filter((b) => b.status === BoxStatus.AVAILABLE).length
    : (locker.availableBoxes ?? 0);
  const total = boxes ? boxes.length : (locker.totalBoxes ?? 0);
  const usagePercent =
    total > 0 ? Math.round(((total - available) / total) * 100) : 0;
  const nextBoxNumber =
    (boxes && boxes.length > 0
      ? Math.max(...boxes.map((b) => b.boxNumber))
      : (locker.totalBoxes ?? 0)) + 1;

  // Không có PUT …/status cho tủ: đổi trạng thái qua PUT /api/admin/lockers/{id}
  // với đủ LockerRequest (updateLocker ghi đè mọi trường).
  const handleToggleActive = async () => {
    setActionLoading(true);
    try {
      await apiPut(`/api/admin/lockers/${locker.id}`, {
        storeId: locker.storeId,
        code: locker.code,
        name: locker.name,
        status: isActive ? LockerStatus.INACTIVE : LockerStatus.ACTIVE,
        address: locker.address ?? undefined,
        latitude: locker.latitude ?? undefined,
        longitude: locker.longitude ?? undefined,
      });
      toast.success(isActive ? t("admin.stores.lockerCard.turnedOff") : t("admin.stores.lockerCard.turnedOn"));
      onRefresh();
    } catch (err) {
      toast.error(t("admin.stores.lockerCard.toggleFailed"), {
        description: errorText(err, t("common.pleaseRetry")),
      });
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
      toast.success(
        isMaintenance
          ? t("admin.stores.lockerCard.maintenanceOff")
          : t("admin.stores.lockerCard.maintenanceOn"),
      );
      onRefresh();
    } catch (err) {
      toast.error(t("admin.stores.lockerCard.maintenanceFailed"), {
        description: errorText(err, t("common.pleaseRetry")),
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div
        className={`flex flex-col rounded-xl border border-border bg-card transition-all hover:border-slate-400 dark:hover:border-slate-600 ${
          actionLoading ? "opacity-60 pointer-events-none" : ""
        }`}
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
              {t(statusCfg.labelKey)}
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
              <Trans
                i18nKey="admin.stores.lockerCard.freeCount"
                values={{ available, total }}
                components={{ b: <span className="text-foreground font-semibold" /> }}
              />
            </span>
            <span className="text-muted-foreground/70">{usagePercent}%</span>
          </div>
          <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        {/* Action footer */}
        <div className="flex items-center border-t border-border/60 px-3 py-1.5 gap-1 mt-auto">
          <button
            title={isActive ? t("admin.stores.lockerCard.turnOff") : t("admin.stores.lockerCard.turnOn")}
            onClick={handleToggleActive}
            className={`rounded p-1.5 transition-colors ${
              isActive
                ? "text-emerald-600 hover:bg-emerald-500/10"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          <button
            title={
              isMaintenance
                ? t("admin.stores.lockerCard.endMaintenance")
                : t("admin.stores.lockerCard.startMaintenance")
            }
            onClick={handleToggleMaintenance}
            className={`rounded p-1.5 transition-colors ${
              isMaintenance
                ? "text-amber-600 hover:bg-amber-500/10"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
          </button>
          <button
            title={t("admin.stores.lockerCard.settings")}
            onClick={() => setShowLockerSetting(true)}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground rounded px-1.5 py-1 hover:bg-secondary transition-colors"
          >
            {expanded ? t("admin.stores.lockerCard.collapse") : t("admin.stores.lockerCard.viewBoxes")}
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          <button
            title={t("admin.stores.addBox.title")}
            onClick={() => {
              setExpanded(true);
              setShowAddBox(true);
            }}
            className="rounded p-1.5 text-foreground hover:bg-secondary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Expanded: Box grid */}
        {expanded && (
          <div className="px-3 pb-3 border-t border-border/60 pt-3">
            {boxesLoading && boxes === null ? (
              <div className="flex items-center justify-center py-3 text-xs text-muted-foreground gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("admin.stores.lockerCard.loadingBoxes")}
              </div>
            ) : boxesError ? (
              <div className="text-center py-2">
                <p className="text-xs text-destructive">{boxesError}</p>
                <button
                  onClick={() => void loadBoxes()}
                  className="mt-1 text-xs text-foreground underline"
                >
                  {t("common.retry")}
                </button>
              </div>
            ) : !boxes || boxes.length === 0 ? (
              <>
                <p className="text-xs text-muted-foreground/70 italic py-2 text-center">
                  {t("admin.stores.lockerCard.noBoxes")}
                </p>
                <button
                  onClick={() => setShowAddBox(true)}
                  className="w-full mt-1 flex items-center justify-center gap-1.5 text-xs text-foreground hover:bg-secondary py-2 rounded border border-dashed border-border transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("admin.stores.lockerCard.addFirstBox")}
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
                        {t(c.labelKey)}
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
                        title={t("admin.stores.lockerCard.boxTitle", {
                          number: box.boxNumber,
                          status: t(cfg.labelKey),
                        })}
                        onClick={() => setSelectedBox(box)}
                        className={`relative w-9 h-9 rounded border flex items-center justify-center text-xs font-bold transition-all cursor-pointer hover:shadow-sm ${cfg.bg} ${cfg.border} ${cfg.text}`}
                      >
                        {box.boxNumber}
                        {canOpen && (
                          <Unlock className="h-2 w-2 absolute top-0.5 right-0.5 text-amber-500" />
                        )}
                      </button>
                    );
                  })}
                  <button
                    title={t("admin.stores.lockerCard.addNewBox")}
                    onClick={() => setShowAddBox(true)}
                    className="w-9 h-9 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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
          onRefresh={refreshAll}
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
          defaultBoxNumber={nextBoxNumber}
          onClose={() => setShowAddBox(false)}
          onCreated={() => {
            onRefresh();
            void loadBoxes();
          }}
        />
      )}
    </>
  );
}
