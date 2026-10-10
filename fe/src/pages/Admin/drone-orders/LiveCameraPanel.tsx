import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
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

type PlayerState = DroneCameraMetadata["status"];

const stateLabel: Record<PlayerState, string> = {
  CONNECTING: "Đang kết nối",
  LIVE: "Trực tiếp",
  RECONNECTING: "Đang kết nối lại",
  OFFLINE: "Mất kết nối",
  UNAVAILABLE: "Chưa tích hợp camera",
  ERROR: "Lỗi luồng camera",
};

export function LiveCameraPanel({ order }: { order: DroneOrderTracking }) {
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
            <Camera className="h-4 w-4" /> Giám sát camera trực tiếp
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Dữ liệu thật từ drone; hệ thống không tạo ảnh hoặc trạng thái giả khi camera mất kết nối.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setReportOpen(true)}>
          <TriangleAlert className="mr-2 h-4 w-4" /> Báo rơi kiện
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
            Chưa có camera gateway cho {camera.droneCode}. Vẫn có thể báo sự cố thủ công và đính kèm ảnh thật.
            <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Thử kết nối lại</Button>
          </div>
        ) : (
          <video ref={videoRef} controls muted playsInline className="max-h-[420px] w-full bg-black" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
          <Radio className="mr-1 inline h-3 w-3 text-red-400" /> {stateLabel[playerState]}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <Telemetry label="Drone" value={camera.droneCode} />
        <Telemetry label="Pin" value={camera.batteryPercent == null || camera.batteryPercent < 0 ? "Không có dữ liệu" : `${camera.batteryPercent}%`} icon={<Battery />} />
        <Telemetry label="Chế độ bay" value={camera.flightMode || "Không có dữ liệu"} />
        <Telemetry label="GPS" value={camera.latitude && camera.longitude ? `${camera.latitude.toFixed(5)}, ${camera.longitude.toFixed(5)}` : "Không có dữ liệu"} icon={<MapPin />} />
        <Telemetry label="Telemetry" value={camera.telemetryLive ? "Trực tuyến" : "Cũ / mất kết nối"} />
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
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [report, { isLoading }] = useReportDroppedParcelMutation();
  const { upload, isUploading, reset } = useImageUpload("REPORT_EVIDENCE");

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do và tình huống quan sát được");
      return;
    }
    try {
      const uploaded = file ? (await upload([file]))[0] : undefined;
      await report({
        orderId: order.orderId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          reason: reason.trim(),
          latitude: camera?.telemetryLive ? camera.latitude : undefined,
          longitude: camera?.telemetryLive ? camera.longitude : undefined,
          cameraStatus: camera?.status ?? "UNAVAILABLE",
          cameraSnapshot: uploaded,
          snapshotCapturedAt: uploaded ? new Date().toISOString() : undefined,
        },
      }).unwrap();
      toast.success("Đã tạo sự cố rơi kiện", {
        description: "Đơn đã dừng giao; hệ thống đang điều phối kiểm tra drone và thu hồi kiện.",
      });
      setReason("");
      setFile(null);
      reset();
      onOpenChange(false);
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message;
      toast.error("Không thể báo rơi kiện", { description: message || "Vui lòng kiểm tra trạng thái chuyến bay và thử lại." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Xác nhận báo rơi kiện</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
            <Telemetry label="Đơn hàng" value={order.orderCode} />
            <Telemetry label="Drone" value={order.droneCode || "Chưa xác định"} />
            <Telemetry label="Chặng hiện tại" value={order.deliveryStage || "Không xác định"} />
            <Telemetry label="GPS" value={camera?.telemetryLive && camera.latitude && camera.longitude ? `${camera.latitude.toFixed(5)}, ${camera.longitude.toFixed(5)}` : "Không có GPS trực tuyến"} />
          </div>
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
            Xác nhận sẽ dừng luồng giao hiện tại và ngăn đơn được đánh dấu đã giao. RTL chỉ được yêu cầu khi telemetry và điều kiện an toàn hợp lệ.
          </p>
          <label className="block">
            <span className="mb-1.5 block font-medium">Lý do / mô tả quan sát *</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={4} className="w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary" placeholder="Ví dụ: camera cho thấy móc giữ mở ngoài ý muốn và kiện rơi khỏi drone..." />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-medium">Ảnh camera hoặc ảnh hiện trường (nếu có)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isUploading}>Hủy</Button>
            <Button variant="destructive" onClick={submit} disabled={isLoading || isUploading}>
              {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận báo rơi kiện
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
