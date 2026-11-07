import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

const canUseCamera = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/// Chụp một ảnh bằng camera của máy (webcam quầy / camera sau trên máy tính bảng) ra File JPEG.
/// Trình duyệt không hỗ trợ camera thì không hiện gì — vẫn còn ô chọn ảnh bên cạnh.
export function WebcamCapture({ onCapture, disabled }: WebcamCaptureProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setReady(false);
    setOpen(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setOpen(true);
      // video mount sau khi open=true
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().then(() => setReady(true));
        }
      });
    } catch {
      setError(t("admin.storage.handOver.photo.cameraError"));
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `handover-${Date.now()}.jpg`, { type: "image/jpeg" }));
        stop();
      },
      "image/jpeg",
      0.9,
    );
  };

  if (!canUseCamera()) return null;

  if (!open) {
    return (
      <div className="space-y-1">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={start} disabled={disabled}>
          <Camera className="h-4 w-4" />
          {t("admin.storage.handOver.photo.openCamera")}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border bg-black">
        <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="gap-1.5" onClick={capture} disabled={!ready}>
          <Camera className="h-4 w-4" />
          {t("admin.storage.handOver.photo.capture")}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={stop}>
          <X className="h-4 w-4" />
          {t("button.cancel")}
        </Button>
      </div>
    </div>
  );
}
