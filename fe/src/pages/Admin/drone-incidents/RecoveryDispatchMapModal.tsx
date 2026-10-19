import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  AlertTriangle,
  Building2,
  Check,
  Crosshair,
  MapPin,
  Navigation,
  Plane,
  Radio,
  Search,
  ShieldCheck,
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
import {
  useGetTechnicianPresencesQuery,
  type TechnicianPresenceResponse,
} from "~/stores/apis/admin/lockerOps";
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
  onDuty: boolean;
  lockerName?: string;
  lockerCode?: string;
  latitude: number | null;
  longitude: number | null;
  deviceInfo?: string | null;
  distanceKm: number | null;
}

const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 0] as const;

function getShortTechName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
}

function createTechMarkerIcon(
  role: "LOCKER_TECHNICIAN" | "DRONE_TECHNICIAN",
  fullName: string,
  distanceKm: number | null,
  isSelected: boolean,
  onDuty: boolean,
) {
  const isKiosk = role === "LOCKER_TECHNICIAN";
  const shortName = getShortTechName(fullName);
  const distLabel = distanceKm != null ? ` · ${kmLabel(distanceKm)}` : "";

  const bgGradient = isKiosk
    ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
    : "linear-gradient(135deg, #f97316 0%, #c2410c 100%)";

  const borderColor = isSelected ? "#10b981" : "#ffffff";
  const ringShadow = isSelected
    ? "box-shadow: 0 0 0 3.5px rgba(16, 185, 129, 0.5), 0 6px 14px rgba(0,0,0,0.35); transform: scale(1.08);"
    : "box-shadow: 0 3px 8px rgba(0,0,0,0.25);";

  const subBadge = isKiosk
    ? `<div style="
        position:absolute;
        bottom:-2px;
        right:-3px;
        width:16px;
        height:16px;
        border-radius:9999px;
        background:#ffffff;
        border:1.5px solid #0284c7;
        box-shadow:0 1px 3px rgba(0,0,0,0.25);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:9px;
        line-height:1;
      ">🏢</div>`
    : `<div style="
        position:absolute;
        bottom:-2px;
        right:-3px;
        width:16px;
        height:16px;
        border-radius:9999px;
        background:#ffffff;
        border:1.5px solid #ea580c;
        box-shadow:0 1px 3px rgba(0,0,0,0.25);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:9px;
        line-height:1;
      ">🚁</div>`;

  const statusDot = onDuty
    ? `<span style="
        position:absolute;
        top:-2px;
        right:-2px;
        width:9px;
        height:9px;
        border-radius:9999px;
        background:#10b981;
        border:1.5px solid #ffffff;
        box-shadow:0 0 4px #10b981;
      "></span>`
    : `<span style="
        position:absolute;
        top:-2px;
        right:-2px;
        width:8px;
        height:8px;
        border-radius:9999px;
        background:#94a3b8;
        border:1.5px solid #ffffff;
      "></span>`;

  const userSvg = `
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  `;

  const pillStyle = isSelected
    ? "background:#065f46; color:#a7f3d0; border:1px solid #10b981; font-weight:700;"
    : "background:rgba(15,23,42,0.85); color:#ffffff; border:1px solid rgba(255,255,255,0.25); font-weight:600;";

  return L.divIcon({
    className: "",
    iconSize: [120, 56],
    iconAnchor: [60, 17],
    popupAnchor: [0, -22],
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        width:120px;
        cursor:pointer;
        user-select:none;
      ">
        <div style="
          position:relative;
          width:34px;
          height:34px;
          border-radius:9999px;
          background:${bgGradient};
          border:2px solid ${borderColor};
          ${ringShadow}
          display:flex;
          align-items:center;
          justify-content:center;
          transition:all 0.15s ease-in-out;
        ">
          ${userSvg}
          ${subBadge}
          ${statusDot}
        </div>
        <div style="
          margin-top:2px;
          padding:1px 6px;
          border-radius:9999px;
          ${pillStyle}
          box-shadow:0 1.5px 4px rgba(0,0,0,0.25);
          font-size:10px;
          line-height:13px;
          white-space:nowrap;
          max-width:115px;
          overflow:hidden;
          text-overflow:ellipsis;
          backdrop-filter:blur(3px);
        ">
          ${shortName}${distLabel}
        </div>
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

function MapAutoBounds({
  dropLat,
  dropLng,
  techs,
}: {
  dropLat: number;
  dropLng: number;
  techs: CandidateTech[];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [[dropLat, dropLng]];
    for (const t of techs) {
      if (t.latitude != null && t.longitude != null) {
        points.push([t.latitude, t.longitude]);
      }
    }

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else {
      map.setView([dropLat, dropLng], 15);
    }
  }, [map, dropLat, dropLng, techs]);

  return null;
}

export function RecoveryDispatchMapModal({
  open,
  onOpenChange,
  incident,
  onAssigned,
}: RecoveryDispatchMapModalProps) {
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [dutyFilter, setDutyFilter] = useState<"ALL" | "ON_DUTY">("ALL");
  const [selectedTechId, setSelectedTechId] = useState<number | null>(
    incident.recoveryAssignedToUserId ?? null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [assign, assignState] = useAssignDroneRecoveryMutation();

  const { data: usersData, isLoading: usersLoading } = useGetAllUsersQuery({
    page: 0,
    size: 1000,
  });
  const { data: lockersData } = useGetAllLockersQuery({ page: 0, size: 1000 });
  const { data: presencesData } = useGetTechnicianPresencesQuery(
    { all: true },
    { pollingInterval: 10_000 },
  );

  const dropLat = incident.dropLatitude ?? 10.84159;
  const dropLng = incident.dropLongitude ?? 106.81024;

  const presenceByUserId = useMemo(() => {
    const map = new Map<number, TechnicianPresenceResponse>();
    const list = presencesData?.data ?? [];
    for (const p of list) {
      map.set(p.userId, p);
    }
    return map;
  }, [presencesData]);

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
      name?: string;
      phoneNumber?: string | null;
      status?: string;
      roles?: string[];
    };
    const userList: RawUser[] = Array.isArray(raw)
      ? raw
      : ((raw as { content?: RawUser[] } | undefined)?.content ?? []);

    const userMap = new Map<number, RawUser>();
    for (const u of userList) {
      userMap.set(u.id, u);
    }

    const allTechIds = new Set<number>();
    for (const u of userList) {
      if (u.status && u.status !== "ACTIVE") continue;
      const roles = u.roles ?? [];
      if (
        roles.some((r) =>
          [
            "LOCKER_TECHNICIAN",
            "ROLE_LOCKER_TECHNICIAN",
            "DRONE_TECHNICIAN",
            "ROLE_DRONE_TECHNICIAN",
          ].includes(r),
        )
      ) {
        allTechIds.add(u.id);
      }
    }
    for (const p of presenceByUserId.values()) {
      allTechIds.add(p.userId);
    }

    const techs: CandidateTech[] = [];

    for (const techId of allTechIds) {
      const u = userMap.get(techId);
      const presence = presenceByUserId.get(techId);
      const locker = lockerByTechId.get(techId);

      const roles = u?.roles ?? [];
      const isDrone =
        roles.some((r) => r.includes("DRONE")) ||
        presence?.technicianType === "DRONE_TECHNICIAN";

      const techRole = isDrone ? "DRONE_TECHNICIAN" : "LOCKER_TECHNICIAN";
      const techRoleLabel = isDrone ? "KTV Drone" : "KTV Kiosk";

      let lat: number | null =
        presence?.latitude != null ? Number(presence.latitude) : null;
      let lng: number | null =
        presence?.longitude != null ? Number(presence.longitude) : null;

      if ((lat == null || lng == null) && locker?.lat != null && locker?.lng != null) {
        lat = locker.lat;
        lng = locker.lng;
      }

      let dist: number | null = null;
      if (lat != null && lng != null && dropLat != null && dropLng != null) {
        dist = distanceKm(dropLat, dropLng, lat, lng);
      }

      techs.push({
        id: techId,
        fullName: u?.fullName || u?.name || presence?.userName || `KTV #${techId}`,
        phoneNumber: u?.phoneNumber ?? null,
        role: techRole,
        roleLabel: techRoleLabel,
        onDuty: presence?.onDuty ?? true,
        lockerName: locker?.name,
        lockerCode: locker?.code,
        latitude: lat,
        longitude: lng,
        deviceInfo: presence?.deviceInfo ?? null,
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
          onDuty: true,
          lockerName: "Tủ FPT-01 (ĐH FPT)",
          lockerCode: "CAB-DEMO-01",
          latitude: 10.8411,
          longitude: 106.8097,
          deviceInfo: "Samsung Galaxy A53",
          distanceKm: distanceKm(dropLat, dropLng, 10.8411, 106.8097),
        },
        {
          id: 15,
          fullName: "Trần Đình Trọng",
          phoneNumber: "0912345678",
          role: "DRONE_TECHNICIAN",
          roleLabel: "KTV Drone",
          onDuty: true,
          lockerName: "Trạm Drone Hub SHTP Q9",
          lockerCode: "HUB-SHTP-01",
          latitude: 10.85,
          longitude: 106.82,
          deviceInfo: "Xiaomi 13T Pro",
          distanceKm: distanceKm(dropLat, dropLng, 10.85, 106.82),
        },
        {
          id: 18,
          fullName: "Lê Hoàng Nam",
          phoneNumber: "0987654321",
          role: "LOCKER_TECHNICIAN",
          roleLabel: "KTV Kiosk",
          onDuty: false,
          lockerName: "Tủ Vinhomes Grand Park S102",
          lockerCode: "CAB-VHGP-02",
          latitude: 10.849,
          longitude: 106.835,
          deviceInfo: "iPhone 14 Pro",
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
  }, [usersData, presenceByUserId, lockerByTechId, dropLat, dropLng]);

  const onDutyCount = useMemo(
    () => candidateTechs.filter((t) => t.onDuty).length,
    [candidateTechs],
  );

  // Lọc theo bán kính R đã chọn, ca trực & từ khóa tìm kiếm
  const visibleTechs = useMemo(() => {
    return candidateTechs.filter((tech) => {
      if (dutyFilter === "ON_DUTY" && !tech.onDuty) return false;

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
  }, [candidateTechs, dutyFilter, radiusKm, searchQuery]);

  const mappableTechs = useMemo(() => {
    return visibleTechs.filter(
      (t) => t.latitude != null && t.longitude != null,
    );
  }, [visibleTechs]);

  const nearestTech = visibleTechs.find((t) => t.distanceKm != null);
  const canAssign = ["OPEN", "AWAITING_ASSIGNMENT", "ASSIGNED"].includes(
    incident.recoveryStatus,
  );

  const handleAssign = async (technicianId: number, technicianName: string) => {
    if (!canAssign) return;
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
                  Bản đồ vị trí KTV & Điều phối tìm kiếm
                  <Badge
                    variant={canAssign ? "destructive" : "outline"}
                    className={
                      canAssign
                        ? "ml-1 text-xs"
                        : "ml-1 text-xs bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                    }
                  >
                    {canAssign ? "Khẩn cấp" : "Đã tiếp nhận"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Sự cố: <span className="font-semibold">{incident.incidentCode}</span> · Đơn:{" "}
                  {incident.orderCode ?? `#${incident.orderId}`} · Điểm rơi:{" "}
                  {dropLat.toFixed(6)}, {dropLng.toFixed(6)}
                </DialogDescription>
              </div>
            </div>

            {canAssign ? (
              nearestTech && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                  disabled={assignState.isLoading}
                  onClick={() => handleAssign(nearestTech.id, nearestTech.fullName)}
                >
                  <Zap className="mr-1.5 h-4 w-4" />
                  Gán ngay KTV gần nhất ({kmLabel(nearestTech.distanceKm!)})
                </Button>
              )
            ) : (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-300 py-1.5 px-3 font-semibold text-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                KTV đã tiếp nhận (Chế độ theo dõi)
              </Badge>
            )}
          </div>
        </DialogHeader>

        {!canAssign && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2 mt-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              <b>Kỹ thuật viên đã tiếp nhận nhiệm vụ.</b> Bản đồ hiện ở chế độ theo dõi vị trí thực tế của KTV và điểm rơi. Quản trị viên không thể phân công lại.
            </span>
          </div>
        )}

        {/* Thanh điều khiển bán kính R, Ca trực & tìm kiếm */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-3 rounded-lg mt-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Crosshair className="h-3.5 w-3.5 text-red-500" /> Bán kính:
              </span>
              <div className="flex items-center gap-1">
                {RADIUS_OPTIONS.map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={radiusKm === r ? "default" : "outline"}
                    className={`h-7 text-xs px-2.5 ${
                      radiusKm === r ? "font-bold shadow-2xs" : ""
                    }`}
                    onClick={() => setRadiusKm(r)}
                  >
                    {r === 0 ? "Tất cả" : `${r} km`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
              <Button
                size="sm"
                variant={dutyFilter === "ALL" ? "default" : "outline"}
                className={`h-7 text-xs px-2.5 ${dutyFilter === "ALL" ? "font-bold shadow-2xs" : ""}`}
                onClick={() => setDutyFilter("ALL")}
              >
                Tất cả ({candidateTechs.length})
              </Button>
              <Button
                size="sm"
                variant={dutyFilter === "ON_DUTY" ? "default" : "outline"}
                className={`h-7 text-xs px-2.5 ${
                  dutyFilter === "ON_DUTY"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs"
                    : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                }`}
                onClick={() => setDutyFilter("ON_DUTY")}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                Đang trực ({onDutyCount})
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-56 sm:w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Tìm tên KTV hoặc tên tủ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Bản đồ: <b className="text-slate-900">{mappableTechs.length}</b> KTV
            </span>
          </div>
        </div>

        {/* Khu vực hiển thị: Bản đồ Leaflet (Trái) & Danh sách KTV lân cận (Phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[460px] overflow-hidden mt-3">
          {/* Bản đồ Leaflet */}
          <div className="lg:col-span-7 h-[460px] rounded-lg overflow-hidden border relative shadow-inner bg-slate-100">
            <MapContainer
              center={[dropLat, dropLng]}
              zoom={14}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Tự động canh góc nhìn bao gồm điểm rơi & các KTV */}
              <MapAutoBounds
                dropLat={dropLat}
                dropLng={dropLng}
                techs={mappableTechs}
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
                    fillOpacity: 0.08,
                    weight: 2,
                    dashArray: "6, 6",
                  }}
                />
              )}

              {/* Markers các KTV trong bán kính với User Avatar */}
              {mappableTechs.map((tech) => {
                const isKiosk = tech.role === "LOCKER_TECHNICIAN";
                const isSelected = selectedTechId === tech.id;
                const icon = createTechMarkerIcon(
                  tech.role,
                  tech.fullName,
                  tech.distanceKm,
                  isSelected,
                  tech.onDuty,
                );

                return (
                  <Marker
                    key={tech.id}
                    position={[tech.latitude!, tech.longitude!]}
                    icon={icon}
                    eventHandlers={{
                      click: () => setSelectedTechId(tech.id),
                    }}
                  >
                    {/* Tooltip khi rê chuột - Không dùng permanent để tránh rối mắt */}
                    <Tooltip direction="top" offset={[0, -22]}>
                      <div className="text-xs p-1 space-y-0.5 font-sans min-w-[130px]">
                        <p className="font-bold text-slate-900">{tech.fullName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {tech.roleLabel} ·{" "}
                          <span
                            className={
                              tech.onDuty
                                ? "text-emerald-600 font-semibold"
                                : "text-slate-500"
                            }
                          >
                            {tech.onDuty ? "🟢 Đang trực" : "⚪ Ngoài ca"}
                          </span>
                        </p>
                        {tech.distanceKm != null && (
                          <p className="text-[11px] text-emerald-700 font-semibold">
                            Khoảng cách: {kmLabel(tech.distanceKm)}
                          </p>
                        )}
                      </div>
                    </Tooltip>

                    <Popup>
                      <div className="text-xs space-y-1.5 p-1 min-w-[160px]">
                        <div className="flex items-center justify-between gap-2 border-b pb-1">
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
                        <p className="text-[11px] text-muted-foreground">
                          Ca trực:{" "}
                          <b
                            className={
                              tech.onDuty ? "text-emerald-700" : "text-slate-500"
                            }
                          >
                            {tech.onDuty ? "Đang trong ca trực" : "Ngoài ca"}
                          </b>
                        </p>
                        {tech.lockerName && (
                          <p className="text-[11px] text-muted-foreground">
                            Tủ trực: <b>{tech.lockerName}</b>
                          </p>
                        )}
                        {tech.phoneNumber && (
                          <p className="text-[11px] text-muted-foreground font-mono">
                            📞 {tech.phoneNumber}
                          </p>
                        )}
                        {canAssign ? (
                          <Button
                            size="sm"
                            className="w-full mt-2 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            disabled={assignState.isLoading}
                            onClick={() => handleAssign(tech.id, tech.fullName)}
                          >
                            <UserCheck className="mr-1 h-3.5 w-3.5" />
                            Phân công KTV này
                          </Button>
                        ) : tech.id === incident.recoveryAssignedToUserId ? (
                          <div className="mt-2 text-center py-1 px-2 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            ✓ Đang phụ trách nhiệm vụ
                          </div>
                        ) : (
                          <div className="mt-2 text-center text-muted-foreground italic text-[11px]">
                            (Đã khóa phân công)
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Chú giải góc bản đồ theo Icon User chuẩn */}
            <div className="absolute bottom-2 left-2 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] shadow-sm flex items-center gap-3 select-none">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-2xs"></span>
                Điểm rơi
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-white text-[10px] shadow-2xs">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-white border border-sky-600 flex items-center justify-center text-[7px] leading-none">
                    🏢
                  </span>
                </span>
                KTV Kiosk
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-white text-[10px] shadow-2xs">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-white border border-orange-600 flex items-center justify-center text-[7px] leading-none">
                    🚁
                  </span>
                </span>
                KTV Drone
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-2xs"></span>
                Đang trong ca
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
                  const isSelected = selectedTechId === tech.id;
                  const isAssigned =
                    tech.id === incident.recoveryAssignedToUserId;

                  return (
                    <div
                      key={tech.id}
                      onClick={() => setSelectedTechId(tech.id)}
                      className={`p-3 rounded-lg border transition-all text-xs flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50/90 border-emerald-500 shadow-2xs ring-1 ring-emerald-500"
                          : isAssigned
                          ? "bg-sky-50/70 border-sky-300"
                          : isNearest
                          ? "bg-emerald-50/50 border-emerald-200"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              tech.onDuty ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                            title={tech.onDuty ? "Đang trong ca" : "Ngoài ca"}
                          />
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

                      {canAssign ? (
                        <Button
                          size="sm"
                          variant={isSelected || isNearest ? "default" : "outline"}
                          className={`h-7 px-2.5 text-xs whitespace-nowrap ${
                            isSelected || isNearest
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : ""
                          }`}
                          disabled={assignState.isLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssign(tech.id, tech.fullName);
                          }}
                        >
                          <UserCheck className="mr-1 h-3 w-3" />
                          Gán việc
                        </Button>
                      ) : tech.id === incident.recoveryAssignedToUserId ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 whitespace-nowrap">
                          ✓ Đang phụ trách
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic whitespace-nowrap">
                          Đã khóa gán
                        </span>
                      )}
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
