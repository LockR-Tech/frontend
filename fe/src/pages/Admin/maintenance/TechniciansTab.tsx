import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  type LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery, useUpdateUserStatusMutation } from "~/stores/apis/admin/users";
import type { TechnicianSummary } from "./technician-detail";
import { getStoredSlaExtensions, isDroneReport, isReportOverdue, getStoredScheduleTechAssignments } from "./maintenancePhotos";

interface TechniciansTabProps {
  onAssignToTech?: (techId: number) => void;
}

export function TechniciansTab({ onAssignToTech }: TechniciansTabProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [penaltyFilter, setPenaltyFilter] = useState("ALL");
  const [specialtyFilter, setSpecialtyFilter] = useState<"ALL" | "KIOSK" | "DRONE">("ALL");

  // Fetch all users with role LOCKER_TECHNICIAN or DRONE_TECHNICIAN
  const { data: usersData, isLoading: isLoadingUsers, refetch: refetchUsers } = useGetAllUsersQuery({
    page: 0,
    size: 1000,
  });

  // Fetch all maintenance reports to aggregate workload per technician
  const { data: reportsData, refetch: refetchReports } = useGetAllAdminReportsQuery();

  // Fetch periodic schedules to show assigned periodic kiosks
  const { data: schedulesData } = useGetMaintenanceSchedulesQuery();
  const schedules = schedulesData?.data ?? [];
  const localAssignments = getStoredScheduleTechAssignments();

  const getAssignedCount = (techId: number) => {
    return schedules.filter((s) => {
      if (localAssignments[s.id]?.technicianId !== undefined) {
        return localAssignments[s.id].technicianId === techId;
      }
      return s.assignedTechnicianId === techId;
    }).length;
  };

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
        const specialtyLabel = isKiosk ? "KTV Kiosk (Tủ Kiosk)" : "KTV Drone (Đội bay & Pin)";

        const storedPhone = (() => {
          try {
            return localStorage.getItem(`tech_phone_${u.id}`);
          } catch {
            return null;
          }
        })();

        return {
          id: u.id,
          fullName: u.fullName || u.name || `KTV #${u.id}`,
          email: u.email || "",
          phoneNumber: storedPhone || u.phoneNumber || "",
          status: (u.status || "ACTIVE").toUpperCase(),
          imageUrl: u.imageUrl || "",
          enabled: (u.status || "ACTIVE").toUpperCase() === "ACTIVE",
          roles,
          specialty,
          specialtyLabel,
        };
      });
  }, [usersData]);

  // Compute workload and SLA penalty metrics per technician
  const techMetrics = useMemo(() => {
    const slaExtensions = getStoredSlaExtensions();
    const metrics: Record<
      number,
      {
        inProgress: number;
        resolved: number;
        overdue: number;
        total: number;
        penaltyLevel: "NORMAL" | "WARNING" | "RESTRICTED" | "SUSPENDED";
      }
    > = {};

    for (const tech of technicians) {
      const techReports = reports.filter((r) => {
        if (tech.specialty === "KIOSK" && isDroneReport(r)) return false;
        if (tech.specialty === "DRONE" && !isDroneReport(r)) return false;
        if (r.assignedToUserId === tech.id) return true;
        if (!r.assignedToUserId && r.userId === tech.id) return true;
        return false;
      });
      const inProgress = techReports.filter((r) => r.status === "IN_PROGRESS").length;
      const resolved = techReports.filter((r) => r.status === "RESOLVED").length;
      const overdue = techReports.filter((r) => r.status === "IN_PROGRESS" && isReportOverdue(r, slaExtensions[r.id])).length;

      let penaltyLevel: "NORMAL" | "WARNING" | "RESTRICTED" | "SUSPENDED" = "NORMAL";
      if (!tech.enabled || overdue >= 5) {
        penaltyLevel = "SUSPENDED";
      } else if (overdue >= 3) {
        penaltyLevel = "RESTRICTED";
      } else if (overdue >= 1) {
        penaltyLevel = "WARNING";
      }

      metrics[tech.id] = {
        inProgress,
        resolved,
        overdue,
        total: techReports.length,
        penaltyLevel,
      };
    }

    return metrics;
  }, [technicians, reports]);

  // KPI calculations
  const totalTechs = technicians.length;
  const kioskTechs = technicians.filter((t) => t.specialty === "KIOSK").length;
  const droneTechs = technicians.filter((t) => t.specialty === "DRONE").length;
  const activeTechs = technicians.filter((t) => t.enabled).length;
  const workingTechs = technicians.filter((t) => (techMetrics[t.id]?.inProgress ?? 0) > 0).length;
  const warningTechs = technicians.filter((t) => {
    const p = techMetrics[t.id]?.penaltyLevel;
    return p === "WARNING" || p === "RESTRICTED" || p === "SUSPENDED";
  }).length;

  // Filter technicians
  const filteredTechs = useMemo(() => {
    return technicians.filter((t) => {
      const matchSearch =
        t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.phoneNumber && t.phoneNumber.includes(searchQuery));

      if (!matchSearch) return false;

      if (specialtyFilter !== "ALL" && t.specialty !== specialtyFilter) {
        return false;
      }

      const pLevel = techMetrics[t.id]?.penaltyLevel ?? "NORMAL";
      if (penaltyFilter === "ALL") return true;
      if (penaltyFilter === "ACTIVE") return t.enabled;
      if (penaltyFilter === "WARNING") return pLevel === "WARNING";
      if (penaltyFilter === "RESTRICTED") return pLevel === "RESTRICTED";
      if (penaltyFilter === "SUSPENDED") return pLevel === "SUSPENDED" || !t.enabled;

      return true;
    });
  }, [technicians, searchQuery, specialtyFilter, penaltyFilter, techMetrics]);

  const handleToggleStatus = async (tech: TechnicianSummary) => {
    const newEnabled = !tech.enabled;
    const actionText = newEnabled ? "Mở khóa" : "Đình chỉ";
    try {
      await updateStatus({
        id: tech.id,
        data: { enabled: newEnabled },
      }).unwrap();
      toast.success(`${actionText} tài khoản KTV thành công`, {
        description: `KTV ${tech.fullName} hiện đang ở trạng thái ${newEnabled ? "Hoạt động" : "Đã đình chỉ"}.`,
      });
      refetchUsers();
    } catch {
      toast.error(`Không thể ${actionText.toLowerCase()} tài khoản`);
    }
  };

  const openDetail = (tech: TechnicianSummary) => {
    navigate(`/admin/maintenance/technicians/${tech.id}`);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Tổng Kỹ thuật viên</p>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{totalTechs}</p>
            <div className="text-[11px] font-medium flex items-center gap-1.5 mt-1 text-slate-600">
              <span className="text-sky-700 font-semibold">{kioskTechs} KTV Kiosk</span>
              <span>·</span>
              <span className="text-purple-700 font-semibold">{droneTechs} KTV Drone</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Đang xử lý sự cố</p>
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{workingTechs}</p>
            <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-blue-600">
              <span>Đang có ca sửa chữa ngoài hiện trường</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Cảnh báo vi phạm SLA</p>
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{warningTechs}</p>
            <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-amber-600">
              <span>{warningTechs > 0 ? "Cần đôn đốc tiến độ" : "0 vi phạm tiến độ"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Chỉ số chất lượng CSAT</p>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1">4.8 / 5.0</p>
            <div className="text-[11px] font-medium flex items-center gap-1 mt-1 text-emerald-600">
              <ShieldCheck className="w-3 h-3" />
              <span>Đánh giá từ khách hàng hài lòng</span>
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
                Chế tài Quản lý Chất lượng Kỹ thuật viên (3 Cấp độ SLA)
              </h4>
              <p className="text-xs text-indigo-800/80 mt-0.5">
                KTV trễ hạn 1-2 lần sẽ bị Cảnh báo vàng · 3-4 lần bị Hạn chế nhận việc · từ 5 lần sẽ Đề xuất đình chỉ & Khóa tài khoản.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-100/70 text-amber-800 border-amber-300 text-xs">
              🟡 Cấp 1: Nhắc nhở
            </Badge>
            <Badge variant="outline" className="bg-orange-100/70 text-orange-800 border-orange-300 text-xs">
              🟠 Cấp 2: Tạm ngưng việc
            </Badge>
            <Badge variant="outline" className="bg-rose-100/70 text-rose-800 border-rose-300 text-xs">
              🔴 Cấp 3: Đình chỉ
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
                Danh sách Đội ngũ Kỹ thuật viên ({filteredTechs.length})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Theo dõi tình trạng hoạt động, khối lượng công việc và mức độ tuân thủ của từng nhân sự
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên, SĐT, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <Select value={specialtyFilter} onValueChange={(val: any) => setSpecialtyFilter(val)}>
                <SelectTrigger className="w-48 h-8 text-xs bg-background">
                  <SelectValue placeholder="Lọc chuyên môn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả chuyên môn ({totalTechs})</SelectItem>
                  <SelectItem value="KIOSK">🔧 KTV Kiosk - Sửa tủ ({kioskTechs})</SelectItem>
                  <SelectItem value="DRONE">✈️ KTV Drone - Đội bay ({droneTechs})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={penaltyFilter} onValueChange={setPenaltyFilter}>
                <SelectTrigger className="w-44 h-8 text-xs bg-background">
                  <SelectValue placeholder="Lọc theo chế tài" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                  <SelectItem value="WARNING">🟡 Cảnh báo SLA</SelectItem>
                  <SelectItem value="RESTRICTED">🟠 Bị hạn chế nhận việc</SelectItem>
                  <SelectItem value="SUSPENDED">🔴 Đã đình chỉ / Khóa</SelectItem>
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
                Không tìm thấy kỹ thuật viên nào phù hợp bộ lọc.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTechs.map((tech) => {
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
                                {tech.phoneNumber || "Chưa có SĐT"}
                              </p>
                              {/* Specialty Badge */}
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {tech.specialty === "KIOSK" ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-sky-50 text-sky-800 border-sky-300 text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5"
                                  >
                                    <Wrench className="w-2.5 h-2.5 text-sky-600" />
                                    KTV Kiosk (Tủ Kiosk)
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5"
                                  >
                                    <Plane className="w-2.5 h-2.5 text-purple-600" />
                                    KTV Drone (Đội bay)
                                  </Badge>
                                )}
                                {tech.specialty === "KIOSK" && getAssignedCount(tech.id) > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-medium flex items-center gap-1 px-1.5 py-0.5"
                                  >
                                    <Calendar className="w-2.5 h-2.5 text-blue-600" />
                                    {getAssignedCount(tech.id)} lịch định kỳ
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
                              ? "Đã đình chỉ"
                              : isRestricted
                              ? "Hạn chế việc"
                              : isWarning
                              ? "Cảnh báo SLA"
                              : "Hoạt động tốt"}
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
                          <span className="text-muted-foreground">Tình trạng tải:</span>
                          <span className="font-medium text-foreground">
                            {metrics.inProgress === 0
                              ? "🟢 Đang rảnh rỗi"
                              : metrics.inProgress >= 3
                              ? `🔴 Đang tải cao (${metrics.inProgress} việc)`
                              : `🔵 Đang xử lý (${metrics.inProgress} việc)`}
                          </span>
                        </div>

                        {/* Metrics summary */}
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t text-center">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Đang làm</span>
                            <span className="text-xs font-bold text-blue-600 block mt-0.5">
                              {metrics.inProgress}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Đã xong</span>
                            <span className="text-xs font-bold text-emerald-600 block mt-0.5">
                              {metrics.resolved}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Trễ SLA</span>
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
                          Xem chi tiết
                        </Button>

                        {onAssignToTech && tech.enabled && !isSuspended && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => onAssignToTech(tech.id)}
                          >
                            <Boxes className="w-3.5 h-3.5" />
                            Giao việc
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
                          title={tech.enabled ? "Đình chỉ KTV này" : "Mở khóa KTV"}
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
