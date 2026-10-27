import i18n from "~/utils/i18n";

// Mã do order-service trả (DroneFlightBlock / DroneFlightControl.SUSPENSION_REASONS); nhãn dịch lúc đọc.

export const BLOCK_CAUSES = ["WEATHER_UNSAFE", "WEATHER_UNAVAILABLE", "FLIGHTS_SUSPENDED", "STATION_SUSPENDED"] as const;
export const BLOCK_ACTIONS = ["BOOKING", "ACCEPT", "LAUNCH", "IN_PROGRESS"] as const;
export const SUSPENSION_REASONS = ["WEATHER", "LANDING_PAD", "AIRSPACE", "OPERATIONAL", "OTHER"] as const;

export function causeLabel(cause: string): string {
  return i18n.t(`admin.flightControl.cause.${cause}`, { defaultValue: cause });
}

export function actionLabel(action: string): string {
  return i18n.t(`admin.flightControl.action.${action}`, { defaultValue: action });
}

export function reasonLabel(reason: string | null | undefined): string {
  if (!reason) return "—";
  return i18n.t(`admin.flightControl.reason.${reason}`, { defaultValue: reason });
}

export function causeTone(cause: string): string {
  switch (cause) {
    case "WEATHER_UNSAFE":
      return "border-red-500/30 bg-red-500/10 text-red-800";
    case "WEATHER_UNAVAILABLE":
      return "border-slate-400/30 bg-slate-500/10 text-slate-700";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-800";
  }
}

/**
 * Ô `datetime-local` admin nhập theo giờ Việt Nam ⇒ LocalDateTime UTC không offset mà backend dùng
 * (container chạy UTC). Chuỗi rỗng ⇒ null.
 */
export function vietnamInputToUtc(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19);
}
