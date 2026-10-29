import { useTranslation } from "react-i18next";
import { Coordinates } from "~/components/shared/Coordinates";
import { formatTime } from "~/lib/datetime";
import type { DroneOrderTracking } from "~/stores/apis/admin/droneOrders";
import type { PositionSnapshot } from "./livePosition";

/**
 * Vị trí drone hiện tại: bản tin STOMP mới nhất (drone vừa bắn về) nếu đang nghe được, không thì số
 * của API chi tiết — cùng nguồn nên hai giá trị không bao giờ lệch nhau. Dòng phụ nói rõ số lấy từ đâu.
 */
export function DronePositionValue({
  order,
  live,
}: {
  order: DroneOrderTracking;
  live: PositionSnapshot | null;
}) {
  const { t } = useTranslation();
  const lat = live?.lat ?? order.currentLatitude;
  const lng = live?.lng ?? order.currentLongitude;
  const hasPosition = typeof lat === "number" && typeof lng === "number";

  const source = live
    ? t("admin.droneOrders.fields.positionLive", {
        time: formatTime(live.ts ? new Date(live.ts) : new Date()),
      })
    : order.missionStatus === "DEPOSITED"
      ? t("admin.droneOrders.fields.positionAtLocker")
      : order.fulfillmentMode === "DEMO"
        ? t("admin.droneOrders.fields.positionSimulated")
        : t("admin.droneOrders.fields.positionTelemetry");

  if (!hasPosition) {
    return <span className="text-xs text-muted-foreground">{t("admin.droneOrders.fields.positionNone")}</span>;
  }
  return (
    <span className="inline-flex flex-col gap-0.5">
      <Coordinates lat={lat} lng={lng} />
      <span className="text-[11px] font-normal text-muted-foreground">{source}</span>
    </span>
  );
}
