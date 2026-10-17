import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Users,
  Search,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  Star,
  Ban,
  Unlock,
  Wrench,
  Boxes,
  ShieldCheck,
  AlertOctagon,
  Eye,
  Send,
  Plane,
  Calendar,
  MapPin,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import {
  useGetAllAdminReportsQuery,
  useGetMaintenanceSchedulesQuery,
  useGetTechnicianPerformanceQuery,
  useGetTechnicianPresencesQuery,
  type LockerReportResponse,
  type TechnicianPerformanceResponse,
  type TechnicianPresenceResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery, useUpdateUserStatusMutation } from "~/stores/apis/admin/users";
import { formatDateTime } from "~/lib/datetime";
import { useWebSocket } from "~/hooks/useWebSocket";
import type { TechnicianSummary } from "./technician-detail";
import { isDroneReport } from "./maintenancePhotos";

interface TechniciansTabProps {
  onAssignToTech?: (techId: number, specialty: "KIOSK" | "DRONE") => void;
}

type PenaltyLevel = TechnicianPerformanceResponse["penaltyLevel"];

/// Không render gì — chỉ đăng ký query hiệu suất của một KTV (hook không gọi trong vòng lặp được)
/// rồi đẩy kết quả lên danh sách để lọc/đếm theo mức chế tài server tính.
function TechnicianPerformanceSync({
  techId,
  onData,
}: {
  techId: number;
  onData: (techId: number, perf: TechnicianPerformanceResponse) => void;
}) {
  const { data } = useGetTechnicianPerformanceQuery(techId);
  const perf = data?.data;
  useEffect(() => {
    if (perf) onData(techId, perf);
  }, [perf, techId, onData]);
  return null;
}

export function TechniciansTab({ onAssignToTech }: TechniciansTabProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [penaltyFilter, setPenaltyFilter] = useState("ALL");
  const [specialtyFilter, setSpecialtyFilter] = useState<"ALL" | "KIOSK" | "DRONE">("ALL");
  const [shiftFilter, setShiftFilter] = useState<"ALL" | "ON_DUTY" | "OFF_DUTY">("ALL");
  const [perfById, setPerfById] = useState<Record<number, TechnicianPerformanceResponse>>({});
  const handlePerf = useCallback((techId: number, perf: TechnicianPerformanceResponse) => {
    setPerfById((prev) => (prev[techId] === perf ? prev : { ...prev, [techId]: perf }));
  }, []);

  // Fetch all users with role LOCKER_TECHNICIAN or DRONE_TECHNICIAN
  const { data: usersData, isLoading: isLoadingUsers, refetch: refetchUsers } = useGetAllUsersQuery({
    page: 0,
    size: 1000,
  });

  // Fetch live technician presences and shift status (poll every 15s as background sync)
  const { data: presencesData, refetch: refetchPresences } = useGetTechnicianPresencesQuery({ all: true }, {
    pollingInterval: 15000,
  });

  const [realtimePresences, setRealtimePresences] = useState<Record<number, TechnicianPresenceResponse>>({});

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
          latitude: msg.latitude != null ? Number(msg.latitude) : prev[userId]?.latitude ?? null,
          longitude: msg.longitude != null ? Number(msg.longitude) : prev[userId]?.longitude ?? null,
          accuracyM: msg.accuracyM != null ? Number(msg.accuracyM) : prev[userId]?.accuracyM ?? null,
          headingDeg: msg.headingDeg != null ? Number(msg.headingDeg) : prev[userId]?.headingDeg ?? null,
          speedMs: msg.speedMs != null ? Number(msg.speedMs) : prev[userId]?.speedMs ?? null,
          altitudeM: msg.altitudeM != null ? Number(msg.altitudeM) : prev[userId]?.altitudeM ?? null,
          batteryLevel: msg.batteryLevel != null ? Number(msg.batteryLevel) : prev[userId]?.batteryLevel ?? null,
          deviceInfo: msg.deviceInfo ?? prev[userId]?.deviceInfo,
          shiftStartedAt: msg.shiftStartedAt ?? prev[userId]?.shiftStartedAt,
          shiftEndedAt: msg.shiftEndedAt ?? prev[userId]?.shiftEndedAt,
          lastLocatedAt: msg.lastLocatedAt ?? prev[userId]?.lastLocatedAt ?? new Date().toISOString(),
          updatedAt: msg.updatedAt ?? new Date().toISOString(),
        },
      }));
      refetchPresences();
    };

    const subPresence = subscribe<any>("/topic/technicians/presence", handlePresenceMessage);
    const subNotif = subscribe<any>("/topic/notifications", (msg) => {
      if (msg?.type === "technician.presence.updated" || msg?.type === "TECHNICIAN_PRESENCE_UPDATED") {
        handlePresenceMessage(msg);
      }
    });

    return () => {
      subPresence?.unsubscribe();
      subNotif?.unsubscribe();
    };
  }, [subscribe, refetchPresences]);

  // Fetch all maintenance reports to aggregate workload per technician
  const { data: reportsData, refetch: refetchReports } = useGetAllAdminReportsQuery();

  // Fetch periodic schedules to show assigned periodic kiosks
  const { data: schedulesData } = useGetMaintenanceSchedulesQuery();
  const schedules = schedulesData?.data ?? [];

  const getAssignedCount = (techId: number) =>
    schedules.filter((s) => s.assignedTechnicianId === techId).length;

  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateUserStatusMutation();

  const reports: LockerReportResponse[] = reportsData?.data ?? [];

  // Extract technicians from users list and classify their specialty
  // LOCKER_TECHNICIAN: KTV sửa tủ Kiosk
  // DRONE_TECHNICIAN: KTV sửa Drone
  const technicians: TechnicianSummary[] = useMemo(() => {
    const raw = usersData?.data as unknown;
    const list: any[] = Array.isArray(raw)
      ? raw
      : (raw as { content?: any[] })?.content ?? [];

    return list
      .filter((u) => {
        const roles: string[] = u.roles ?? [];
        return (
          roles.includes("LOCKER_TECHNICIAN") ||
          roles.includes("ROLE_LOCKER_TECHNICIAN") ||
          roles.includes("DRONE_TECHNICIAN")
        );
      })
      .map((u) => {
        const roles: string[] = u.roles ?? [];
        const isKiosk =
          roles.includes("LOCKER_TECHNICIAN") ||
          roles.includes("ROLE_LOCKER_TECHNICIAN");
        const specialty: "KIOSK" | "DRONE" = isKiosk ? "KIOSK" : "DRONE";
        const specialtyLabel = isKiosk
          ? t("admin.maintenance.specialty.kiosk")
          : t("admin.maintenance.specialty.drone");

        return {
          id: u.id,
          fullName: u.fullName || u.name || t("admin.maintenance.techFallback", { id: u.id }),
          email: u.email || "",
          phoneNumber: u.phoneNumber || "",
          status: (u.status || "ACTIVE").toUpperCase(),
          imageUrl: u.imageUrl || "",
          enabled: (u.status || "ACTIVE").toUpperCase() === "ACTIVE",
          roles,
          specialty,
          specialtyLabel,
        };
      });
  }, [usersData, t]);

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

  // Khối lượng việc + mức chế tài: lấy từ endpoint hiệu suất của server (ngưỡng admin cấu hình).
  // Khi hiệu suất KTV chưa tải xong thì đếm tạm từ danh sách phiếu (cờ `overdue` do server tính).
  const techMetrics = useMemo(() => {
    const metrics: Record<
      number,
      {
        inProgress: number;
        resolved: number;
        overdue: number;
        total: number;
        penaltyLevel: PenaltyLevel;
      }
    > = {};

    for (const tech of technicians) {
      const perf = perfById[tech.id];
      // Chỉ tính phiếu được giao cho KTV (KTV tự báo đã được server giao luôn)
      const techReports = reports.filter((r) => {
        if (tech.specialty === "KIOSK" && isDroneReport(r)) return false;
        if (tech.specialty === "DRONE" && !isDroneReport(r)) return false;
        return r.assignedToUserId === tech.id;
      });

      metrics[tech.id] = {
        inProgress: perf?.inProgress ?? techReports.filter((r) => r.status === "IN_PROGRESS").length,
        resolved: perf?.resolved ?? techReports.filter((r) => r.status === "RESOLVED").length,
        overdue: perf?.overdue ?? techReports.filter((r) => r.overdue === true).length,
        total: perf?.totalAssigned ?? techReports.length,
        penaltyLevel: !tech.enabled ? "SUSPENDED" : perf?.penaltyLevel ?? "NORMAL",
      };
    }

    return metrics;
  }, [technicians, reports, perfById]);

  // CSAT toàn đội = trung bình có trọng số theo số lượt đánh giá của từng KTV
  const csat = useMemo(() => {
    let count = 0;
    let sum = 0;
    for (const tech of technicians) {
      const perf = perfById[tech.id];
      if (!perf || !perf.ratingCount) continue;
      count += perf.ratingCount;
      sum += perf.averageRating * perf.ratingCount;
    }
    return count > 0 ? { average: sum / count, count } : null;
  }, [technicians, perfById]);

  // KPI calculations
  const totalTechs = technicians.length;
  const kioskTechs = technicians.filter((t) => t.specialty === "KIOSK").length;
  const droneTechs = technicians.filter((t) => t.specialty === "DRONE").length;
  const activeTechs = technicians.filter((t) => t.enabled).length;
  const onDutyCount = useMemo(() => {
    let count = 0;
    for (const t of technicians) {
      if (presenceByUserId.get(t.id)?.onDuty) count++;
    }
    return count;
  }, [technicians, presenceByUserId]);
  const workingTechs = technicians.filter((t) => (techMetrics[t.id]?.inProgress ?? 0) > 0).length;
  const warningTechs = technicians.filter((t) => {
    const p = techMetrics[t.id]?.penaltyLevel;
    return p === "WARNING" || p === "RESTRICTED" || p === "SUSPENDED";
  }).length;

  // Filter technicians
  const filteredTechs = useMemo(() => {
    return technicians.filter((t) => {
      const presence = presenceByUserId.get(t.id);
      const q = searchQuery.toLowerCase();
      const matchSearch =
        t.fullName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (presence?.deviceInfo && presence.deviceInfo.toLowerCase().includes(q)) ||
        (t.phoneNumber && t.phoneNumber.includes(searchQuery));

      if (!matchSearch) return false;

      if (specialtyFilter !== "ALL" && t.specialty !== specialtyFilter) {
        return false;
      }

      if (shiftFilter !== "ALL") {
        const isOnDuty = Boolean(presenceByUserId.get(t.id)?.onDuty);
        if (shiftFilter === "ON_DUTY" && !isOnDuty) return false;
        if (shiftFilter === "OFF_DUTY" && isOnDuty) return false;
      }

      const pLevel = techMetrics[t.id]?.penaltyLevel ?? "NORMAL";
      if (penaltyFilter === "ALL") return true;
      if (penaltyFilter === "ACTIVE") return t.enabled;
      if (penaltyFilter === "WARNING") return pLevel === "WARNING";
      if (penaltyFilter === "RESTRICTED") return pLevel === "RESTRICTED";
      if (penaltyFilter === "SUSPENDED") return pLevel === "SUSPENDED" || !t.enabled;

      return true;
    });
  }, [technicians, searchQuery, specialtyFilter, shiftFilter, penaltyFilter, techMetrics, presenceByUserId]);

  const handleToggleStatus = async (tech: TechnicianSummary) => {
    const newEnabled = !tech.enabled;
    try {
      await updateStatus({
        id: tech.id,
        data: { status: newEnabled ? "ACTIVE" : "INACTIVE" },
      }).unwrap();
      toast.success(
        newEnabled
          ? t("admin.maintenance.techTab.unlockSuccess")
          : t("admin.maintenance.techTab.suspendSuccess"),
        {
          description: newEnabled
            ? t("admin.maintenance.techTab.nowActive", { name: tech.fullName })
            : t("admin.maintenance.techTab.nowSuspended", { name: tech.fullName }),
        },
      );
      refetchUsers();
    } catch {
      toast.error(
        newEnabled
          ? t("admin.maintenance.techTab.unlockFailed")
          : t("admin.maintenance.account.suspendFailed"),
      );
    }
  };

  const openDetail = (tech: TechnicianSummary) => {
    navigate(`/admin/maintenance/technicians/${tech.id}`);
  };

  return (
    <div className="space-y-6">
      {technicians.map((t) => (
        <TechnicianPerformanceSync key={t.id} techId={t.id} onData={handlePerf} />
      ))}

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.techTab.totalTechs")}</p>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{totalTechs}</p>
            <div className="text-[11px] font-medium flex items-center gap-1.5 mt-1 text-slate-600">
              <span className="text-sky-700 font-semibold">{t("admin.maintenance.techTab.kioskTechCount", { count: kioskTechs })}</span>
              <span>·</span>
              <span className="text-purple-700 font-semibold">{t("admin.maintenance.techTab.droneTechCount", { count: droneTechs })}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.techTab.working")}</p>
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{workingTechs}</p>
            <div className="text-[11px] font-medium flex items-center justify-between gap-1 mt-1">
              <span className="text-blue-600">{t("admin.maintenance.techTab.workingDesc")}</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onDutyCount} trực ca
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.techTab.slaWarnings")}</p>
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{warningTechs}</p>
            <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-amber-600">
              <span>{warningTechs > 0 ? t("admin.maintenance.techTab.needsFollowUp") : t("admin.maintenance.techTab.noViolations")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">{t("admin.maintenance.techTab.csat")}</p>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {csat ? `${csat.average.toFixed(1)} / 5.0` : "—"}
            </p>
            <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-emerald-600">
              <ShieldCheck className="w-3 h-3" />
              <span>{csat ? t("admin.maintenance.techTab.csatFrom", { count: csat.count }) : t("admin.maintenance.techTab.noRatings")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Policy Banner */}
      <Card className="border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-slate-50 border shadow-xs">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-indigo-950">
                {t("admin.maintenance.techTab.policyTitle")}
              </h4>
              <p className="text-xs text-indigo-800/80 mt-0.5">
                {t("admin.maintenance.techTab.policyDesc")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-100/70 text-amber-800 border-amber-300 text-xs">
              {t("admin.maintenance.techTab.level1")}
            </Badge>
            <Badge variant="outline" className="bg-orange-100/70 text-orange-800 border-orange-300 text-xs">
              {t("admin.maintenance.techTab.level2")}
            </Badge>
            <Badge variant="outline" className="bg-rose-100/70 text-rose-800 border-rose-300 text-xs">
              {t("admin.maintenance.techTab.level3")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                {t("admin.maintenance.techTab.listTitle", { count: filteredTechs.length })}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t("admin.maintenance.techTab.listDesc")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("admin.maintenance.techTab.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <Select value={shiftFilter} onValueChange={(val: any) => setShiftFilter(val)}>
                <SelectTrigger className="w-40 h-8 text-xs bg-background">
                  <SelectValue placeholder="Ca trực" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả ca trực</SelectItem>
                  <SelectItem value="ON_DUTY">🟢 Đang trong ca ({onDutyCount})</SelectItem>
                  <SelectItem value="OFF_DUTY">⚪ Ngoài ca ({technicians.length - onDutyCount})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={specialtyFilter} onValueChange={(val: any) => setSpecialtyFilter(val)}>
                <SelectTrigger className="w-44 h-8 text-xs bg-background">
                  <SelectValue placeholder={t("admin.maintenance.techTab.specialtyFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("admin.maintenance.techTab.allSpecialties", { count: totalTechs })}</SelectItem>
                  <SelectItem value="KIOSK">{t("admin.maintenance.techTab.kioskSpecialty", { count: kioskTechs })}</SelectItem>
                  <SelectItem value="DRONE">{t("admin.maintenance.techTab.droneSpecialty", { count: droneTechs })}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={penaltyFilter} onValueChange={setPenaltyFilter}>
                <SelectTrigger className="w-40 h-8 text-xs bg-background">
                  <SelectValue placeholder={t("admin.maintenance.techTab.penaltyFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("admin.maintenance.techTab.allStatuses")}</SelectItem>
                  <SelectItem value="ACTIVE">{t("admin.maintenance.account.active")}</SelectItem>
                  <SelectItem value="WARNING">{t("admin.maintenance.techTab.warningOption")}</SelectItem>
                  <SelectItem value="RESTRICTED">{t("admin.maintenance.techTab.restrictedOption")}</SelectItem>
                  <SelectItem value="SUSPENDED">{t("admin.maintenance.techTab.suspendedOption")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {filteredTechs.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground font-medium">
                {t("admin.maintenance.techTab.noMatch")}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTechs.map((tech) => {
                const presence = presenceByUserId.get(tech.id);
                const metrics = techMetrics[tech.id] || {
                  inProgress: 0,
                  resolved: 0,
                  overdue: 0,
                  total: 0,
                  penaltyLevel: "NORMAL",
                };

                const isWarning = metrics.penaltyLevel === "WARNING";
                const isRestricted = metrics.penaltyLevel === "RESTRICTED";
                const isSuspended = metrics.penaltyLevel === "SUSPENDED" || !tech.enabled;

                return (
                  <Card
                    key={tech.id}
                    className={`border shadow-xs hover:shadow-md transition-all rounded-xl relative overflow-hidden ${
                      isSuspended
                        ? "border-rose-200/80 bg-rose-50/20"
                        : isRestricted
                        ? "border-orange-200/80 bg-orange-50/15"
                        : isWarning
                        ? "border-amber-200/80 bg-amber-50/15"
                        : "border-border/80"
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                      <div>
                        {/* Top: Avatar & Name */}
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => openDetail(tech)}
                          >
                            <div className="w-11 h-11 rounded-xl bg-muted border border-border/70 flex items-center justify-center text-sm font-bold text-foreground overflow-hidden shrink-0 group-hover:border-foreground/40 transition-colors">
                              {tech.imageUrl ? (
                                <img
                                  src={tech.imageUrl}
                                  alt={tech.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                tech.fullName?.charAt(0)?.toUpperCase() || "K"
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:underline">
                                  {tech.fullName}
                                </h4>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  #{tech.id}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {tech.phoneNumber || t("admin.maintenance.noPhone")}
                              </p>
                              {/* Specialty Badge */}
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {tech.specialty === "KIOSK" ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-sky-50 text-sky-800 border-sky-300 text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5"
                                  >
                                    <Wrench className="w-2.5 h-2.5 text-sky-600" />
                                    {t("admin.maintenance.specialty.kiosk")}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5"
                                  >
                                    <Plane className="w-2.5 h-2.5 text-purple-600" />
                                    {t("admin.maintenance.specialty.droneFleet")}
                                  </Badge>
                                )}
                                {getAssignedCount(tech.id) > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-medium flex items-center gap-1 px-1.5 py-0.5"
                                  >
                                    <Calendar className="w-2.5 h-2.5 text-blue-600" />
                                    {t("admin.maintenance.techTab.scheduleCount", { count: getAssignedCount(tech.id) })}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <Badge
                            variant="outline"
                            className={
                              isSuspended
                                ? "bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-semibold"
                                : isRestricted
                                ? "bg-orange-100 text-orange-800 border-orange-300 text-[10px] font-semibold"
                                : isWarning
                                ? "bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-semibold"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold"
                            }
                          >
                            {isSuspended
                              ? (tech.enabled ? t("admin.maintenance.techTab.recommendSuspend") : t("admin.maintenance.techTab.suspended"))
                              : isRestricted
                              ? t("admin.maintenance.techTab.restricted")
                              : isWarning
                              ? t("admin.maintenance.techTab.slaWarning")
                              : t("admin.maintenance.techTab.good")}
                          </Badge>
                        </div>

                        {/* Email */}
                        {tech.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2 truncate">
                            <Mail className="w-3 h-3 shrink-0 text-muted-foreground" />
                            {tech.email}
                          </p>
                        )}

                        {/* Workload Status Pill */}
                        <div className="mt-3 p-2 rounded-lg bg-muted/40 border border-border/50 text-xs flex items-center justify-between">
                          <span className="text-muted-foreground">{t("admin.maintenance.techTab.load")}</span>
                          <span className="font-medium text-foreground">
                            {metrics.inProgress === 0
                              ? t("admin.maintenance.techTab.idle")
                              : metrics.inProgress >= 3
                              ? t("admin.maintenance.techTab.highLoad", { count: metrics.inProgress })
                              : t("admin.maintenance.techTab.busy", { count: metrics.inProgress })}
                          </span>
                        </div>

                        {/* Shift & GPS Location Status Pill */}
                        <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  presence?.onDuty
                                    ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                                    : "bg-slate-300"
                                }`}
                              />
                              Ca trực:
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold px-1.5 py-0 ${
                                presence?.onDuty
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {presence?.onDuty ? "Đang trong ca" : "Ngoài ca"}
                            </Badge>
                          </div>

                          {presence?.latitude != null && presence?.longitude != null ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${presence.latitude},${presence.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="pt-1.5 border-t border-border/40 flex items-start gap-1.5 text-[11px] text-sky-700 hover:text-sky-800 hover:underline group cursor-pointer"
                              title={`Tọa độ: ${presence.latitude}, ${presence.longitude}${
                                presence.lastLocatedAt ? ` (Cập nhật: ${formatDateTime(presence.lastLocatedAt)})` : ""
                              }`}
                            >
                              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                              <span className="line-clamp-2 leading-tight">
                                {presence.deviceInfo
                                  ? `${presence.deviceInfo} (${presence.latitude.toFixed(4)}, ${presence.longitude.toFixed(4)})`
                                  : `${presence.latitude.toFixed(4)}, ${presence.longitude.toFixed(4)}`}
                              </span>
                            </a>
                          ) : (
                            <div className="pt-1 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Chưa có vị trí</span>
                            </div>
                          )}
                        </div>

                        {/* Metrics summary */}
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t text-center">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">{t("admin.maintenance.metrics.inProgress")}</span>
                            <span className="text-xs font-bold text-blue-600 block mt-0.5">
                              {metrics.inProgress}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">{t("admin.maintenance.metrics.done")}</span>
                            <span className="text-xs font-bold text-emerald-600 block mt-0.5">
                              {metrics.resolved}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">{t("admin.maintenance.metrics.slaLate")}</span>
                            <span
                              className={`text-xs font-bold block mt-0.5 ${
                                metrics.overdue > 0 ? "text-rose-600" : "text-slate-400"
                              }`}
                            >
                              {metrics.overdue}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs flex-1 gap-1.5 font-medium hover:bg-accent"
                          onClick={() => openDetail(tech)}
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          {t("dropdown.viewDetail")}
                        </Button>

                        {onAssignToTech && tech.enabled && !isSuspended && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => onAssignToTech(tech.id, tech.specialty ?? "KIOSK")}
                          >
                            <Boxes className="w-3.5 h-3.5" />
                            {t("admin.maintenance.techTab.assign")}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant={tech.enabled ? "outline" : "default"}
                          className={`h-8 text-xs px-2.5 ${
                            tech.enabled
                              ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                          onClick={() => handleToggleStatus(tech)}
                          disabled={isUpdatingStatus}
                          title={tech.enabled ? t("admin.maintenance.techTab.suspendThis") : t("admin.maintenance.techTab.unlock")}
                        >
                          {tech.enabled ? <Ban className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
