/*
 * Lưu ô bản đồ 30 ngày cho web admin (F3-G16): mở lại trang không phải tải lại bản đồ, dù máy chủ ô bản đồ chỉ cho
 * giữ 1 ngày. CHỈ xử lý ô bản đồ (Esri, OSM); mọi yêu cầu khác đi thẳng mạng như không có service worker.
 * Trang "Tuỳ chọn" của admin hỏi dung lượng và xoá bộ nhớ qua postMessage.
 */
const CACHE = "lockr-map-tiles-v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 6000;
const STAMP = "x-lockr-cached-at";
const TILE_HOSTS = ["server.arcgisonline.com", "tile.openstreetmap.org"];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function isTile(url) {
  return TILE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith("." + host));
}

async function stamped(response) {
  const headers = new Headers(response.headers);
  headers.set(STAMP, String(Date.now()));
  const body = await response.blob();
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

let writes = 0;
async function trim(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_ENTRIES;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}

async function tileResponse(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request.url);
  const age = cached ? Date.now() - Number(cached.headers.get(STAMP) || 0) : Infinity;
  if (cached && age < MAX_AGE_MS) return cached;
  try {
    const network = await fetch(request.url, { mode: "cors", credentials: "omit" });
    if (network.ok) {
      await cache.put(request.url, await stamped(network.clone()));
      if (++writes % 200 === 0) trim(cache);
    }
    return network;
  } catch (error) {
    if (cached) return cached; // Mất mạng: dùng tạm ô cũ còn hơn ô trống.
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!isTile(url)) return;
  event.respondWith(tileResponse(event.request));
});

async function stats() {
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  let bytes = 0;
  let oldest = null;
  for (const key of keys) {
    const response = await cache.match(key);
    if (!response) continue;
    const length = Number(response.headers.get("content-length") || 0);
    bytes += length || (await response.clone().blob()).size;
    const at = Number(response.headers.get(STAMP) || 0);
    if (at && (oldest === null || at < oldest)) oldest = at;
  }
  return { tiles: keys.length, bytes, oldest, maxAgeDays: 30 };
}

self.addEventListener("message", (event) => {
  const port = event.ports && event.ports[0];
  if (!port) return;
  if (event.data === "map-cache-stats") {
    stats().then((value) => port.postMessage(value), () => port.postMessage(null));
  } else if (event.data === "map-cache-clear") {
    caches.delete(CACHE).then(() => port.postMessage({ cleared: true }), () => port.postMessage(null));
  }
});
