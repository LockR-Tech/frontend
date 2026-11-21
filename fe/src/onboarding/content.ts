import type { i18n as I18n } from "i18next";
import type { TourContent } from "./engine";

// Nội dung hướng dẫn (F3-G13) là file tĩnh trong public/onboarding — cùng nguồn cho app mobile và trang HDSD.
export const TOUR_LANGUAGES = ["vi", "en"] as const;
export const TOUR_NS = "tour";

let contentPromise: Promise<TourContent> | null = null;
let textsPromise: Promise<void> | null = null;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function loadTourContent(): Promise<TourContent> {
  contentPromise ??= getJson<TourContent>("/onboarding/tours.json").catch((err) => {
    contentPromise = null;
    throw err;
  });
  return contentPromise;
}

/** Nạp chữ của mọi ngôn ngữ vào namespace "tour" của i18next: t("tour:steps.<id>.title"). */
export function loadTourTexts(i18n: I18n): Promise<void> {
  textsPromise ??= Promise.all(
    TOUR_LANGUAGES.map(async (lng) => {
      const data = await getJson<Record<string, unknown>>(`/onboarding/locales/${lng}.json`);
      i18n.addResourceBundle(lng, TOUR_NS, data, true, true);
    }),
  ).then(() => undefined).catch((err) => {
    textsPromise = null;
    throw err;
  });
  return textsPromise;
}
