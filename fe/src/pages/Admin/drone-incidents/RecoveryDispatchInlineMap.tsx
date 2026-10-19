import { useCallback, useEffect, useMemo, useState } from "react";
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
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Navigation,
  Phone,
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
import { useWebSocket } from "~/hooks/useWebSocket";
import { formatDateTime } from "~/lib/datetime";
import { distanceKm, kmLabel } from "../drone-orders/journey";

export interface CandidateTech {
  id: number;
  fullName: string;
  phoneNumber?: string | null;
  email?: string | null;
  role: "LOCKER_TECHNICIAN" | "DRONE_TECHNICIAN";
  roleLabel: string;
  onDuty: boolean;
  lockerName?: string;
  lockerCode?: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM?: number | null;
  deviceInfo?: string | null;
  lastLocatedAt?: string | null;
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

  // Màu gradient:
  // KTV Kiosk: Xanh dương (#0284c7 -> #0369a1)
  // KTV Drone: Cam (#f97316 -> #c2410c)
  const bgGradient = isKiosk
    ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
    : "linear-gradient(135deg, #f97316 0%, #c2410c 100%)";

  const borderColor = isSelected ? "#10b981" : "#ffffff";
  const ringShadow = isSelected
    ? "box-shadow: 0 0 0 3.5px rgba(16, 185, 129, 0.5), 0 6px 14px rgba(0,0,0,0.35); transform: scale(1.08);"
    : "box-shadow: 0 3px 8px rgba(0,0,0,0.25);";

  // Sub-badge mini ở góc dưới phải:
  // KTV Kiosk: 🏢 (tủ/kiosk)
  // KTV Drone: 🚁 (drone)
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

  // Chấm trạng thái ca trực ở góc trên phải
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

  // Icon user SVG chính giữa avatar
  const userSvg = `
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  `;

  // Nhãn tên dạng pill gọn gàng bên dưới avatar
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
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -24],
  html: `
    <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:44px;height:44px;border-radius:9999px;background:rgba(239,68,68,0.35);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width:36px;height:36px;border-radius:9999px;background:#dc2626;border:3px solid #ffffff;box-shadow:0 3px 12px rgba(220,38,38,0.65);color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:18px;">
        🚨
      </div>
    </div>
  `,
});

// Component điều khiển tự động canh chỉnh góc nhìn bản đồ
function MapAutoBounds({
  dropLat,
  dropLng,
  techs,
  triggerFit,
}: {
  dropLat: number;
  dropLng: number;
  techs: CandidateTech[];
  triggerFit: number;
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
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      map.setView([dropLat, dropLng], 15);
    }
  }, [map, dropLat, dropLng, techs, triggerFit]);

  return null;
}

interface RecoveryDispatchInlineMapProps {
  incident: DroneParcelIncident;
  onAssigned?: () => void;
}

export function RecoveryDispatchInlineMap({
  incident,
  onAssigned,
}: RecoveryDispatchInlineMapProps) {
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [dutyFilter, setDutyFilter] = useState<"ALL" | "ON_DUTY">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTechId, setSelectedTechId] = useState<number | null>(
    incident.recoveryAssignedToUserId ?? null,
  );
  const [fitTrigger, setFitTrigger] = useState(0);
  const [assign, assignState] = useAssignDroneRecoveryMutation();

  // 1. Tọa độ điểm rơi sự cố
  const dropLat = incident.dropLatitude ?? 10.84159;
  const dropLng = incident.dropLongitude ?? 106.81024;

  // 2. Fetch danh sách người dùng (User profile)
  const { data: usersData, isLoading: usersLoading } = useGetAllUsersQuery({
    page: 0,
    size: 1000,
  });

  // 3. Fetch danh sách tủ (để lấy tên tủ và toạ độ dự phòng của KTV Kiosk)
  const { data: lockersData } = useGetAllLockersQuery({ page: 0, size: 1000 });

  // 4. Fetch toạ độ GPS thực tế & ca trực của tất cả KTV từ lockerOps
  const {
    data: presencesData,
    isLoading: presencesLoading,
    refetch: refetchPresences,
  } = useGetTechnicianPresencesQuery(
    { all: true },
    { pollingInterval: 10_000 },
  );

  // 5. Kết nối WebSocket đồng bộ realtime toạ độ GPS khi KTV di chuyển
  const [realtimePresences, setRealtimePresences] = useState<
    Record<number, TechnicianPresenceResponse>
  >({});
  const { subscribe } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    if (!subscribe) return;
    const handlePresenceMessage = (msg: any) => {
      if (!msg) return;
      const userId = Number(msg.userId);
      if (!userId || isNaN(userId)) return;

      const nextOnDuty = msg.onDuty === true || msg.onDuty === "true";
      setRealtimePresences((prev) => ({
        ...prev,
        [userId]: {
          ...(prev[userId] || {}),
          userId,
          userName: msg.userName ?? prev[userId]?.userName,
          technicianType: msg.technicianType ?? prev[userId]?.technicianType,
          onDuty: nextOnDuty,
          latitude:
            msg.latitude != null
              ? Number(msg.latitude)
              : prev[userId]?.latitude ?? null,
          longitude:
            msg.longitude != null
              ? Number(msg.longitude)
              : prev[userId]?.longitude ?? null,
          accuracyM:
            msg.accuracyM != null
              ? Number(msg.accuracyM)
              : prev[userId]?.accuracyM ?? null,
          deviceInfo: msg.deviceInfo ?? prev[userId]?.deviceInfo,
          lastLocatedAt:
            msg.lastLocatedAt ??
            prev[userId]?.lastLocatedAt ??
            new Date().toISOString(),
        },
      }));
      refetchPresences();
    };

    const subPresence = subscribe<any>(
      "/topic/technicians/presence",
      handlePresenceMessage,
    );
    const subNotif = subscribe<any>("/topic/notifications", (msg) => {
      if (
        msg?.type === "technician.presence.updated" ||
        msg?.type === "TECHNICIAN_PRESENCE_UPDATED"
      ) {
        handlePresenceMessage(msg);
      }
    });

    return () => {
      subPresence?.unsubscribe();
      subNotif?.unsubscribe();
    };
  }, [subscribe, refetchPresences]);

  // 6. Tổng hợp map presence theo userId
  const presenceByUserId = useMemo(() => {
    const map = new Map<number, TechnicianPresenceResponse>();
    const list = presencesData?.data ?? [];
    for (const p of list) {
      map.set(p.userId, p);
    }
    for (const [userIdStr, p] of Object.entries(realtimePresences)) {
      const id = Number(userIdStr);
      const existing = map.get(id);
      map.set(id, existing ? { ...existing, ...p } : p);
    }
    return map;
  }, [presencesData, realtimePresences]);

  // 7. Map tủ phụ trách theo KTV Kiosk
  const lockerByTechId = useMemo(() => {
    const map = new Map<
      number,
      { name: string; code: string; lat: number; lng: number }
    >();
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

  // 8. Tổng hợp toàn bộ danh sách KTV kèm toạ độ GPS chính xác
  const candidateTechs: CandidateTech[] = useMemo(() => {
    const raw = usersData?.data as unknown;
    type RawUser = {
      id: number;
      fullName?: string;
      name?: string;
      phoneNumber?: string | null;
      email?: string | null;
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

    // Tập hợp ID của tất cả KTV từ users và từ presences
    const allTechIds = new Set<number>();

    // a. Duyệt từ danh sách users
    for (const u of userList) {
      if (u.status && u.status !== "ACTIVE") continue;
      const roles = u.roles ?? [];
      const isTech = roles.some((r) =>
        [
          "LOCKER_TECHNICIAN",
          "ROLE_LOCKER_TECHNICIAN",
          "DRONE_TECHNICIAN",
          "ROLE_DRONE_TECHNICIAN",
        ].includes(r),
      );
      if (isTech) {
        allTechIds.add(u.id);
      }
    }

    // b. Bổ sung từ presenceByUserId (đảm bảo không bỏ sót KTV nào đã có GPS)
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

      // LẤY TỌA ĐỘ GPS:
      // Ưu tiên 1: Toạ độ GPS thực tế từ presence (technician_presences)
      let lat: number | null =
        presence?.latitude != null ? Number(presence.latitude) : null;
      let lng: number | null =
        presence?.longitude != null ? Number(presence.longitude) : null;

      // Ưu tiên 2: Nếu KTV Kiosk chưa cập nhật GPS điện thoại, dùng toạ độ Tủ phụ trách
      if ((lat == null || lng == null) && locker?.lat != null && locker?.lng != null) {
        lat = locker.lat;
        lng = locker.lng;
      }

      // Khoảng cách tới vị trí rơi
      let dist: number | null = null;
      if (lat != null && lng != null && dropLat != null && dropLng != null) {
        dist = distanceKm(dropLat, dropLng, lat, lng);
      }

      techs.push({
        id: techId,
        fullName:
          u?.fullName || u?.name || presence?.userName || `KTV #${techId}`,
        phoneNumber: u?.phoneNumber ?? null,
        email: u?.email ?? null,
        role: techRole,
        roleLabel: techRoleLabel,
        onDuty: presence?.onDuty ?? true,
        lockerName: locker?.name,
        lockerCode: locker?.code,
        latitude: lat,
        longitude: lng,
        accuracyM: presence?.accuracyM ?? null,
        deviceInfo: presence?.deviceInfo ?? null,
        lastLocatedAt: presence?.lastLocatedAt ?? null,
        distanceKm: dist,
      });
    }

    // Sắp xếp: KTV có toạ độ và ở gần điểm rơi nhất lên đầu
    return techs.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [usersData, presenceByUserId, lockerByTechId, dropLat, dropLng]);

  // Số lượng KTV đang trực
  const onDutyCount = useMemo(
    () => candidateTechs.filter((t) => t.onDuty).length,
    [candidateTechs],
  );

  // 9. Lọc theo bán kính R, ca trực & từ khóa tìm kiếm
  const visibleTechs = useMemo(() => {
    return candidateTechs.filter((tech) => {
      if (dutyFilter === "ON_DUTY" && !tech.onDuty) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = tech.fullName.toLowerCase().includes(q);
        const matchPhone = tech.phoneNumber?.toLowerCase().includes(q);
        const matchLocker = tech.lockerName?.toLowerCase().includes(q);
        const matchLocation = tech.deviceInfo?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchLocker && !matchLocation)
          return false;
      }

      if (radiusKm > 0) {
        // Nếu chọn bán kính cụ thể, lọc những KTV có toạ độ nằm trong R
        if (tech.distanceKm == null) return false;
        return tech.distanceKm <= radiusKm;
      }

      // Bán kính "Tất cả": hiển thị toàn bộ
      return true;
    });
  }, [candidateTechs, dutyFilter, radiusKm, searchQuery]);

  // Các KTV có toạ độ hợp lệ để vẽ marker lên bản đồ
  const mappableTechs = useMemo(() => {
    return visibleTechs.filter(
      (t) => t.latitude != null && t.longitude != null,
    );
  }, [visibleTechs]);

  const nearestTech = visibleTechs.find((t) => t.distanceKm != null);
  const canAssign = ["OPEN", "AWAITING_ASSIGNMENT", "ASSIGNED"].includes(
    incident.recoveryStatus,
  );

  const selectedTech =
    candidateTechs.find((t) => t.id === selectedTechId) ?? nearestTech;

  const handleAssign = async (technicianId: number, technicianName: string) => {
    if (!canAssign) return;
    try {
      await assign({
        id: incident.id,
        technicianId,
      }).unwrap();
      toast.success(`Đã phân công kỹ thuật viên ${technicianName} tìm hàng!`);
      setSelectedTechId(technicianId);
      onAssigned?.();
    } catch {
      if (incident.id === 999 || incident.id === 998) {
        toast.success(`Đã phân công ${technicianName} (Demo)`);
        setSelectedTechId(technicianId);
        onAssigned?.();
        return;
      }
      toast.error("Không thể phân công KTV. Vui lòng thử lại!");
    }
  };

  const isLoading = usersLoading || presencesLoading;

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              Bản đồ điều phối & Phân công kỹ thuật viên tìm hàng
              <Badge
                variant={canAssign ? "outline" : "secondary"}
                className={`text-[10px] ${
                  canAssign
                    ? "bg-amber-50 text-amber-800 border-amber-300 font-semibold"
                    : "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                }`}
              >
                {canAssign
                  ? "Chờ KTV tiếp nhận"
                  : "KTV đã tiếp nhận (Khóa phân công)"}
              </Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Bấm trực tiếp vào KTV trên bản đồ hoặc danh sách bên phải để chọn
              và phân công
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAssign && nearestTech && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs"
              disabled={assignState.isLoading}
              onClick={() => handleAssign(nearestTech.id, nearestTech.fullName)}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Gán KTV gần nhất ({nearestTech.fullName} ·{" "}
              {kmLabel(nearestTech.distanceKm!)})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFitTrigger((prev) => prev + 1)}
            className="text-xs h-8"
            title="Căn chỉnh toàn cảnh bản đồ"
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1" />
            Xem toàn cảnh
          </Button>
        </div>
      </div>

      {/* Thông báo nếu đã khóa phân công */}
      {!canAssign && (
        <div className="p-3 rounded-lg bg-emerald-50/90 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-950">
              Kỹ thuật viên{" "}
              {incident.recoveryTechnicianName ||
                `#${incident.recoveryAssignedToUserId}`}{" "}
              đã tiếp nhận nhiệm vụ.
            </p>
            <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
              KTV đang trong quy trình tiếp cận hiện trường và thu hồi kiện. Để
              đảm bảo an toàn vận hành và tính nhất quán của hiện trường, Quản
              trị viên không được phép đổi KTV khác. Bản đồ chuyển sang chế độ
              theo dõi vị trí thực địa.
            </p>
          </div>
        </div>
      )}

      {/* 2. Thanh lọc bán kính R, Ca trực & Tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
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
          <div className="relative w-52 sm:w-60">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm tên KTV, số ĐT, địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-8 bg-slate-50"
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Bản đồ: <b className="text-slate-900">{mappableTechs.length}</b> KTV
          </span>
        </div>
      </div>

      {/* 3. Khu vực Bản đồ Leaflet (Trái) & Danh sách KTV lựa chọn (Phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Bản đồ Leaflet tương tác */}
        <div className="lg:col-span-7 h-[460px] rounded-xl overflow-hidden border border-slate-200 relative shadow-inner bg-slate-100">
          <MapContainer
            center={[dropLat, dropLng]}
            zoom={14}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Điều khiển căn góc nhìn tự động bao gồm Điểm rơi & các KTV */}
            <MapAutoBounds
              dropLat={dropLat}
              dropLng={dropLng}
              techs={mappableTechs}
              triggerFit={fitTrigger}
            />

            {/* Marker Điểm rơi */}
            <Marker position={[dropLat, dropLng]} icon={DROP_PIN_ICON}>
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-red-600 flex items-center gap-1">
                    🚨 Điểm rơi kiện drone
                  </p>
                  <p>
                    Mã sự cố: <b>{incident.incidentCode}</b>
                  </p>
                  <p>
                    Tọa độ: {dropLat.toFixed(6)}, {dropLng.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Vòng tròn bán kính R */}
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

            {/* Markers KTV với Icon User phân biệt Kiosk vs Drone */}
            {mappableTechs.map((tech) => {
              const isKiosk = tech.role === "LOCKER_TECHNICIAN";
              const isSelected = selectedTech?.id === tech.id;
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
                    <div className="text-xs space-y-1.5 p-1 min-w-[190px]">
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

                      <div className="space-y-1 text-slate-700">
                        {tech.distanceKm != null && (
                          <p className="text-emerald-700 font-semibold flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
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
                        {tech.deviceInfo && (
                          <p
                            className="text-[11px] text-muted-foreground truncate"
                            title={tech.deviceInfo}
                          >
                            📍 {tech.deviceInfo}
                          </p>
                        )}
                        {tech.phoneNumber && (
                          <p className="text-[11px] text-muted-foreground font-mono">
                            📞 {tech.phoneNumber}
                          </p>
                        )}
                      </div>

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

        {/* Danh sách KTV lựa chọn & Cột phân công */}
        <div className="lg:col-span-5 h-[460px] flex flex-col border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
          <div className="p-3 border-b bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              Danh sách KTV theo cự ly gần nhất ({visibleTechs.length})
            </span>
            <span className="text-[10px] text-muted-foreground">
              Bấm để chọn KTV
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                Đang tải dữ liệu vị trí GPS của kỹ thuật viên...
              </div>
            ) : visibleTechs.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <AlertTriangle className="h-7 w-7 text-amber-500 mx-auto opacity-70" />
                <p className="text-xs font-medium text-muted-foreground">
                  Không tìm thấy KTV trong bán kính{" "}
                  {radiusKm > 0 ? `${radiusKm} km` : "này"}.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setRadiusKm(0)}
                >
                  Xem tất cả KTV
                </Button>
              </div>
            ) : (
              visibleTechs.map((tech, idx) => {
                const isKiosk = tech.role === "LOCKER_TECHNICIAN";
                const isSelected = selectedTech?.id === tech.id;
                const isAssigned =
                  tech.id === incident.recoveryAssignedToUserId;
                const isNearest = idx === 0 && tech.distanceKm != null;

                return (
                  <div
                    key={tech.id}
                    onClick={() => setSelectedTechId(tech.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-50/90 border-emerald-500 shadow-2xs ring-1 ring-emerald-500"
                        : isAssigned
                        ? "bg-sky-50/70 border-sky-300"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
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
                              ? "bg-sky-100 text-sky-800 text-[9px] px-1.5 py-0"
                              : "bg-orange-100 text-orange-800 text-[9px] px-1.5 py-0"
                          }
                        >
                          {isKiosk ? (
                            <Building2 className="inline mr-0.5 h-2.5 w-2.5" />
                          ) : (
                            <Plane className="inline mr-0.5 h-2.5 w-2.5" />
                          )}
                          {tech.roleLabel}
                        </Badge>
                        {isNearest && (
                          <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0">
                            Gần nhất
                          </Badge>
                        )}
                      </div>

                      {isSelected && (
                        <span className="flex items-center gap-0.5 text-emerald-700 font-bold text-[11px] shrink-0">
                          <Check className="h-3.5 w-3.5" />
                          Đang chọn
                        </span>
                      )}
                      {isAssigned && !isSelected && (
                        <Badge className="bg-sky-600 text-white text-[9px] px-1 py-0 shrink-0">
                          Đã phân công
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                      {tech.distanceKm != null ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {kmLabel(tech.distanceKm)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Chưa có toạ độ</span>
                      )}
                      {tech.deviceInfo && (
                        <span className="truncate max-w-[200px]" title={tech.deviceInfo}>
                          · {tech.deviceInfo}
                        </span>
                      )}
                      {tech.phoneNumber && (
                        <span className="font-mono">· {tech.phoneNumber}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Khung hành động phân công KTV đã chọn */}
          <div className="p-3 border-t bg-slate-50/90 space-y-2">
            {selectedTech ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">
                    KTV đang chọn:
                  </p>
                  <p className="font-bold text-slate-900 text-xs truncate">
                    {selectedTech.fullName} · {selectedTech.roleLabel}{" "}
                    {selectedTech.distanceKm != null &&
                      `(${kmLabel(selectedTech.distanceKm)})`}
                  </p>
                </div>

                {canAssign ? (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-3 shadow-xs shrink-0"
                    disabled={assignState.isLoading}
                    onClick={() =>
                      handleAssign(selectedTech.id, selectedTech.fullName)
                    }
                  >
                    {assignState.isLoading ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Phân công KTV này
                  </Button>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-[10px]"
                  >
                    Đã khóa gán
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic text-center">
                Chọn một kỹ thuật viên trên bản đồ hoặc danh sách để phân công
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
