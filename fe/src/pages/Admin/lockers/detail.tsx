import { useParams, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Box,
  MapPin,
  Store,
  CheckCircle2,
  XCircle,
  Wrench,
  WifiOff,
  Unlock,
  RefreshCw,
  History,
  AlertCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import { LockerStatus, BoxStatus } from "~/types/admin/enums";
import { useLockerDetail } from "./hooks/useLockerDetail";
import { BoxForceOpenModal } from "./components/BoxForceOpenModal";
import { useState } from "react";

const lockerStatusConfig: Record<
  LockerStatus,
  { labelKey: string; style: string; icon: React.ElementType }
> = {
  [LockerStatus.ACTIVE]: {
    labelKey: "admin.lockers.status.active",
    style: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  [LockerStatus.INACTIVE]: {
    labelKey: "admin.lockers.status.inactive",
    style: "bg-secondary text-muted-foreground border-border",
    icon: XCircle,
  },
  [LockerStatus.MAINTENANCE]: {
    labelKey: "admin.lockers.status.maintenance",
    style: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    icon: Wrench,
  },
  [LockerStatus.DISCONNECTED]: {
    labelKey: "admin.lockers.status.disconnected",
    style: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    icon: WifiOff,
  },
};

const boxStatusConfig: Record<
  BoxStatus,
  { labelKey: string; style: string; badge: string }
> = {
  [BoxStatus.AVAILABLE]: {
    labelKey: "admin.lockers.detail.boxStatus.available",
    style: "bg-card hover:bg-secondary/40 border-border text-foreground",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  [BoxStatus.OCCUPIED]: {
    labelKey: "admin.lockers.detail.boxStatus.occupied",
    style: "bg-secondary/70 hover:bg-secondary border-border/80 text-foreground",
    badge: "bg-secondary text-foreground border-border",
  },
  [BoxStatus.RESERVED]: {
    labelKey: "admin.lockers.boxStatus.reserved",
    style: "bg-secondary/40 hover:bg-secondary/60 border-border/60 text-foreground",
    badge: "bg-secondary text-muted-foreground border-border",
  },
  [BoxStatus.MAINTENANCE]: {
    labelKey: "admin.lockers.status.maintenance",
    style: "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-foreground",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
};

export default function LockerDetailPage() {
  const { lockerId } = useParams<{ lockerId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locker, isLoading, boxes, refreshBoxes } = useLockerDetail(lockerId);
  const [selectedBox, setSelectedBox] = useState<typeof boxes[0] | null>(null);
  const [isForceOpenModalOpen, setIsForceOpenModalOpen] = useState(false);

  const handleForceOpen = (boxId: number) => {
    toast.success(t("admin.lockers.detail.opened", { id: boxId }));
    setIsForceOpenModalOpen(false);
    setSelectedBox(null);
    setTimeout(() => refreshBoxes(), 1000);
  };

  const openForceOpenModal = (box: typeof boxes[0]) => {
    setSelectedBox(box);
    setIsForceOpenModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-48 bg-muted rounded animate-pulse" />
          <div className="lg:col-span-2 h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!locker) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
        <h3 className="mt-4 text-lg font-medium text-foreground">{t("admin.lockers.detail.notFound")}</h3>
        <Button onClick={() => navigate(-1)} className="mt-4" variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("button.back")}
        </Button>
      </div>
    );
  }

  const status = lockerStatusConfig[locker.status] ?? lockerStatusConfig[LockerStatus.INACTIVE];
  const StatusIcon = status.icon;

  const availableBoxes = boxes.filter((b) => b.status === BoxStatus.AVAILABLE).length;
  const occupiedBoxes = boxes.filter((b) => b.status === BoxStatus.OCCUPIED).length;
  const reservedBoxes = boxes.filter((b) => b.status === BoxStatus.RESERVED).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("admin.lockers.detail.title")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t("admin.lockers.detail.deviceCodeValue", { code: locker.code })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshBoxes} className="gap-1.5 h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            {t("button.refresh")}
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border/60">
            <StatusIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("admin.lockers.detail.statusLabel")}</span>
              <Badge variant="outline" className={`${status.style} text-xs font-semibold px-2 py-0.5 rounded`}>
                {t(status.labelKey)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("admin.lockers.detail.lastConnected", { time: locker.lastConnected || "N/A" })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Locker Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                {t("admin.lockers.detail.infoTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("admin.lockers.detail.name")}</p>
                <p className="font-semibold text-foreground">{locker.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("admin.lockers.detail.deviceCode")}</p>
                <p className="font-mono text-xs font-medium bg-secondary p-1.5 rounded border border-border/50">{locker.code}</p>
              </div>
              <Separator />
              <div className="flex items-start gap-2">
                <Store className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.location")}</p>
                  <p className="font-medium text-foreground">{locker.storeName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.address")}</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{locker.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Box Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                {t("admin.lockers.detail.statsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-secondary/60 border border-border/50 rounded-lg text-center">
                  <p className="text-xl font-bold text-foreground">{availableBoxes}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("admin.lockers.stats.availableBoxes")}</p>
                </div>
                <div className="p-3 bg-secondary/60 border border-border/50 rounded-lg text-center">
                  <p className="text-xl font-bold text-foreground">{occupiedBoxes}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("admin.lockers.detail.boxStatus.occupied")}</p>
                </div>
                <div className="p-3 bg-secondary/60 border border-border/50 rounded-lg text-center">
                  <p className="text-xl font-bold text-foreground">{reservedBoxes}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("admin.lockers.boxStatus.reserved")}</p>
                </div>
                <div className="p-3 bg-secondary/60 border border-border/50 rounded-lg text-center">
                  <p className="text-xl font-bold text-foreground">{boxes.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("admin.lockers.detail.total")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Boxes Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                {t("admin.lockers.detail.gridTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                {boxes.map((box) => {
                  const config = boxStatusConfig[box.status] ?? boxStatusConfig[BoxStatus.AVAILABLE];
                  return (
                    <div
                      key={box.id}
                      className={`relative p-2.5 rounded-lg border ${config.style} cursor-pointer hover:shadow-xs transition-all flex flex-col justify-between items-center min-h-[72px]`}
                      onClick={() => box.status === BoxStatus.OCCUPIED && openForceOpenModal(box)}
                    >
                      <div className="text-center w-full">
                        <p className="font-bold text-base tracking-tight">{box.number}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t(config.labelKey)}</p>
                      </div>
                      {box.status === BoxStatus.OCCUPIED && (
                        <div className="absolute top-1 right-1">
                          <Unlock className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      {box.orderId && (
                        <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate max-w-full">
                          #{box.orderId}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap gap-4 text-xs">
                {Object.entries(boxStatusConfig).map(([status, config]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`${config.badge} text-[11px] px-2 py-0.5`}>
                      {t(config.labelKey)}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-secondary/60 border border-border/60 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <Trans i18nKey="admin.lockers.detail.hint" components={{ b: <strong /> }} />
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Force Open Modal */}
      <BoxForceOpenModal
        isOpen={isForceOpenModalOpen}
        onClose={() => {
          setIsForceOpenModalOpen(false);
          setSelectedBox(null);
        }}
        box={selectedBox}
        onConfirm={handleForceOpen}
      />
    </div>
  );
}
