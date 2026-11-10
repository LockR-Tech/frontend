import type { TFunction } from "i18next";

/** Nhãn đã dịch cho các mã của sự cố rơi kiện; mã lạ thì hiện nguyên mã (không mất thông tin). */
const GPS_SOURCES: Record<string, string> = {
  TELEMETRY: "telemetry",
  MANUAL_DEVICE: "manualDevice",
  FLIGHT_PATH: "flightPath",
  ESTIMATED_ROUTE: "estimatedRoute",
  FALLBACK_DEFAULT: "fallbackDefault",
};
const OUTCOMES: Record<string, string> = { FOUND: "found", NOT_FOUND: "notFound", UNSAFE: "unsafe" };
const CONDITIONS: Record<string, string> = {
  INTACT: "intact",
  MINOR_DAMAGE: "minorDamage",
  MAJOR_DAMAGE: "majorDamage",
  UNUSABLE: "unusable",
  UNKNOWN: "unknown",
};

function label(t: TFunction, group: string, table: Record<string, string>, value: string | null | undefined) {
  if (!value) return null;
  const key = table[value];
  return key ? t(`admin.droneIncidents.codes.${group}.${key}`) : value;
}

export const gpsSourceLabel = (t: TFunction, value: string | null | undefined) =>
  label(t, "gpsSource", GPS_SOURCES, value);
export const recoveryOutcomeLabel = (t: TFunction, value: string | null | undefined) =>
  label(t, "outcome", OUTCOMES, value);
export const parcelConditionLabel = (t: TFunction, value: string | null | undefined) =>
  label(t, "condition", CONDITIONS, value);
