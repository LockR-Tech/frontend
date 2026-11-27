/**
 * Bộ nhớ ô bản đồ 30 ngày của web admin (F3-G16) — service worker `public/map-tiles-sw.js`. Chỉ trang quản trị
 * dùng web này nên chỉ admin thấy mục quản lý (Tuỳ chọn › Bản đồ); app khách / KTV lưu ô bản đồ riêng trong app.
 */
const SW_URL = "/map-tiles-sw.js";

export interface MapTileCacheStats {
  tiles: number;
  bytes: number;
  /** Thời điểm (ms) ô cũ nhất được lưu; null khi bộ nhớ trống. */
  oldest: number | null;
  maxAgeDays: number;
}

export function mapTileCacheSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof caches !== "undefined";
}

/** Gọi một lần lúc mở web. Lỗi (trình duyệt chặn, http không an toàn) thì bỏ qua — bản đồ vẫn chạy, chỉ không lưu. */
export function registerMapTileCache(): void {
  if (!mapTileCacheSupported()) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch(() => undefined);
  });
}

async function ask<T>(message: string): Promise<T | null> {
  if (!mapTileCacheSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const worker = registration?.active;
  if (!worker) return null;
  return new Promise<T | null>((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve(null), 15000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      resolve(event.data as T | null);
    };
    worker.postMessage(message, [channel.port2]);
  });
}

export function getMapTileCacheStats(): Promise<MapTileCacheStats | null> {
  return ask<MapTileCacheStats>("map-cache-stats");
}

export async function clearMapTileCache(): Promise<boolean> {
  const result = await ask<{ cleared: boolean }>("map-cache-clear");
  return Boolean(result?.cleared);
}
