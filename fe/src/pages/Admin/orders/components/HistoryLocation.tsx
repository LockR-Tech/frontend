import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Coordinates } from "~/components/shared/Coordinates";

/**
 * Toạ độ kiện tại lúc ghi một mốc trạng thái (chỉ đơn drone), kèm nguồn số đo. Cùng số với
 * hành trình trên app khách và app KTV — backend ghi một lần lúc mốc xảy ra.
 */
export function HistoryLocation({
  latitude,
  longitude,
  source,
}: {
  latitude?: number | null;
  longitude?: number | null;
  source?: string | null;
}) {
  const { t } = useTranslation();
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
      <MapPin className="h-3 w-3 shrink-0" />
      <Coordinates lat={latitude} lng={longitude} />
      {source && (
        <span>
          · {t(`admin.orders.location.source.${source}`, { defaultValue: source })}
        </span>
      )}
    </p>
  );
}
