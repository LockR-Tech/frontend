import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useTranslation } from "react-i18next";
import { Battery, Camera, Loader2, MapPin, Radio, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { useImageUpload } from "~/hooks/useImageUpload";
import {
  useGetDroneCameraQuery,
  useReportDroppedParcelMutation,
  type DroneCameraMetadata,
  type DroneOrderTracking,
} from "~/stores/apis/admin/droneOrders";
import { stageProgress } from "./journey";

type PlayerState = DroneCameraMetadata["status"];

// Giá trị là khoá i18n; dịch lúc render.
const stateLabel: Record<PlayerState, string> = {
  CONNECTING: "admin.droneOrders.camera.state.connecting",
  LIVE: "admin.droneOrders.camera.state.live",
  RECONNECTING: "admin.droneOrders.camera.state.reconnecting",
  OFFLINE: "common.disconnected",
  UNAVAILABLE: "admin.droneOrders.camera.state.unavailable",
  ERROR: "admin.droneOrders.camera.state.error",
};

export function LiveCameraPanel({ order }: { order: DroneOrderTracking }) {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useGetDroneCameraQuery(order.orderId, {
    pollingInterval: 10_000,
  });
  const camera = data?.data;
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <Card className="border-sky-200/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" /> {t("admin.droneOrders.camera.title")}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.droneOrders.camera.subtitle")}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setReportOpen(true)}>
          <TriangleAlert className="mr-2 h-4 w-4" /> {t("admin.droneOrders.camera.reportDrop")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !camera ? (
          <div className="flex h-52 items-center justify-center rounded-lg bg-slate-950 text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <CameraPlayer camera={camera} onRetry={refetch} />
        )}
      </CardContent>
      <ReportDropDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        order={order}
        camera={camera}
      />
    </Card>
  );
}

function CameraPlayer({ camera, onRetry }: { camera: DroneCameraMetadata; onRetry: () => void }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(camera.status);

  useEffect(() => setPlayerState(camera.status), [camera.status]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !camera.integrationAvailable || !camera.streamUrl) return;
    setPlayerState("CONNECTING");
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = camera.streamUrl;
      const live = () => setPlayerState("LIVE");
      const failed = () => setPlayerState("OFFLINE");
      video.addEventListener("playing", live);
      video.addEventListener("error", failed);
      void video.play().catch(() => setPlayerState("ERROR"));
      return () => {
        video.removeEventListener("playing", live);
        video.removeEventListener("error", failed);
        video.removeAttribute("src");
        video.load();
      };
    }
    if (!Hls.isSupported()) {
      setPlayerState("UNAVAILABLE");
      return;
    }
    const hls = new Hls({ liveSyncDurationCount: 2, enableWorker: true });
    hls.loadSource(camera.streamUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setPlayerState("LIVE");
      void video.play().catch(() => undefined);
    });
    hls.on(Hls.Events.ERROR, (_event, detail) => {
      if (!detail.fatal) return;
      setPlayerState("RECONNECTING");
      if (detail.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
      else if (detail.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      else {
        setPlayerState("ERROR");
        hls.destroy();
      }
    });
    return () => hls.destroy();
  }, [camera.integrationAvailable, camera.streamUrl]);

  const unavailable = !camera.integrationAvailable || !camera.streamUrl;
  return (
    <>
      <div className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-lg bg-slate-950">
        {unavailable ? (
          <div className="max-w-md p-6 text-center text-sm text-slate-300">
            <Camera className="mx-auto mb-3 h-9 w-9 opacity-50" />
            {t("admin.droneOrders.camera.noGateway", { drone: camera.droneCode })}
            <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>{t("admin.droneOrders.camera.reconnect")}</Button>
          </div>
        ) : (
          <video ref={videoRef} controls muted playsInline className="max-h-[420px] w-full bg-black" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
          <Radio className="mr-1 inline h-3 w-3 text-red-400" /> {t(stateLabel[playerState])}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <Telemetry label="Drone" value={camera.droneCode} />
        <Telemetry label={t("admin.droneOrders.camera.battery")} value={camera.batteryPercent == null || camera.batteryPercent < 0 ? t("common.noData") : `${camera.batteryPercent}%`} icon={<Battery />} />
        <Telemetry label={t("admin.droneOrders.camera.flightMode")} value={camera.flightMode || t("common.noData")} />
        <Telemetry label="GPS" value={camera.latitude && camera.longitude ? `${camera.latitude.toFixed(5)}, ${camera.longitude.toFixed(5)}` : t("common.noData")} icon={<MapPin />} />
        <Telemetry label="Telemetry" value={camera.telemetryLive ? t("admin.droneOrders.camera.online") : t("admin.droneOrders.camera.stale")} />
      </div>
    </>
  );
}

function Telemetry({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <p className="text-muted-foreground">{icon && <span className="mr-1 inline-flex [&>svg]:h-3 [&>svg]:w-3">{icon}</span>}{label}</p>
      <p className="mt-1 truncate font-medium" title={value}>{value}</p>
    </div>
  );
}

function ReportDropDialog({
  open,
  onOpenChange,
  order,
  camera,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: DroneOrderTracking;
  camera?: DroneCameraMetadata;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [report, { isLoading }] = useReportDroppedParcelMutation();
  const { upload, isUploading, reset } = useImageUpload("REPORT_EVIDENCE");

  const src = order.sourceLocker;
  const dst = order.destinationLocker;
  const progress = stageProgress(order.deliveryStage) ?? 0.5;
  const routeLat = src?.latitude != null && dst?.latitude != null
    ? src.latitude + (dst.latitude - src.latitude) * progress
    : undefined;
  const routeLng = src?.longitude != null && dst?.longitude != null
    ? src.longitude + (dst.longitude - src.longitude) * progress
    : undefined;
  const isLiveGps = !!(camera?.telemetryLive && camera.latitude && camera.longitude);
  const effectiveLat = isLiveGps ? camera.latitude : routeLat;
  const effectiveLng = isLiveGps ? camera.longitude : routeLng;

  const submit = async () => {
    if (!reason.trim()) {
      toast.error(t("admin.droneOrders.reportDrop.reasonRequired"));
      return;
    }
    try {
      const uploaded = file ? (await upload([file]))[0] : undefined;
      await report({
        orderId: order.orderId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          reason: reason.trim(),
          latitude: effectiveLat,
          longitude: effectiveLng,
          cameraStatus: camera?.status ?? "UNAVAILABLE",
          cameraSnapshot: uploaded,
          snapshotCapturedAt: uploaded ? new Date().toISOString() : undefined,
        },
      }).unwrap();
      toast.success(t("admin.droneOrders.reportDrop.success"), {
        description: t("admin.droneOrders.reportDrop.successHint"),
      });
      setReason("");
      setFile(null);
      reset();
      onOpenChange(false);
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message;
      toast.error(t("admin.droneOrders.reportDrop.failed"), { description: message || t("admin.droneOrders.reportDrop.failedHint") });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>{t("admin.droneOrders.reportDrop.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
            <Telemetry label={t("common.order")} value={order.orderCode} />
            <Telemetry label="Drone" value={order.droneCode || t("admin.droneOrders.undetermined")} />
            <Telemetry label={t("admin.droneOrders.map.currentStage")} value={order.deliveryStage || t("admin.droneOrders.reportDrop.unknown")} />
            <Telemetry
              label="GPS"
              value={
                effectiveLat != null && effectiveLng != null
                  ? `${effectiveLat.toFixed(5)}, ${effectiveLng.toFixed(5)}${isLiveGps ? " (Trực tiếp)" : " (Hành trình bay)"}`
                  : t("admin.droneOrders.reportDrop.noLiveGps")
              }
            />
          </div>
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
            {t("admin.droneOrders.reportDrop.warning")}
          </p>
          <label className="block">
            <span className="mb-1.5 block font-medium">{t("admin.droneOrders.reportDrop.reasonLabel")}</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={4} className="w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary" placeholder={t("admin.droneOrders.reportDrop.reasonPlaceholder")} />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-medium">{t("admin.droneOrders.reportDrop.photoLabel")}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isUploading}>{t("button.cancel")}</Button>
            <Button variant="destructive" onClick={submit} disabled={isLoading || isUploading}>
              {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("admin.droneOrders.reportDrop.title")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
