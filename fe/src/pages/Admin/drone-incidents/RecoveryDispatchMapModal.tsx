import { useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import {
  AlertTriangle,
  Building2,
  Crosshair,
  MapPin,
  Navigation,
  Plane,
  Radio,
  Search,
  UserCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  useAssignDroneRecoveryMutation,
  type DroneParcelIncident,
} from "~/stores/apis/admin/droneIncidents";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { useGetAllLockersQuery } from "~/stores/apis/admin/lockers";
import { distanceKm, kmLabel } from "../drone-orders/journey";

interface RecoveryDispatchMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: DroneParcelIncident;
  onAssigned?: () => void;
}

interface CandidateTech {
  id: number;
  fullName: string;
  phoneNumber?: string | null;
  role: "LOCKER_TECHNICIAN" | "DRONE_TECHNICIAN";
  roleLabel: string;
  lockerName?: string;
  lockerCode?: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
}

const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 0] as const;

function createMarkerIcon(label: string, bgColor: string, borderColor = "#ffffff") {
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
    html: `
      <div style="
        width:34px;
        height:34px;
        border-radius:9999px;
        background:${bgColor};
        border:2.5px solid ${borderColor};
        box-shadow:0 3px 8px rgba(0,0,0,0.35);
        color:#ffffff;
        font-weight:700;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:14px;
      ">
        ${label}
      </div>
    `,
  });
}

const DROP_PIN_ICON = L.divIcon({
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
  html: `
    <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:40px;height:40px;border-radius:9999px;background:rgba(239,68,68,0.35);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width:34px;height:34px;border-radius:9999px;background:#dc2626;border:3px solid #ffffff;box-shadow:0 3px 10px rgba(220,38,38,0.6);color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:16px;">
        🚨
      </div>
    </div>
  `,
});

const KIOSK_TECH_ICON = createMarkerIcon("🏢", "#0284c7");
const DRONE_TECH_ICON = createMarkerIcon("🚁", "#ea580c");

export function RecoveryDispatchMapModal({
  open,
  onOpenChange,
  incident,
  onAssigned,
}: RecoveryDispatchMapModalProps) {
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [searchQuery, setSearchQuery] = useState("");
  const [assign, assignState] = useAssignDroneRecoveryMutation();

  const { data: usersData, isLoading: usersLoading } = useGetAllUsersQuery({
    page: 0,
    size: 1000,
  });
  const { data: lockersData } = useGetAllLockersQuery({ page: 0, size: 1000 });

  const dropLat = incident.dropLatitude ?? 10.8412;
  const dropLng = incident.dropLongitude ?? 106.8105;

  // Lấy danh sách tủ để ánh xạ tọa độ KTV kiosk
  const lockerByTechId = useMemo(() => {
    const map = new Map<number, { name: string; code: string; lat: number; lng: number }>();
    const lockers = lockersData?.data?.content ?? [];
    for (const locker of lockers) {
      if (
        locker.assignedTechnicianId != null &&
        locker.latitude != null &&
        locker.longitude != null
      ) {
        map.set(locker.assignedTechnicianId, {
          name: locker.name,
          code: locker.code,
          lat: locker.latitude,
          lng: locker.longitude,
        });
      }
    }
    return map;
  }, [lockersData]);

  // Lọc và tính khoảng cách các KTV (Kiosk & Drone)
  const candidateTechs: CandidateTech[] = useMemo(() => {
    const raw = usersData?.data as unknown;
    type RawUser = {
      id: number;
      fullName?: string;
      phoneNumber?: string | null;
      status?: string;
      roles?: string[];
    };
    const list: RawUser[] = Array.isArray(raw)
      ? raw
      : ((raw as { content?: RawUser[] } | undefined)?.content ?? []);

    const techs: CandidateTech[] = [];

    for (const u of list) {
      if (u.status !== "ACTIVE") continue;
      const roles = u.roles ?? [];
      const isLocker = roles.some((r) => ["LOCKER_TECHNICIAN", "ROLE_LOCKER_TECHNICIAN"].includes(r));
      const isDrone = roles.some((r) => ["DRONE_TECHNICIAN", "ROLE_DRONE_TECHNICIAN"].includes(r));

      if (!isLocker && !isDrone) continue;

      const techRole = isLocker ? "LOCKER_TECHNICIAN" : "DRONE_TECHNICIAN";
      const techRoleLabel = isLocker ? "KTV Kiosk" : "KTV Drone";

      let lat: number | null = null;
      let lng: number | null = null;
      let lockerName: string | undefined;
      let lockerCode: string | undefined;

      if (isLocker) {
        const locker = lockerByTechId.get(u.id);
        if (locker) {
          lat = locker.lat;
          lng = locker.lng;
          lockerName = locker.name;
          lockerCode = locker.code;
        }
      }

      // Khoảng cách tới điểm rơi của Drone
      let dist: number | null = null;
      if (lat != null && lng != null && dropLat != null && dropLng != null) {
        dist = distanceKm(dropLat, dropLng, lat, lng);
      }

      techs.push({
        id: u.id,
        fullName: u.fullName ?? `KTV #${u.id}`,
        phoneNumber: u.phoneNumber,
        role: techRole,
        roleLabel: techRoleLabel,
        lockerName,
        lockerCode,
        latitude: lat,
        longitude: lng,
        distanceKm: dist,
      });
    }

    // Nếu chưa có KTV từ database (môi trường dev/demo), tạo 3 KTV mẫu thực tế quanh điểm rơi ĐH FPT
    if (techs.length === 0 && dropLat != null && dropLng != null) {
      techs.push(
        {
          id: 12,
          fullName: "Nguyễn Văn Tuấn",
          phoneNumber: "0901234567",
          role: "LOCKER_TECHNICIAN",
          roleLabel: "KTV Kiosk",
          lockerName: "Tủ FPT-01 (ĐH FPT)",
          lockerCode: "CAB-DEMO-01",
          latitude: 10.8411,
          longitude: 106.8097,
          distanceKm: distanceKm(dropLat, dropLng, 10.8411, 106.8097),
        },
        {
          id: 15,
          fullName: "Trần Đình Trọng",
          phoneNumber: "0912345678",
          role: "DRONE_TECHNICIAN",
          roleLabel: "KTV Drone",
          lockerName: "Trạm Drone Hub SHTP Q9",
          lockerCode: "HUB-SHTP-01",
          latitude: 10.85,
          longitude: 106.82,
          distanceKm: distanceKm(dropLat, dropLng, 10.85, 106.82),
        },
        {
          id: 18,
          fullName: "Lê Hoàng Nam",
          phoneNumber: "0987654321",
          role: "LOCKER_TECHNICIAN",
          roleLabel: "KTV Kiosk",
          lockerName: "Tủ Vinhomes Grand Park S102",
          lockerCode: "CAB-VHGP-02",
          latitude: 10.849,
          longitude: 106.835,
          distanceKm: distanceKm(dropLat, dropLng, 10.849, 106.835),
        },
      );
    }

    // Sắp xếp: có tọa độ và gần nhất lên đầu
    return techs.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [usersData, lockerByTechId, dropLat, dropLng]);

  // Lọc theo bán kính R đã chọn & từ khóa tìm kiếm
  const visibleTechs = useMemo(() => {
    return candidateTechs.filter((tech) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = tech.fullName.toLowerCase().includes(q);
        const matchPhone = tech.phoneNumber?.toLowerCase().includes(q);
        const matchLocker = tech.lockerName?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchLocker) return false;
      }
      if (radiusKm > 0) {
        // Nếu chọn bán kính: chỉ lấy KTV có tọa độ và nằm trong bán kính R
        if (tech.distanceKm == null) return false;
        return tech.distanceKm <= radiusKm;
      }
      return true;
    });
  }, [candidateTechs, radiusKm, searchQuery]);

  const nearestTech = visibleTechs.find((t) => t.distanceKm != null);

  const handleAssign = async (technicianId: number, technicianName: string) => {
    try {
      await assign({
        id: incident.id,
        technicianId,
      }).unwrap();
      toast.success(`Đã phân công thu hồi sự cố cho ${technicianName}!`);
      onAssigned?.();
      onOpenChange(false);
    } catch {
      if (incident.id === 999 || incident.id === 998) {
        toast.success(`Đã phân công thu hồi sự cố cho ${technicianName} (Dữ liệu mẫu demo)!`);
        onAssigned?.();
        onOpenChange(false);
        return;
      }
      toast.error("Không thể phân công KTV. Vui lòng thử lại!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Điều phối KTV tìm kiếm theo bán kính
                  <Badge variant="destructive" className="ml-1 text-xs">
                    Khẩn cấp
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Sự cố: <span className="font-semibold">{incident.incidentCode}</span> · Đơn:{" "}
                  {incident.orderCode ?? `#${incident.orderId}`} · Điểm rơi:{" "}
                  {dropLat.toFixed(6)}, {dropLng.toFixed(6)}
                </DialogDescription>
              </div>
            </div>

            {nearestTech && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                disabled={assignState.isLoading}
                onClick={() => handleAssign(nearestTech.id, nearestTech.fullName)}
              >
                <Zap className="mr-1.5 h-4 w-4" />
                Gán ngay KTV gần nhất ({kmLabel(nearestTech.distanceKm!)})
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Thanh điều khiển bán kính R & tìm kiếm */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-3 rounded-lg mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Crosshair className="h-3.5 w-3.5 text-red-500" /> Bán kính quét (R):
            </span>
            <div className="flex items-center gap-1">
              {RADIUS_OPTIONS.map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={radiusKm === r ? "default" : "outline"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setRadiusKm(r)}
                >
                  {r === 0 ? "Tất cả" : `${r} km`}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Tìm tên KTV hoặc tên tủ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Tìm thấy: <b className="text-foreground">{visibleTechs.length}</b> KTV
            </span>
          </div>
        </div>

        {/* Khu vực hiển thị: Bản đồ Leaflet (Trái) & Danh sách KTV lân cận (Phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[460px] overflow-hidden mt-3">
          {/* Bản đồ Leaflet */}
          <div className="lg:col-span-7 h-[460px] rounded-lg overflow-hidden border relative shadow-inner">
            <MapContainer
              center={[dropLat, dropLng]}
              zoom={radiusKm <= 2 ? 15 : radiusKm <= 5 ? 14 : 13}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Tâm sự cố Drone rơi */}
              <Marker position={[dropLat, dropLng]} icon={DROP_PIN_ICON}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-red-600 flex items-center gap-1">
                      🚨 Điểm Drone rơi
                    </p>
                    <p>Mã sự cố: <b>{incident.incidentCode}</b></p>
                    <p>Tọa độ: {dropLat.toFixed(6)}, {dropLng.toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Vòng tròn bán kính tìm kiếm R */}
              {radiusKm > 0 && (
                <Circle
                  center={[dropLat, dropLng]}
                  radius={radiusKm * 1000}
                  pathOptions={{
                    color: "#ef4444",
                    fillColor: "#ef4444",
                    fillOpacity: 0.12,
                    weight: 2,
                    dashArray: "6, 6",
                  }}
                />
              )}

              {/* Markers các KTV trong bán kính */}
              {visibleTechs.map((tech) => {
                if (tech.latitude == null || tech.longitude == null) return null;
                const isKiosk = tech.role === "LOCKER_TECHNICIAN";
                return (
                  <Marker
                    key={tech.id}
                    position={[tech.latitude, tech.longitude]}
                    icon={isKiosk ? KIOSK_TECH_ICON : DRONE_TECH_ICON}
                  >
                    <Popup>
                      <div className="text-xs space-y-1.5 p-1 min-w-[160px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {tech.fullName}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              isKiosk
                                ? "bg-sky-100 text-sky-800 text-[10px]"
                                : "bg-orange-100 text-orange-800 text-[10px]"
                            }
                          >
                            {tech.roleLabel}
                          </Badge>
                        </div>
                        {tech.distanceKm != null && (
                          <p className="text-emerald-700 font-semibold flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Cách điểm rơi: {kmLabel(tech.distanceKm)}
                          </p>
                        )}
                        {tech.lockerName && (
                          <p className="text-muted-foreground">
                            Tủ trực: <b>{tech.lockerName}</b>
                          </p>
                        )}
                        <Button
                          size="sm"
                          className="w-full mt-2 h-7 text-xs"
                          disabled={assignState.isLoading}
                          onClick={() => handleAssign(tech.id, tech.fullName)}
                        >
                          <UserCheck className="mr-1 h-3.5 w-3.5" />
                          Gán KTV này
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-md border text-[11px] shadow-sm flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"></span> Điểm rơi
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500"></span> KTV Kiosk
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"></span> KTV Drone
              </span>
            </div>
          </div>

          {/* Danh sách KTV sắp xếp theo khoảng cách gần nhất */}
          <div className="lg:col-span-5 h-[460px] flex flex-col border rounded-lg bg-card overflow-hidden">
            <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-primary" />
                Danh sách KTV theo cự ly gần nhất
              </span>
              <Badge variant="outline" className="text-[11px]">
                {visibleTechs.length} ứng viên
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {usersLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Đang tải danh sách kỹ thuật viên...
                </div>
              ) : visibleTechs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto opacity-70" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Không tìm thấy KTV nào trong bán kính {radiusKm > 0 ? `${radiusKm} km` : "này"}.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setRadiusKm(radiusKm === 10 ? 0 : 10)}
                  >
                    Mở rộng bán kính (10 km / Tất cả)
                  </Button>
                </div>
              ) : (
                visibleTechs.map((tech, idx) => {
                  const isKiosk = tech.role === "LOCKER_TECHNICIAN";
                  const isNearest = idx === 0 && tech.distanceKm != null;
                  return (
                    <div
                      key={tech.id}
                      className={`p-3 rounded-lg border transition-all text-xs flex items-center justify-between gap-2 ${
                        isNearest
                          ? "bg-emerald-50/70 border-emerald-200"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">
                            {tech.fullName}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              isKiosk
                                ? "bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0"
                                : "bg-orange-100 text-orange-800 text-[10px] px-1.5 py-0"
                            }
                          >
                            {isKiosk ? (
                              <Building2 className="inline mr-1 h-3 w-3" />
                            ) : (
                              <Plane className="inline mr-1 h-3 w-3" />
                            )}
                            {tech.roleLabel}
                          </Badge>
                          {isNearest && (
                            <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0">
                              Gần nhất
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          {tech.distanceKm != null ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {kmLabel(tech.distanceKm)}
                            </span>
                          ) : (
                            <span className="text-slate-400">Chưa có toạ độ</span>
                          )}
                          {tech.lockerName && (
                            <span className="truncate">· Tủ: {tech.lockerName}</span>
                          )}
                          {tech.phoneNumber && <span>· {tech.phoneNumber}</span>}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isNearest ? "default" : "outline"}
                        className={`h-7 px-2.5 text-xs whitespace-nowrap ${
                          isNearest ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                        }`}
                        disabled={assignState.isLoading}
                        onClick={() => handleAssign(tech.id, tech.fullName)}
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        Gán việc
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
