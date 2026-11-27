import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, MapPin } from "lucide-react";
import { toast } from "sonner";
import { MapPointDialog } from "~/components/shared/map/MapPointView";

/**
 * Toạ độ ghi gộp một dòng `vĩ độ, kinh độ` — đúng dạng dán thẳng vào ô tìm kiếm bản đồ.
 * Bấm vào toạ độ mở bản đồ NGAY TRONG WEB tại điểm đó (F3-G16, cùng nền bản đồ với app; trong hộp vẫn có link
 * Google Maps nếu cần dẫn đường); nút copy chép nguyên chuỗi. Thiếu số ⇒ null (LabelValue tự hiện dấu "—").
 */
export function Coordinates({
  lat,
  lng,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
}) {
  const { t } = useTranslation();
  const [mapOpen, setMapOpen] = useState(false);
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("common.coordinates.copied", { value: text }));
    } catch {
      toast.error(t("common.coordinates.copyFailed"));
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono">
      <button
        type="button"
        onClick={() => setMapOpen(true)}
        title={t("common.coordinates.openMap")}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        {text}
        <MapPin className="h-3 w-3" />
      </button>
      <MapPointDialog lat={lat} lng={lng} open={mapOpen} onOpenChange={setMapOpen} />
      <button
        type="button"
        onClick={copy}
        title={t("common.coordinates.copy")}
        aria-label={t("common.coordinates.copy")}
        className="inline-flex items-center rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
