import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, CloudLightning, CloudOff, CloudSun, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { formatDateTime } from "~/lib/datetime";
import {
  useGetDroneLockerWeatherQuery,
  useGetDroneRouteWeatherQuery,
  type DroneWeatherAssessment,
} from "~/stores/apis/admin/droneOrders";

// Thời tiết cho admin — cùng kết quả server dùng để chặn đặt đơn / phóng drone, và cùng dữ liệu
// khách, KTV thấy trên app. Dự báo 30 phút tới; server nhớ 5 phút nên làm mới mỗi 5 phút là đủ.
const REFRESH_MS = 5 * 60 * 1000;

const PROVIDER_LABELS: Record<string, string> = {
  OPEN_METEO: "Open-Meteo",
  MET_NORWAY: "MET Norway",
};

function tone(weather: DroneWeatherAssessment) {
  if (weather.status === "SAFE") {
    return { box: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800", Icon: CloudSun };
  }
  if (weather.status === "UNAVAILABLE") {
    return { box: "border-slate-400/30 bg-slate-500/10 text-slate-700", Icon: CloudOff };
  }
  return { box: "border-red-500/30 bg-red-500/10 text-red-800", Icon: CloudLightning };
}

export function WeatherSummary({ weather, title }: { weather: DroneWeatherAssessment; title?: string | null }) {
  const { t } = useTranslation();
  const { box, Icon } = tone(weather);
  const facts = [
    weather.condition,
    weather.temperatureC != null ? `${Math.round(weather.temperatureC)}°C` : null,
    weather.status !== "UNAVAILABLE"
      ? t("admin.droneOrders.weather.wind", { value: Math.round(weather.maxWindSpeedKmh) })
      : null,
    weather.status !== "UNAVAILABLE"
      ? t("admin.droneOrders.weather.gust", { value: Math.round(weather.maxWindGustKmh) })
      : null,
    weather.status !== "UNAVAILABLE"
      ? t("admin.droneOrders.weather.rain", { value: weather.maxPrecipitationMm.toFixed(1) })
      : null,
  ].filter(Boolean);
  const provider = weather.provider ? PROVIDER_LABELS[weather.provider] ?? weather.provider : null;
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${box}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 space-y-0.5">
        {title ? <p className="font-semibold text-foreground">{title}</p> : null}
        <p className="font-semibold">{t(`admin.droneOrders.weather.status.${weather.status}`, { defaultValue: weather.status })}</p>
        {facts.length > 0 ? <p className="text-foreground/80">{facts.join(" · ")}</p> : null}
        {weather.status !== "SAFE" ? <p>{weather.message}</p> : null}
        <p className="text-xs text-muted-foreground">
          {[
            t("admin.droneOrders.weather.window"),
            weather.checkedAt ? t("admin.droneOrders.weather.checkedAt", { time: formatDateTime(weather.checkedAt) }) : null,
            provider ? t("admin.droneOrders.weather.provider", { provider }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}

/** Thời tiết dọc tuyến bay (tủ bay → tủ nhận) của một đơn đang chạy. */
export function RouteWeatherPanel({ orderId }: { orderId: number }) {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, isError, refetch } = useGetDroneRouteWeatherQuery(orderId, {
    pollingInterval: REFRESH_MS,
  });
  const route = data?.data;
  if (route && !route.weather) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("admin.droneOrders.weather.routeTitle")}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {route ? (
        <>
          <p className="text-xs text-muted-foreground">
            {route.sourceLockerName ?? t("admin.droneOrders.weather.sourceFallback")} →{" "}
            {route.destinationLockerName ?? t("admin.droneOrders.weather.destinationFallback")}
          </p>
          <WeatherSummary weather={route.weather} />
        </>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t("admin.droneOrders.weather.loading")}</p>
      ) : isError ? (
        <p className="text-sm text-red-700">{t("admin.droneOrders.weather.loadFailed")}</p>
      ) : null}
    </section>
  );
}

/** Thời tiết tại các tủ có bãi đáp drone — tổng quan trên trang danh sách hành trình. */
export function LockerWeatherOverview() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useGetDroneLockerWeatherQuery(undefined, {
    pollingInterval: REFRESH_MS,
  });
  const lockers = data?.data ?? [];
  const blocked = lockers.filter((l) => l.weather.status !== "SAFE").length;
  const headline = isLoading
    ? t("admin.droneOrders.weather.loading")
    : isError
      ? t("admin.droneOrders.weather.loadFailed")
      : lockers.length === 0
        ? t("admin.droneOrders.weather.noLockers")
        : blocked === 0
          ? t("admin.droneOrders.weather.allSafe", { count: lockers.length })
          : t("admin.droneOrders.weather.someBlocked", { blocked, count: lockers.length });

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 p-4">
        <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => setOpen((v) => !v)}>
          {blocked === 0 && !isError ? (
            <CloudSun className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <CloudLightning className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <span className="min-w-0">
            <span className="block font-semibold">{t("admin.droneOrders.weather.lockersTitle")}</span>
            <span className="block text-sm text-muted-foreground">{headline}</span>
          </span>
          {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </button>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {open && lockers.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 border-t p-4 md:grid-cols-2 xl:grid-cols-3">
          {lockers.map((locker) => (
            <WeatherSummary
              key={locker.lockerId}
              weather={locker.weather}
              title={locker.name ?? locker.code ?? `#${locker.lockerId}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
