import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui";
import {
  clearMapTileCache,
  getMapTileCacheStats,
  mapTileCacheSupported,
  type MapTileCacheStats,
} from "~/lib/map-tile-cache";
import { formatDate } from "~/lib/datetime";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Bộ nhớ bản đồ của trình duyệt này (F3-G16): ô bản đồ giữ 30 ngày để mở trang không phải tải lại. Chỉ có ở web
 * admin — app khách / KTV lưu ô bản đồ riêng trong app và không hiện mục này.
 */
export function MapCacheSetting() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<MapTileCacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const supported = mapTileCacheSupported();

  const load = useCallback(async () => {
    setLoading(true);
    setStats(await getMapTileCacheStats());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (supported) void load();
    else setLoading(false);
  }, [supported, load]);

  const clear = async () => {
    setClearing(true);
    const ok = await clearMapTileCache();
    setClearing(false);
    if (ok) toast.success(t("admin.preferences.mapCache.cleared"));
    else toast.error(t("admin.preferences.mapCache.clearFailed"));
    void load();
  };

  const summary = !supported
    ? t("admin.preferences.mapCache.unsupported")
    : loading
      ? t("admin.preferences.mapCache.loading")
      : !stats
        ? t("admin.preferences.mapCache.notReady")
        : stats.tiles === 0
          ? t("admin.preferences.mapCache.empty")
          : t("admin.preferences.mapCache.summary", {
              tiles: stats.tiles,
              size: formatBytes(stats.bytes),
              since: stats.oldest ? formatDate(new Date(stats.oldest).toISOString()) : "—",
            });

  return (
    <div data-tour="prefs-map-cache" className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-2.5">
        <MapIcon size={16} className="text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">{t("admin.preferences.mapCache.title")}</p>
          <p className="text-xs text-muted-foreground">{t("admin.preferences.mapCache.help")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs shrink-0"
        disabled={!supported || clearing || !stats || stats.tiles === 0}
        onClick={() => void clear()}
      >
        {clearing ? t("admin.preferences.mapCache.clearing") : t("admin.preferences.mapCache.clear")}
      </Button>
    </div>
  );
}
