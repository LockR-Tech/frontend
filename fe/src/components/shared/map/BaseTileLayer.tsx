import { TileLayer } from "react-leaflet";
import type { TileEvent } from "leaflet";

/**
 * Nền bản đồ DÙNG CHUNG cho mọi bản đồ của web admin — cùng nguồn với app mobile (F3-G16) để bản đồ ở hai nơi
 * trông giống nhau. Esri World Street Map không cần khoá; OSM là dự phòng cho từng ô khi Esri lỗi.
 * Ô đã tải được service worker `map-tiles-sw.js` giữ 30 ngày (xem `registerMapTileCache`).
 */
export const BASE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
export const FALLBACK_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const BASE_TILE_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &middot; &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function fallbackUrl(coords: { x: number; y: number; z: number }) {
  return FALLBACK_TILE_URL.replace("{z}", String(coords.z))
    .replace("{x}", String(coords.x))
    .replace("{y}", String(coords.y));
}

export function BaseTileLayer() {
  return (
    <TileLayer
      attribution={BASE_TILE_ATTRIBUTION}
      url={BASE_TILE_URL}
      maxNativeZoom={19}
      maxZoom={20}
      crossOrigin="anonymous"
      eventHandlers={{
        // Ô Esri lỗi ⇒ thử ô OSM cùng vị trí (một lần, không lặp vô hạn).
        tileerror: (event: TileEvent) => {
          const img = event.tile as HTMLImageElement;
          if (img.dataset.fallback) return;
          img.dataset.fallback = "1";
          img.src = fallbackUrl(event.coords);
        },
      }}
    />
  );
}
