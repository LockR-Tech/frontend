import { useTranslation } from "react-i18next";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/** Link Google Maps mở đúng điểm toạ độ (ghim tại vị trí, có địa chỉ thực tế bên dưới). */
function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Toạ độ ghi gộp một dòng `vĩ độ, kinh độ` — đúng dạng dán thẳng vào ô tìm kiếm Google Maps.
 * Bấm vào toạ độ mở Google Maps tại điểm đó; nút copy chép nguyên chuỗi. Thiếu số ⇒ null
 * (LabelValue tự hiện dấu "—").
 */
export function Coordinates({
  lat,
  lng,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
}) {
  const { t } = useTranslation();
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
      <a
        href={googleMapsUrl(lat, lng)}
        target="_blank"
        rel="noreferrer"
        title={t("common.coordinates.openMap")}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        {text}
        <ExternalLink className="h-3 w-3" />
      </a>
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
