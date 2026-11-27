import { useState } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker } from "react-leaflet";
import { ExternalLink } from "lucide-react";
import { BaseTileLayer } from "./BaseTileLayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#dc2626;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

/** Bản đồ nhỏ ghim một điểm — cùng nền bản đồ với mọi bản đồ khác của web và app (F3-G16). */
export function MapPointView({
  lat,
  lng,
  zoom = 16,
  className = "h-48 w-full",
}: {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-md border ${className}`}>
      <MapContainer
        key={`${lat},${lng}`}
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <BaseTileLayer />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}

/** Link Google Maps — chỉ là lựa chọn phụ trong hộp bản đồ (dẫn đường từng ngã rẽ). */
export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Hộp bản đồ xem một toạ độ ngay trong web, không nhảy sang trang khác (F3-G16). */
export function MapPointDialog({
  lat,
  lng,
  title,
  open,
  onOpenChange,
}: {
  lat: number;
  lng: number;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? t("common.coordinates.mapTitle")}</DialogTitle>
        </DialogHeader>
        {open && <MapPointView lat={lat} lng={lng} className="h-[420px] w-full" />}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-mono">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
          <a
            href={googleMapsUrl(lat, lng)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {t("common.coordinates.openGoogleMaps")} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Nút / chữ mở {@link MapPointDialog}. */
export function useMapPointDialog() {
  const [point, setPoint] = useState<{ lat: number; lng: number; title?: string } | null>(null);
  const dialog = point ? (
    <MapPointDialog
      lat={point.lat}
      lng={point.lng}
      title={point.title}
      open
      onOpenChange={(open) => !open && setPoint(null)}
    />
  ) : null;
  return { openMap: setPoint, dialog };
}
