import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import {
  MapPin,
  Search,
  Crosshair,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Compass,
  AlertCircle,
  Sparkles,
  Info,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useUpdateLockerLocationMutation, type StaffLockerResponse } from "~/stores/apis/admin/lockerOps";

interface Props {
  locker: StaffLockerResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface PlaceResult {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

// Tọa độ mặc định nếu tủ chưa có: Trung tâm TP. Hồ Chí Minh
const DEFAULT_CENTER: [number, number] = [10.776889, 106.700806];

// Custom Leaflet Pin Icon phong cách Grab / Xanh SM cho chế độ Draggable
function createGrabPinIcon(isDragging = false) {
  return L.divIcon({
    className: "custom-grab-pin",
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    html: `
      <div style="position:relative;width:44px;height:52px;display:flex;align-items:center;justify-content:center;transition:transform 0.15s ease;">
        <!-- Vòng tỏa sóng tiếp đất -->
        <div style="position:absolute;bottom:0px;left:50%;transform:translateX(-50%);width:22px;height:9px;background:rgba(14,165,233,0.35);border-radius:50%;filter:blur(1px);animation:pulse 2s infinite;"></div>
        
        <!-- Kim ghim phong cách Grab / Xanh SM -->
        <div style="position:relative;width:38px;height:38px;margin-bottom:12px;background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #ffffff;box-shadow:0 6px 16px rgba(2,132,199,0.45);display:flex;align-items:center;justify-content:center;${isDragging ? "transform:rotate(-45deg) scale(1.15) translateY(-6px);" : ""}">
          <div style="transform:rotate(45deg);width:14px;height:14px;background:#ffffff;border-radius:50%;box-shadow:inset 0 1px 3px rgba(0,0,0,0.25);"></div>
        </div>
      </div>
    `,
  });
}

// Controller hỗ trợ Leaflet: điều khiển resize modal, click bản đồ và kéo tâm kiểu Grab/Xanh SM
function MapEventHandler({
  onCenterChange,
  onMapClick,
  isCenterPinMode,
  setIsPanning,
  setMapInstance,
}: {
  onCenterChange: (lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  isCenterPinMode: boolean;
  setIsPanning: (p: boolean) => void;
  setMapInstance: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    setMapInstance(map);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map, setMapInstance]);

  useMapEvents({
    movestart() {
      if (isCenterPinMode) {
        setIsPanning(true);
      }
    },
    moveend() {
      if (isCenterPinMode) {
        setIsPanning(false);
        const center = map.getCenter();
        onCenterChange(center.lat, center.lng);
      }
    },
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export function LockerLocationModal({ locker, open, onOpenChange, onSuccess }: Props) {
  const { t } = useTranslation();
  const [updateLocation, { isLoading: isSaving }] = useUpdateLockerLocationMutation();

  // Khởi tạo tọa độ
  const initialLat = locker.latitude ?? DEFAULT_CENTER[0];
  const initialLng = locker.longitude ?? DEFAULT_CENTER[1];

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [address, setAddress] = useState<string>(locker.address ?? "");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Chế độ ghim: Grab/Xanh SM (Tâm bản đồ cố định) hoặc Kéo thả icon
  const [isCenterPinMode, setIsCenterPinMode] = useState<boolean>(true);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Tìm kiếm địa điểm
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);

  const mapRef = useRef<L.Map | null>(null);
  const reverseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputContainerRef = useRef<HTMLDivElement | null>(null);

  // Click ra ngoài thì đóng dropdown tìm kiếm
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchInputContainerRef.current &&
        !searchInputContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Khi modal mở ra, đồng bộ lại dữ liệu của tủ
  useEffect(() => {
    if (open) {
      const lat = locker.latitude ?? DEFAULT_CENTER[0];
      const lng = locker.longitude ?? DEFAULT_CENTER[1];
      setCoords({ lat, lng });
      setAddress(locker.address ?? "");
      setGpsAccuracy(null);
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
      setIsDropdownOpen(false);
    }
  }, [open, locker]);

  // Reverse Geocoding (Lấy địa chỉ chuẩn từ tọa độ qua OpenStreetMap Nominatim / Photon)
  const fetchAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "vi,en;q=0.9",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.display_name) {
          setAddress(data.display_name);
          return;
        }
      }
    } catch {
      // Fallback reverse geocoding qua Photon nếu Nominatim gặp sự cố
      try {
        const res2 = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
        if (res2.ok) {
          const data2 = await res2.json();
          const p = data2?.features?.[0]?.properties;
          if (p) {
            const parts = [p.name, p.housenumber, p.street, p.district || p.locality, p.city, p.country].filter(Boolean);
            if (parts.length > 0) setAddress(parts.join(", "));
          }
        }
      } catch {
        // Ignored
      }
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  // Debounce reverse geocoding khi di chuyển ghim / bản đồ
  const handleCoordsChange = useCallback(
    (lat: number, lng: number, shouldGeocode = true) => {
      setCoords({ lat, lng });
      if (shouldGeocode) {
        if (reverseTimeoutRef.current) clearTimeout(reverseTimeoutRef.current);
        reverseTimeoutRef.current = setTimeout(() => {
          fetchAddressFromCoords(lat, lng);
        }, 500);
      }
    },
    [fetchAddressFromCoords]
  );

  // API 1: Lấy tọa độ GPS thiết bị chính xác nhất bằng navigator.geolocation (High Accuracy)
  const handleGetHighAccuracyGps = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ Geolocation (định vị GPS)");
      return;
    }

    setIsLocatingGps(true);
    const toastId = toast.loading("Đang kết nối GPS thiết bị để lấy tọa độ chính xác nhất...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        toast.dismiss(toastId);
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracy(accuracy);
        handleCoordsChange(latitude, longitude, true);

        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 18, { duration: 1.2 });
        }
        toast.success(`Đã lấy tọa độ GPS chính xác! (Độ lệch: ±${Math.round(accuracy)}m)`);
      },
      (err) => {
        setIsLocatingGps(false);
        toast.dismiss(toastId);
        let errorMsg = "Không thể lấy vị trí GPS hiện tại";
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền vị trí cho trang web.";
        } else if (err.code === err.TIMEOUT) {
          errorMsg = "Quá thời gian kết nối GPS thiết bị.";
        }
        toast.error(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // API 2: Tìm kiếm địa điểm đa tầng (Nominatim VN -> Photon OSM -> Global Nominatim)
  const executeSearch = useCallback(async (query: string, autoSelectFirst = false) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setHasSearched(false);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setIsDropdownOpen(true);

    const items: PlaceResult[] = [];

    // Tầng 1: Nominatim Việt Nam
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          trimmed
        )}&format=json&limit=6&addressdetails=1&countrycodes=vn`,
        { headers: { "Accept-Language": "vi,en;q=0.9" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          for (const item of data) {
            items.push({
              id: `nom-${item.place_id}`,
              title: item.name || (item.display_name ? item.display_name.split(",")[0] : trimmed),
              subtitle: item.display_name || "",
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            });
          }
        }
      }
    } catch (e) {
      console.warn("Nominatim error, trying Photon fallback", e);
    }

    // Tầng 2: Photon (OpenStreetMap engine - cực nhanh, không rate-limit)
    if (items.length === 0) {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6`,
          { headers: { "Accept-Language": "vi,en;q=0.9" } }
        );
        if (res.ok) {
          const data = await res.json();
          const features = data?.features || [];
          for (const f of features) {
            const p = f.properties || {};
            const parts = [p.housenumber, p.street, p.district || p.locality, p.city, p.country].filter(Boolean);
            items.push({
              id: `pho-${f.geometry.coordinates.join(",")}-${Math.random()}`,
              title: p.name || parts[0] || trimmed,
              subtitle: parts.length > 0 ? parts.join(", ") : p.name || trimmed,
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            });
          }
        }
      } catch (e) {
        console.warn("Photon error, trying global Nominatim", e);
      }
    }

    // Tầng 3: Global Nominatim không lọc quốc gia
    if (items.length === 0) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            trimmed
          )}&format=json&limit=6&addressdetails=1`,
          { headers: { "Accept-Language": "vi,en;q=0.9" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            for (const item of data) {
              items.push({
                id: `nom-glob-${item.place_id}`,
                title: item.name || (item.display_name ? item.display_name.split(",")[0] : trimmed),
                subtitle: item.display_name || "",
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              });
            }
          }
        }
      } catch (e) {
        console.warn("Global Nominatim error", e);
      }
    }

    setSearchResults(items);
    setIsSearching(false);

    if (autoSelectFirst && items.length > 0) {
      const top = items[0];
      setCoords({ lat: top.lat, lng: top.lng });
      setAddress(top.subtitle || top.title);
      setIsDropdownOpen(false);
      if (mapRef.current) {
        mapRef.current.flyTo([top.lat, top.lng], 18, { duration: 1.2 });
      }
      toast.success(`Đã di chuyển ghim đến: ${top.title}`);
    } else if (autoSelectFirst && items.length === 0) {
      toast.error(`Không tìm thấy địa điểm "${trimmed}". Hãy thử nhập tên đường hoặc bấm "GPS vị trí của tôi".`);
    }
  }, []);

  const handleSearchInputChange = (val: string) => {
    setSearchQuery(val);
    setHasSearched(false);
    if (!val.trim()) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    // Debounce 400ms để không spam API
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      executeSearch(val, false);
    }, 400);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    executeSearch(searchQuery, true);
  };

  const handleSelectSearchResult = (result: PlaceResult) => {
    setCoords({ lat: result.lat, lng: result.lng });
    setAddress(result.subtitle || result.title);
    setIsDropdownOpen(false);

    if (mapRef.current) {
      mapRef.current.flyTo([result.lat, result.lng], 18, { duration: 1.2 });
    }
    toast.success(`Đã di chuyển ghim đến: ${result.title}`);
  };

  // Sao chép tọa độ
  const handleCopyCoords = () => {
    const text = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`Đã sao chép tọa độ: ${text}`);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mở Google Maps
  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    window.open(url, "_blank");
  };

  // Lưu tọa độ tủ lên backend
  const handleSave = async () => {
    try {
      await updateLocation({
        lockerId: locker.id,
        latitude: coords.lat,
        longitude: coords.lng,
        address: address.trim() || undefined,
      }).unwrap();

      toast.success("Cập nhật vị trí & tọa độ tủ thành công!", {
        description: `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Lưu vị trí tủ thất bại", {
        description: err?.data?.message || err?.message || "Vui lòng kiểm tra lại kết nối mạng",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[860px] p-0 flex flex-col gap-0 overflow-hidden bg-background border-border">
        {/* Header Modal */}
        <DialogHeader className="p-4 pb-3 border-b border-border/80 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                Vị trí & Tọa độ tủ: <span className="text-foreground">{locker.name}</span>
                <Badge variant="outline" className="font-mono text-xs ml-1">
                  {locker.code}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Di chuyển icon ghim hoặc kéo bản đồ để chọn tọa độ chính xác nhất cho tủ Lock.R (chuẩn Grab / Xanh SM).
              </DialogDescription>
            </div>
            {coords.lat && coords.lng && (
              <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Thanh công cụ tìm kiếm và lấy tọa độ GPS chính xác (relative z-30 để dropdown nổi trên Leaflet Map) */}
        <div className="relative z-30 p-3 bg-card border-b border-border/60 flex flex-col md:flex-row items-center gap-2.5">
          {/* Form tìm kiếm địa điểm */}
          <div ref={searchInputContainerRef} className="relative flex-1 w-full">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsDropdownOpen(true);
                  }}
                  placeholder="Nhập địa chỉ, tòa nhà, trường học (VD: FPT University, Landmark 81, Bitexco...)"
                  className="pl-9 pr-8 h-9 text-xs"
                />
                {searchQuery && !isSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setIsDropdownOpen(false);
                      setHasSearched(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {isSearching && (
                  <RefreshCw className="w-3.5 h-3.5 text-sky-500 absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin" />
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={isSearching || !searchQuery.trim()}
                className="h-9 px-3.5 text-xs bg-sky-600 hover:bg-sky-700 text-white font-medium shrink-0 gap-1.5 shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                Tìm
              </Button>
            </form>

            {/* Dropdown gợi ý tìm kiếm nổi z-[9999] phía trên bản đồ */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-popover/98 backdrop-blur-md border border-border rounded-xl shadow-2xl z-[9999] max-h-72 overflow-y-auto divide-y divide-border/60 text-xs">
                {isSearching && (
                  <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                    <span>Đang tìm kiếm trên bản đồ...</span>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <>
                    <div className="p-2 px-3 text-[11px] font-semibold text-muted-foreground bg-muted/40 flex items-center justify-between">
                      <span>Tìm thấy {searchResults.length} địa điểm:</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Bấm để ghim ngay</span>
                    </div>
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full text-left p-2.5 px-3 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors flex items-start gap-2.5 text-foreground group cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground text-xs line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {!isSearching && hasSearched && searchResults.length === 0 && (
                  <div className="p-4 text-center space-y-1">
                    <p className="text-foreground font-medium text-xs">Không tìm thấy địa điểm "{searchQuery}"</p>
                    <p className="text-[11px] text-muted-foreground">
                      Thử nhập tên đường, phường hoặc sử dụng nút "GPS vị trí của tôi".
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nút hành động nhanh */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            {/* Lấy vị trí GPS của tôi (High Accuracy) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetHighAccuracyGps}
              disabled={isLocatingGps}
              className="h-9 text-xs gap-1.5 border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
              title="Kích hoạt GPS thiết bị để lấy tọa độ thực tế có độ chính xác cao nhất"
            >
              <Crosshair className={`w-3.5 h-3.5 text-sky-600 dark:text-sky-400 ${isLocatingGps ? "animate-spin" : ""}`} />
              {isLocatingGps ? "Đang dò GPS..." : "GPS vị trí của tôi"}
            </Button>

            {/* Chuyển đổi chế độ: Ghim tâm bản đồ (Grab) vs Kéo thả ghim */}
            <Button
              type="button"
              variant={isCenterPinMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsCenterPinMode(!isCenterPinMode)}
              className="h-9 text-xs gap-1.5"
              title="Chuyển chế độ ghim theo tâm bản đồ như app gọi xe hoặc kéo thả icon"
            >
              <Compass className="w-3.5 h-3.5" />
              {isCenterPinMode ? "Chế độ: Tâm bản đồ (Grab)" : "Chế độ: Kéo thả ghim"}
            </Button>
          </div>
        </div>

        {/* Khu vực Bản đồ Tương tác */}
        <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
          <MapContainer
            center={[initialLat, initialLng]}
            zoom={17}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapEventHandler
              onCenterChange={(lat, lng) => handleCoordsChange(lat, lng, true)}
              onMapClick={(lat, lng) => {
                handleCoordsChange(lat, lng, true);
                if (mapRef.current) {
                  mapRef.current.panTo([lat, lng]);
                }
              }}
              isCenterPinMode={isCenterPinMode}
              setIsPanning={setIsPanning}
              setMapInstance={(map) => {
                mapRef.current = map;
              }}
            />

            {/* Marker hiển thị khi không ở chế độ Center Pin, hoặc cho phép kéo thả trực tiếp */}
            {!isCenterPinMode && (
              <Marker
                position={[coords.lat, coords.lng]}
                icon={createGrabPinIcon(false)}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    const position = marker.getLatLng();
                    handleCoordsChange(position.lat, position.lng, true);
                  },
                }}
              />
            )}
          </MapContainer>

          {/* GHIM TRỌNG TÂM CỐ ĐỊNH PHONG CÁCH GRAB & XANH SM */}
          {isCenterPinMode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
              <div className="relative -translate-y-6 flex flex-col items-center">
                {/* Tooltip vị trí ghim */}
                <div
                  className={`bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-lg border border-slate-700 mb-1 flex items-center gap-1.5 transition-all duration-200 ${
                    isPanning ? "scale-90 opacity-70" : "scale-100 opacity-100 animate-bounce"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>{isPanning ? "Đang di chuyển vị trí..." : "Thả tại đây để ghim"}</span>
                </div>

                {/* Biểu tượng Pin Grab/Xanh SM */}
                <div
                  className={`relative transition-transform duration-200 ${
                    isPanning ? "-translate-y-2 scale-110" : "translate-y-0 scale-100"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 border-2 border-white shadow-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white fill-white" />
                  </div>
                  {/* Mũi nhọn tam giác */}
                  <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[9px] border-t-cyan-500 mx-auto -mt-0.5" />
                </div>

                {/* Tâm điểm bóng tiếp đất */}
                <div className="w-3 h-1.5 bg-black/40 rounded-full blur-[1px] -mt-0.5" />
              </div>
            </div>
          )}

          {/* Floating Controls trên bản đồ */}
          <div className="absolute right-4 bottom-4 z-[1000] flex flex-col gap-2">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="w-9 h-9 rounded-full shadow-lg bg-background/90 backdrop-blur-sm hover:bg-background border border-border"
              onClick={() => mapRef.current?.zoomIn()}
              title="Phóng to"
            >
              +
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="w-9 h-9 rounded-full shadow-lg bg-background/90 backdrop-blur-sm hover:bg-background border border-border"
              onClick={() => mapRef.current?.zoomOut()}
              title="Thu nhỏ"
            >
              -
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="w-9 h-9 rounded-full shadow-lg bg-background/90 backdrop-blur-sm hover:bg-background border border-border text-sky-600 dark:text-sky-400"
              onClick={() => {
                if (mapRef.current) {
                  mapRef.current.flyTo([coords.lat, coords.lng], 18);
                }
              }}
              title="Đưa ghim về giữa tầm nhìn"
            >
              <Compass className="w-4 h-4" />
            </Button>
          </div>

          {/* Badge thông báo độ chính xác GPS nếu có */}
          {gpsAccuracy != null && (
            <div className="absolute left-4 top-4 z-[1000] bg-background/90 backdrop-blur-sm border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Độ chính xác GPS: ±{Math.round(gpsAccuracy)}m
            </div>
          )}
        </div>

        {/* Thông tin tọa độ và địa chỉ chi tiết bên dưới */}
        <div className="p-4 bg-card border-t border-border/80 space-y-3">
          {/* Hàng 1: Địa chỉ hiển thị */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Địa chỉ chi tiết của tủ
                {isReverseGeocoding && <span className="text-sky-600 text-[11px] font-normal animate-pulse">(Đang tra địa chỉ...)</span>}
              </Label>
              <span className="text-[11px] text-muted-foreground">Có thể chỉnh sửa để hướng dẫn khách hàng / nhân viên</span>
            </div>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="VD: Sảnh A, Tòa Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM"
              className="h-8 text-xs bg-muted/30"
            />
          </div>

          {/* Hàng 2: Tinh chỉnh Vĩ độ & Kinh độ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Vĩ độ (Latitude) - chuẩn 6 chữ số thập phân</Label>
              <Input
                type="number"
                step="0.000001"
                value={coords.lat}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    handleCoordsChange(val, coords.lng, false);
                  }
                }}
                className="font-mono text-xs h-8"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Kinh độ (Longitude) - chuẩn 6 chữ số thập phân</Label>
              <Input
                type="number"
                step="0.000001"
                value={coords.lng}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    handleCoordsChange(coords.lat, val, false);
                  }
                }}
                className="font-mono text-xs h-8"
              />
            </div>
          </div>

          {/* Hàng 3: Công cụ hỗ trợ đối soát */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyCoords}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Đã chép" : "Sao chép tọa độ"}
              </button>
              <button
                type="button"
                onClick={handleOpenGoogleMaps}
                className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Kiểm tra trên Google Maps
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Độ chính xác tọa độ: ~0.1m
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <DialogFooter className="p-3 px-4 border-t border-border/80 bg-muted/20 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const lat = locker.latitude ?? DEFAULT_CENTER[0];
              const lng = locker.longitude ?? DEFAULT_CENTER[1];
              handleCoordsChange(lat, lng, true);
              if (mapRef.current) {
                mapRef.current.flyTo([lat, lng], 17);
              }
              toast.info("Đã đặt lại tọa độ gốc của tủ");
            }}
            className="text-xs text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Đặt lại tọa độ gốc
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {isSaving ? "Đang lưu tọa độ..." : "Lưu tọa độ tủ"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
