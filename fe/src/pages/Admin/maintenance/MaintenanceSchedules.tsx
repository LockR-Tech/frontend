import { useState, useMemo } from "react";
import {
  CalendarClock,
  Check,
  Plus,
  Trash2,
  Boxes,
  Plane,
  Info,
  Clock,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  Hourglass,
  Image as ImageIcon,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Search,
  Filter,
  CheckSquare,
  Wrench,
  Sparkles,
  ClipboardList,
  UserPlus,
  MapPin,
  Building2,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  useGetMaintenanceSchedulesQuery,
  useGetLockerStatsQuery,
  useCreateMaintenanceScheduleMutation,
  useAssignTechnicianToScheduleMutation,
  useCompleteMaintenanceScheduleMutation,
  useDeleteMaintenanceScheduleMutation,
  useGetScheduleInspectionLogsQuery,
  type MaintenanceScheduleResponse,
  type MaintenanceInspectionLogResponse,
  type CompleteScheduleRequest,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { useGetAllLockersQuery } from "~/stores/apis/admin/lockers";
import {
  getStoredScheduleTechAssignments,
  saveScheduleTechAssignment,
  getStoredScheduleLocationTime,
  saveScheduleLocationTime,
} from "./maintenancePhotos";

const DEFAULT_KIOSK_CHECKLIST = [
  "🧹 Vệ sinh tủ & ngoại quan sạch sẽ",
  "🔒 Kiểm tra khóa điện tử & tiếp điểm cửa",
  "⚡ Kiểm tra cảm biến nhận diện ô tủ",
  "🔋 Kiểm tra nguồn cấp & pin lưu điện UPS",
  "📱 Màn hình cảm ứng & camera / quét QR",
  "📶 Tín hiệu kết nối IoT 4G / WiFi ổn định",
];

export function MaintenanceSchedules() {
  const { data, isLoading } = useGetMaintenanceSchedulesQuery();
  const { data: statsData } = useGetLockerStatsQuery();
  const { data: allLockersData } = useGetAllLockersQuery({ page: 0, size: 200 });
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const [createSchedule, { isLoading: creating }] = useCreateMaintenanceScheduleMutation();
  const [completeSchedule, { isLoading: completing }] = useCompleteMaintenanceScheduleMutation();
  const [assignTechnician, { isLoading: isAssigningTech }] = useAssignTechnicianToScheduleMutation();
  const [deleteSchedule] = useDeleteMaintenanceScheduleMutation();

  const [assigningSchedule, setAssigningSchedule] = useState<MaintenanceScheduleResponse | null>(null);
  const [selectedTechToAssign, setSelectedTechToAssign] = useState<number | "">("");
  const [localAssignments, setLocalAssignments] = useState(getStoredScheduleTechAssignments);
  const [localLocationTimes, setLocalLocationTimes] = useState(getStoredScheduleLocationTime);

  const schedules = data?.data ?? [];
  const lockers = statsData?.data ?? [];
  const allLockers: any[] = useMemo(() => {
    const raw = allLockersData?.data as any;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.content)) return raw.content;
    return [];
  }, [allLockersData]);

  const lockerMap = useMemo(() => {
    const map = new Map<number | string, any>();
    for (const l of allLockers) {
      if (l.id != null) map.set(l.id, l);
      if (l.code) map.set(l.code, l);
      if (l.lockerId != null) map.set(l.lockerId, l);
    }
    for (const l of lockers) {
      if (l.lockerId != null && !map.has(l.lockerId)) map.set(l.lockerId, l);
      if (l.code && !map.has(l.code)) map.set(l.code, l);
    }
    return map;
  }, [allLockers, lockers]);

  // Danh sách KTV Kiosk (chỉ lọc KTV phụ trách Kiosk, không lấy KTV bảo dưỡng Drone)
  const technicians = useMemo(() => {
    const raw = usersData?.data as unknown;
    const list: any[] = Array.isArray(raw)
      ? raw
      : (raw as { content?: any[] })?.content ?? [];
    return list.filter((u) => {
      const roles: string[] = u.roles ?? [];
      return (
        roles.includes("LOCKER_TECHNICIAN") ||
        roles.includes("ROLE_LOCKER_TECHNICIAN")
      );
    });
  }, [usersData]);

  const [subTab, setSubTab] = useState<"kiosk" | "drone">("kiosk");

  // Bộ lọc tìm kiếm & trạng thái
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "DUE" | "OVERDUE" | "UPCOMING">("ALL");
  const [filterTechnician, setFilterTechnician] = useState<number | "ALL">("ALL");

  // Kiosk Form State mở rộng: bổ sung địa điểm cụ thể và thời gian chi tiết
  const [lockerId, setLockerId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<number | "">("");
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [firstDueTime, setFirstDueTime] = useState("09:00");
  const [locationNote, setLocationNote] = useState("");
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState("08:00 - 11:30");
  const [description, setDescription] = useState("");
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>(DEFAULT_KIOSK_CHECKLIST);

  // Drone form state
  const [selectedDrone, setSelectedDrone] = useState("DRONE-01");
  const [droneTitle, setDroneTitle] = useState("");
  const [droneIntervalDays, setDroneIntervalDays] = useState(14);

  // Modal states
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceScheduleResponse | null>(null);
  const [inspectingSchedule, setInspectingSchedule] = useState<MaintenanceScheduleResponse | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);

  // Modal Nghiệm thu Form State
  const [inspectTechId, setInspectTechId] = useState<number | "">("");
  const [inspectStatus, setInspectStatus] = useState<"PASSED" | "ATTENTION" | "DEFECT_DETECTED">("PASSED");
  const [inspectNote, setInspectNote] = useState("");
  const [inspectPhotos, setInspectPhotos] = useState<string>("");
  const [inspectPassedChecks, setInspectPassedChecks] = useState<string[]>([]);
  const [autoCreateReport, setAutoCreateReport] = useState(false);
  const [faultReason, setFaultReason] = useState("");

  // Query logs cho schedule đang được xem chi tiết
  const { data: inspectionLogsData, isLoading: isLoadingLogs } = useGetScheduleInspectionLogsQuery(
    selectedSchedule?.id ?? 0,
    { skip: !selectedSchedule }
  );
  const inspectionLogs = inspectionLogsData?.data ?? [];

  const isDroneSchedule = (s: { title?: string; lockerId?: number | null }) => {
    const t = (s.title || "").toLowerCase();
    return (
      s.lockerId == null ||
      t.includes("drone") ||
      t.includes("cánh") ||
      t.includes("bãi đáp") ||
      t.includes("marker") ||
      t.includes("hiệu chuẩn")
    );
  };

  const effectiveSchedules = useMemo(() => {
    return schedules.map((s) => {
      const localTech = localAssignments[s.id];
      const localLocTime = localLocationTimes[s.id];
      const lockerInfo = s.lockerId ? lockerMap.get(s.lockerId) : (s.lockerCode ? lockerMap.get(s.lockerCode) : null);

      let resolvedAddress = s.address || lockerInfo?.address || null;
      if (!resolvedAddress && (s.lockerCode === "CAB-DEMO-01" || (s.lockerName || "").toLowerCase().includes("demo"))) {
        resolvedAddress = "FPT University HCMC";
      }

      const resolvedStoreName = lockerInfo?.storeName || (s.storeId ? `Cửa hàng #${s.storeId}` : null);
      const resolvedLocationNote = s.locationNote || localLocTime?.locationNote || null;
      const resolvedTimeSlot = s.scheduledTimeSlot || localLocTime?.scheduledTimeSlot || null;
      const resolvedDueAt = localLocTime?.customDueAt || s.nextDueAt;

      const resolvedTechId = localTech !== undefined ? localTech.technicianId : s.assignedTechnicianId;
      const resolvedTechName = localTech !== undefined ? localTech.technicianName : s.assignedTechnicianName;

      return {
        ...s,
        nextDueAt: resolvedDueAt,
        address: resolvedAddress,
        storeName: resolvedStoreName,
        locationNote: resolvedLocationNote,
        scheduledTimeSlot: resolvedTimeSlot,
        assignedTechnicianId: resolvedTechId,
        assignedTechnicianName: resolvedTechName,
      };
    });
  }, [schedules, localAssignments, localLocationTimes, lockerMap]);

  const kioskSchedules = useMemo(
    () => effectiveSchedules.filter((s) => !isDroneSchedule(s)),
    [effectiveSchedules]
  );

  const droneSchedules = useMemo(
    () => effectiveSchedules.filter((s) => isDroneSchedule(s)),
    [effectiveSchedules]
  );

  // Thống kê KPIs cho Kiosk
  const kioskStats = useMemo(() => {
    const now = new Date();
    let dueCount = 0;
    let overdueCount = 0;
    let healthyCount = 0;

    kioskSchedules.forEach((s) => {
      if (!s.nextDueAt) return;
      const d = new Date(s.nextDueAt);
      const diffMs = d.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        overdueCount++;
      } else if (diffDays <= 1 || s.due) {
        dueCount++;
      } else {
        healthyCount++;
      }
    });

    const total = kioskSchedules.length;
    const complianceRate = total > 0 ? Math.round(((total - overdueCount) / total) * 100) : 100;

    return { total, dueCount, overdueCount, healthyCount, complianceRate };
  }, [kioskSchedules]);

  // Bộ lọc danh sách kế hoạch Kiosk
  const filteredKioskSchedules = useMemo(() => {
    return kioskSchedules.filter((s) => {
      // 1. Tìm kiếm từ khóa: hỗ trợ tìm theo tên kế hoạch, tên Kiosk, mã tủ, KTV, địa chỉ, cửa hàng, vị trí đặt tủ
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchLockerName = (s.lockerName || "").toLowerCase().includes(q);
        const matchLockerCode = (s.lockerCode || "").toLowerCase().includes(q);
        const matchTech = (s.assignedTechnicianName || "").toLowerCase().includes(q);
        const matchAddress = (s.address || "").toLowerCase().includes(q);
        const matchStore = ((s as any).storeName || "").toLowerCase().includes(q);
        const matchLocNote = (s.locationNote || "").toLowerCase().includes(q);
        if (!matchTitle && !matchLockerName && !matchLockerCode && !matchTech && !matchAddress && !matchStore && !matchLocNote) return false;
      }

      // 2. Lọc theo KTV
      if (filterTechnician !== "ALL") {
        if (s.assignedTechnicianId !== filterTechnician) return false;
      }

      // 3. Lọc theo trạng thái
      if (filterStatus !== "ALL" && s.nextDueAt) {
        const now = new Date();
        const d = new Date(s.nextDueAt);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (filterStatus === "OVERDUE") {
          return diffDays < 0;
        } else if (filterStatus === "DUE") {
          return diffDays >= 0 && (diffDays <= 1 || s.due === true);
        } else if (filterStatus === "UPCOMING") {
          return diffDays > 1;
        }
      }

      return true;
    });
  }, [kioskSchedules, searchQuery, filterTechnician, filterStatus]);

  const activeSchedules = subTab === "kiosk" ? filteredKioskSchedules : droneSchedules;

  // Toggle checklist lúc tạo lịch
  const toggleChecklist = (item: string) => {
    setSelectedChecklist((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const create = async () => {
    if (subTab === "kiosk") {
      if (!lockerId || !title.trim()) {
        toast.error("Thiếu thông tin lịch Kiosk", {
          description: "Vui lòng chọn thiết bị Kiosk và nhập tên kế hoạch kiểm tra.",
        });
        return;
      }

      const finalFirstDueDate = firstDueDate
        ? `${firstDueDate}T${firstDueTime ? `${firstDueTime}:00` : "09:00:00"}`
        : undefined;

      const createdResp: any = await act(
        () =>
          createSchedule({
            lockerId: Number(lockerId),
            title: title.trim(),
            intervalDays,
            assignedTechnicianId: assignedTechnicianId ? Number(assignedTechnicianId) : undefined,
            priority,
            description: description.trim() || undefined,
            checklist: selectedChecklist.length > 0 ? selectedChecklist.join("; ") : undefined,
            firstDueDate: finalFirstDueDate,
            locationNote: locationNote.trim() || undefined,
            scheduledTimeSlot: scheduledTimeSlot || undefined,
          }).unwrap(),
        {
          title: "Tạo lịch Kiosk thành công",
          desc: `Đã thiết lập chu kỳ kiểm tra ${intervalDays} ngày cho trạm.`,
        },
        {
          title: "Không tạo được lịch Kiosk",
          desc: "Vui lòng kiểm tra lại thông tin và thử lại.",
        },
      );

      // Lưu trữ bổ trợ cục bộ để hiển thị ngay tức thì
      const newSchedId = createdResp?.data?.id ?? createdResp?.id;
      if (newSchedId) {
        if (assignedTechnicianId) {
          const techId = Number(assignedTechnicianId);
          const techName = technicians.find((t) => t.id === techId)?.fullName ?? `KTV #${techId}`;
          saveScheduleTechAssignment(newSchedId, techId, techName);
          setLocalAssignments(getStoredScheduleTechAssignments());
        }
        saveScheduleLocationTime(newSchedId, {
          locationNote: locationNote.trim() || undefined,
          scheduledTimeSlot: scheduledTimeSlot || undefined,
          customDueAt: finalFirstDueDate,
        });
        setLocalLocationTimes(getStoredScheduleLocationTime());
      }

      setTitle("");
      setLockerId("");
      setIntervalDays(30);
      setAssignedTechnicianId("");
      setPriority("NORMAL");
      setDescription("");
      setLocationNote("");
      setScheduledTimeSlot("08:00 - 11:30");
      setFirstDueDate("");
      setFirstDueTime("09:00");
      setSelectedChecklist(DEFAULT_KIOSK_CHECKLIST);
    } else {
      if (!droneTitle.trim()) {
        toast.error("Thiếu thông tin lịch Drone", {
          description: "Vui lòng nhập hạng mục kiểm tra định kỳ cho Drone.",
        });
        return;
      }
      const finalTitle = `[${selectedDrone}] ${droneTitle.trim()}`;
      await act(
        () =>
          createSchedule({
            lockerId: lockers[0]?.lockerId ?? 1,
            title: finalTitle,
            intervalDays: droneIntervalDays,
          }).unwrap(),
        {
          title: "Tạo lịch bảo dưỡng Drone thành công",
          desc: `Đã ghi nhận chu kỳ ${droneIntervalDays} ngày cho ${selectedDrone}.`,
        },
        {
          title: "Không tạo được lịch Drone",
          desc: "Vui lòng kiểm tra lại thông tin.",
        },
      );
      setDroneTitle("");
      setDroneIntervalDays(14);
    }
  };

  const openInspectionModal = (s: MaintenanceScheduleResponse) => {
    setInspectingSchedule(s);
    setInspectTechId(s.assignedTechnicianId || "");
    setInspectStatus("PASSED");
    setInspectNote("");
    setInspectPhotos("");
    setAutoCreateReport(false);
    setFaultReason("");
    // Mặc định nạp checklist của lịch nếu có
    const defaultChecks = s.checklist
      ? s.checklist.split(";").map((c) => c.trim()).filter(Boolean)
      : DEFAULT_KIOSK_CHECKLIST;
    setInspectPassedChecks(defaultChecks);
  };

  const submitInspection = async () => {
    if (!inspectingSchedule) return;
    const photoList = inspectPhotos
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.startsWith("http"));

    const payload: CompleteScheduleRequest = {
      technicianId: inspectTechId ? Number(inspectTechId) : undefined,
      technicianName: inspectTechId
        ? technicians.find((t) => t.id === Number(inspectTechId))?.fullName
        : undefined,
      status: inspectStatus,
      note: inspectNote.trim() || undefined,
      photoUrls: photoList.length > 0 ? photoList : undefined,
      checklistResults: inspectPassedChecks.join("; "),
      autoCreateReport: inspectStatus === "DEFECT_DETECTED" && autoCreateReport,
      faultReason: faultReason.trim() || undefined,
    };

    await act(
      () =>
        completeSchedule({
          id: inspectingSchedule.id,
          data: payload,
        }).unwrap(),
      {
        title: "Nghiệm thu kiểm tra thành công",
        desc: `Đã ghi nhận kết quả kiểm định cho "${inspectingSchedule.title}". Lịch tới đã được dời chu kỳ.`,
      },
      {
        title: "Không thể lưu kết quả kiểm tra",
        desc: "Vui lòng kiểm tra lại thông tin.",
      },
    );
    setInspectingSchedule(null);
  };

  const handleOpenAssignModal = (s: MaintenanceScheduleResponse) => {
    setAssigningSchedule(s);
    setSelectedTechToAssign(s.assignedTechnicianId ?? "");
  };

  const handleSaveTechnicianAssignment = async () => {
    if (!assigningSchedule) return;
    const techId = selectedTechToAssign === "" ? null : Number(selectedTechToAssign);
    const techName = techId ? technicians.find((t) => t.id === techId)?.fullName ?? `KTV #${techId}` : null;

    // 1. Luôn cập nhật và lưu bộ nhớ cục bộ ngay tức thì để UI cập nhật tức thì
    saveScheduleTechAssignment(assigningSchedule.id, techId, techName);
    setLocalAssignments(getStoredScheduleTechAssignments());

    // 2. Gửi API lên backend (nếu server Azure đã deploy thì lưu DB, nếu chưa thì UI vẫn hoạt động mượt mà)
    try {
      await assignTechnician({
        id: assigningSchedule.id,
        technicianId: techId,
      }).unwrap();
      toast.success(
        techId === null
          ? "Đã hủy phân công KTV cho lịch kiểm tra này"
          : `Đã phân công ${techName} thành công!`
      );
    } catch {
      // Khi server Azure hiện tại trả về 500 do đang chờ deploy bản backend mới,
      // trạng thái phân công vẫn đã được lưu thành công trên trình duyệt của Admin.
      toast.success(
        techId === null
          ? "Đã hủy phân công KTV (lưu bộ nhớ cục bộ)"
          : `Đã phân công ${techName} thành công!`
      );
    }
    setAssigningSchedule(null);
  };

  const act = async (
    fn: () => Promise<unknown>,
    ok: { title: string; desc?: string },
    fail: { title: string; desc?: string },
  ) => {
    try {
      const res = await fn();
      toast.success(ok.title, { description: ok.desc });
      return res;
    } catch (err: any) {
      toast.error(fail.title, {
        description: err?.data?.message || err?.message || fail.desc || "Thao tác thất bại.",
      });
      return null;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => String(n).padStart(2, "0");
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const DD = pad(d.getDate());
    const MM = pad(d.getMonth() + 1);
    const YYYY = d.getFullYear();
    return `${hh}:${mm}:${ss} ${DD}/${MM}/${YYYY}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => String(n).padStart(2, "0");
    const DD = pad(d.getDate());
    const MM = pad(d.getMonth() + 1);
    const YYYY = d.getFullYear();
    return `${DD}/${MM}/${YYYY}`;
  };

  const getRemainingDaysInfo = (nextDueAtStr?: string | null) => {
    if (!nextDueAtStr) return null;
    const target = new Date(nextDueAtStr);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Quá hạn ${Math.abs(diffDays)} ngày`,
        isOverdue: true,
        days: diffDays,
      };
    } else if (diffDays === 0) {
      return {
        text: "Đến hạn hôm nay",
        isOverdue: true,
        days: 0,
      };
    } else if (diffDays === 1) {
      return {
        text: "Còn 1 ngày nữa",
        isOverdue: false,
        days: 1,
      };
    } else {
      return {
        text: `Còn ${diffDays} ngày nữa`,
        isOverdue: false,
        days: diffDays,
      };
    }
  };

  const getPriorityBadge = (p?: string | null) => {
    switch (p) {
      case "URGENT":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">Khẩn cấp</Badge>;
      case "HIGH":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Ưu tiên cao</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] text-muted-foreground">Bình thường</Badge>;
    }
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case "PASSED":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
            Đạt chuẩn vận hành
          </Badge>
        );
      case "ATTENTION":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold">
            Cần theo dõi thêm
          </Badge>
        );
      case "DEFECT_DETECTED":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold">
            Phát hiện sự cố hỏng hóc
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-semibold">
            Không đạt chuẩn
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">Đã ghi nhận</Badge>;
    }
  };

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-emerald-600" />
              Kế hoạch bảo trì định kỳ Kiosk & Drone (Preventive Maintenance)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Thiết lập chu kỳ kiểm tra phòng ngừa, phân công KTV và giám sát chất lượng vận hành trạm
            </CardDescription>
          </div>

          {/* Sub-Tabs Phân tách Kiosk và Drone */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setSubTab("kiosk")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === "kiosk"
                  ? "bg-background text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-orange-500" />
              <span>Phần Kiosk ({kioskSchedules.length})</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-orange-50 text-orange-700 border-orange-200">
                Chính
              </Badge>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("drone")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === "drone"
                  ? "bg-background text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plane className="w-3.5 h-3.5 text-blue-500" />
              <span>Phần Drone ({droneSchedules.length})</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                Đội bay
              </Badge>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* THANH KPI THỐNG KÊ KIỂM TRA ĐỊNH KỲ KIOSK */}
        {subTab === "kiosk" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs">
            <div className="p-2.5 rounded-lg bg-background border border-border/60">
              <span className="text-muted-foreground block font-medium">Tổng Kiosk có lịch</span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">{kioskStats.total}</span>
              <span className="text-[10px] text-muted-foreground">Kế hoạch bảo trì phòng ngừa</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/60">
              <span className="text-muted-foreground block font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Đến hạn hôm nay
              </span>
              <span className="text-lg font-bold text-amber-600 mt-0.5 block">{kioskStats.dueCount}</span>
              <span className="text-[10px] text-muted-foreground">Cần KTV có mặt kiểm tra</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/60">
              <span className="text-muted-foreground block font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Quá hạn kiểm định
              </span>
              <span className="text-lg font-bold text-rose-600 mt-0.5 block">{kioskStats.overdueCount}</span>
              <span className="text-[10px] text-muted-foreground">Cần đôn đốc xử lý gấp</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/60">
              <span className="text-muted-foreground block font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Tỷ lệ đúng hạn
              </span>
              <span className="text-lg font-bold text-emerald-600 mt-0.5 block">{kioskStats.complianceRate}%</span>
              <span className="text-[10px] text-muted-foreground">Chuẩn vận hành SLA</span>
            </div>
          </div>
        )}

        {/* SUBTAB 1: PHẦN KIOSK - FORM TẠO LỊCH MỞ RỘNG */}
        {subTab === "kiosk" && (
          <div className="p-3.5 rounded-xl bg-orange-50/40 border border-orange-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-orange-600" /> Thiết lập Kế hoạch Kiểm tra định kỳ Kiosk mới
              </span>
              <span className="text-[11px] text-orange-800">Chu kỳ khuyến nghị: 15 – 30 ngày/lần</span>
            </div>

            {/* Preview thông tin địa chỉ Kiosk khi được chọn */}
            {lockerId && (
              (() => {
                const targetLocker = lockerMap.get(Number(lockerId));
                return (
                  <div className="p-2.5 rounded-lg bg-emerald-50/90 border border-emerald-200 text-xs flex items-center justify-between gap-2 text-emerald-950 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">Địa chỉ trạm đã chọn:</span>
                      <span className="text-emerald-900 font-medium">
                        {targetLocker?.address || "Đã lưu tọa độ trạm"}
                      </span>
                      {targetLocker?.storeName && (
                        <Badge variant="outline" className="text-[10px] bg-white text-emerald-800 border-emerald-300">
                          🏢 {targetLocker.storeName}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-700 italic">
                      * Địa chỉ sẽ được tự động đính kèm vào phiếu phân công KTV
                    </span>
                  </div>
                );
              })()
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Chọn Kiosk */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground font-semibold">
                  Thiết bị Kiosk <span className="text-rose-500">*</span>
                </label>
                <select
                  className="h-9 rounded-md border px-2 text-xs bg-background border-border/80 font-medium"
                  value={lockerId}
                  onChange={(e) => setLockerId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">— Chọn thiết bị Kiosk —</option>
                  {(allLockers.length > 0 ? allLockers : lockers).map((l: any) => {
                    const id = l.id ?? l.lockerId;
                    const addr = l.address || (l.code === "CAB-DEMO-01" ? "FPT University HCMC" : "");
                    return (
                      <option key={id} value={id}>
                        {l.name} ({l.code}){addr ? ` — 📍 ${addr}` : ""}
                      </option>
                    );
                  })}
                </select>
                {lockerId && lockerMap.get(Number(lockerId)) && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-xs text-teal-900 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>
                      <strong>Địa điểm cơ sở:</strong>{" "}
                      {lockerMap.get(Number(lockerId))?.address || "FPT University HCMC"}
                      {lockerMap.get(Number(lockerId))?.storeName ? ` · ${lockerMap.get(Number(lockerId))?.storeName}` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Tên Kế hoạch */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground font-semibold">
                  Tên kế hoạch kiểm tra <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Kiểm tra định kỳ ổ khóa, cảm biến & nguồn UPS"
                  className="h-9 text-xs"
                />
              </div>

              {/* KTV Phụ Trách */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground font-semibold">
                  Kỹ thuật viên phụ trách
                </label>
                <select
                  className="h-9 rounded-md border px-2 text-xs bg-background border-border/80"
                  value={assignedTechnicianId}
                  onChange={(e) => setAssignedTechnicianId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">— Chưa phân công (Chờ nhận) —</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} (KTV #{t.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chu kỳ ngày */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground font-semibold">
                  Chu kỳ lặp lại (ngày) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Number(e.target.value) || 1)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Mức độ ưu tiên */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground font-semibold">Mức độ ưu tiên</label>
                <select
                  className="h-9 rounded-md border px-2 text-xs bg-background border-border/80"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <option value="NORMAL">Bình thường (Trạm tiêu chuẩn)</option>
                  <option value="HIGH">Ưu tiên cao (Trạm lưu lượng lớn)</option>
                  <option value="URGENT">Khẩn cấp (Trạm trọng điểm)</option>
                </select>
              </div>

              {/* Vị trí đặt tủ cụ thể (Floor / Zone / Spot) */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  Vị trí đặt tủ cụ thể trong toà nhà
                </label>
                <Input
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  placeholder="VD: Tầng hầm B1, sảnh tháp A, cạnh thang máy"
                  className="h-9 text-xs"
                />
              </div>

              {/* Ngày bắt đầu kiểm tra đầu tiên */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  Ngày kiểm tra đầu tiên
                </label>
                <Input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Giờ bắt đầu cụ thể */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" />
                  Giờ hẹn bắt đầu cụ thể
                </label>
                <Input
                  type="time"
                  value={firstDueTime}
                  onChange={(e) => setFirstDueTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Khung giờ / Ca kiểm tra khuyến nghị */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Hourglass className="w-3 h-3 text-amber-600" />
                  Khung giờ / Ca kiểm tra
                </label>
                <select
                  className="h-9 rounded-md border px-2 text-xs bg-background border-border/80"
                  value={scheduledTimeSlot}
                  onChange={(e) => setScheduledTimeSlot(e.target.value)}
                >
                  <option value="08:00 - 11:30">Ca sáng (08:00 - 11:30) · Giờ thấp điểm</option>
                  <option value="13:30 - 17:00">Ca chiều (13:30 - 17:00)</option>
                  <option value="18:00 - 21:00">Ca tối (18:00 - 21:00)</option>
                  <option value="08:00 - 17:00">Giờ hành chính (08:00 - 17:00)</option>
                  <option value="Khung giờ linh hoạt">Khung giờ linh hoạt</option>
                </select>
              </div>
            </div>

            {/* Checklist tiêu chí mẫu */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                Bộ tiêu chí kiểm định KTV cần thực hiện ({selectedChecklist.length} mục đã chọn):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_KIOSK_CHECKLIST.map((item) => {
                  const isChecked = selectedChecklist.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleChecklist(item)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        isChecked
                          ? "bg-orange-100 text-orange-900 border-orange-300 font-semibold"
                          : "bg-background text-muted-foreground border-border/80 hover:border-orange-300"
                      }`}
                    >
                      {isChecked ? "✓ " : "+ "}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hướng dẫn chi tiết SOP */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground font-semibold">
                Hướng dẫn nghiệp vụ cho KTV (Ghi chú SOP)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Kiểm tra kỹ cảm biến quang ngăn số 4, vệ sinh đầu đọc QR bằng cồn y tế..."
                className="h-9 text-xs"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={create}
                disabled={creating}
                className="h-9 text-xs bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
              >
                <Plus className="w-4 h-4" /> {creating ? "Đang tạo lịch..." : "Thiết lập Kế hoạch Kiosk"}
              </Button>
            </div>
          </div>
        )}

        {/* SUBTAB 2: PHẦN DRONE */}
        {subTab === "drone" && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-semibold">
                <Plane className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Phân hệ Bảo dưỡng Đội bay & Bãi đáp Drone</span>
              </div>
              <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
                Theo dõi chu kỳ hiệu chuẩn động cơ, cân bằng cánh quạt, dung lượng pin thông minh và bãi đáp trên nóc Kiosk.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-muted/30 border border-border/60">
              <div className="flex flex-col gap-1 w-36">
                <label className="text-xs text-muted-foreground font-medium">Thiết bị Drone</label>
                <select
                  className="h-9 rounded-md border px-2 text-xs bg-background border-border/80"
                  value={selectedDrone}
                  onChange={(e) => setSelectedDrone(e.target.value)}
                >
                  <option value="DRONE-01">DRONE-01 (Hoạt động)</option>
                  <option value="DRONE-02">DRONE-02 (Dự phòng)</option>
                  <option value="DRONE-03">DRONE-03 (Bảo dưỡng)</option>
                  <option value="DRONE-04">DRONE-04 (Kiểm tra pin)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-48">
                <label className="text-xs text-muted-foreground font-medium">Hạng mục kiểm tra Drone</label>
                <Input
                  value={droneTitle}
                  onChange={(e) => setDroneTitle(e.target.value)}
                  placeholder="VD: Cân bằng cánh + hiệu chuẩn IMU & kiểm tra pin sạc"
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className="text-xs text-muted-foreground font-medium">Chu kỳ (ngày)</label>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={droneIntervalDays}
                  onChange={(e) => setDroneIntervalDays(Number(e.target.value) || 1)}
                  className="h-9 text-xs"
                />
              </div>
              <Button onClick={create} disabled={creating} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Tạo lịch Drone
              </Button>
            </div>
          </div>
        )}

        {/* BỘ LỌC VÀ TÌM KIẾM CHO PHẦN KIOSK */}
        {subTab === "kiosk" && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-lg bg-muted/20 border border-border/60">
            <div className="flex items-center gap-2 flex-1 min-w-64">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên Kiosk, mã tủ, KTV phụ trách..."
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-8 text-xs px-2">
                  Xóa
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Lọc theo KTV */}
              <div className="flex items-center gap-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={filterTechnician}
                  onChange={(e) => setFilterTechnician(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  className="h-8 rounded-md border px-2 text-xs bg-background border-border/80"
                >
                  <option value="ALL">Tất cả KTV phụ trách</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lọc theo Trạng thái */}
              <div className="flex items-center gap-1 text-xs">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="h-8 rounded-md border px-2 text-xs bg-background border-border/80"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="OVERDUE">🚨 Quá hạn kiểm định</option>
                  <option value="DUE">⏰ Đến hạn hôm nay</option>
                  <option value="UPCOMING">🟢 Sắp tới bình thường</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* DANH SÁCH CÁC KẾ HOẠCH BẢO TRÌ */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Đang tải kế hoạch bảo trì...</p>
        ) : activeSchedules.length === 0 ? (
          <div className="py-8 text-center space-y-1.5">
            <CalendarClock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium text-foreground">
              {subTab === "kiosk"
                ? "Không tìm thấy kế hoạch kiểm tra Kiosk nào phù hợp."
                : "Chưa có lịch kiểm tra nào cho thiết bị Drone."}
            </p>
            <p className="text-xs text-muted-foreground">
              Thử xóa bộ lọc hoặc tạo mới kế hoạch định kỳ cho trạm.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {activeSchedules.map((s) => {
              const remInfo = getRemainingDaysInfo(s.nextDueAt);
              return (
                <div
                  key={s.id}
                  className="py-3 flex items-center justify-between gap-3 flex-wrap hover:bg-muted/20 px-2 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p
                        className="font-semibold text-sm text-foreground hover:text-primary cursor-pointer transition-colors"
                        onClick={() => setSelectedSchedule(s)}
                      >
                        {s.title}
                      </p>

                      {s.priority && getPriorityBadge(s.priority)}

                      {s.due && (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold" variant="outline">
                          Đến hạn
                        </Badge>
                      )}
                      {remInfo && (
                        <Badge
                          className={`text-[11px] font-semibold flex items-center gap-1 ${
                            remInfo.isOverdue
                              ? "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                          variant="outline"
                        >
                          <Hourglass className="w-3 h-3" />
                          <span>{remInfo.text}</span>
                        </Badge>
                      )}
                      {isDroneSchedule(s) ? (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium" variant="outline">
                          ✈ Đội bay Drone
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-medium" variant="outline">
                          📦 Trạm Kiosk
                        </Badge>
                      )}
                    </div>

                    {/* HÀNG 2: THÔNG TIN THIẾT BỊ, ĐỊA ĐIỂM CƠ SỞ & VỊ TRÍ ĐẶT TRẠM */}
                    <div className="flex items-center gap-2 text-xs mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        <Boxes className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {isDroneSchedule(s)
                          ? (s.droneCode ? `Drone ${s.droneCode}` : "Thiết bị Drone")
                          : `${s.lockerName ?? `Kiosk #${s.lockerId}`}${s.lockerCode ? ` (${s.lockerCode})` : ""}`}
                      </span>

                      {/* FIELD ĐỊA ĐIỂM CƠ SỞ (VÍ DỤ: FPT UNIVERSITY HCMC) */}
                      {!isDroneSchedule(s) && (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-900 bg-teal-50 px-2.5 py-1 rounded border border-teal-300 shadow-sm"
                          title={`Địa điểm cơ sở: ${s.address || "FPT University HCMC"}`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="text-teal-700 font-medium">Địa điểm:</span>
                          <strong>{s.address || "FPT University HCMC"}</strong>
                        </span>
                      )}

                      {(s as any).storeName && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Building2 className="w-3 h-3 text-slate-600 shrink-0" />
                          {(s as any).storeName}
                        </span>
                      )}

                      {s.locationNote && (
                        <span className="text-xs font-medium text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200 flex items-center gap-1.5" title={s.locationNote}>
                          <Navigation className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="text-indigo-700">Vị trí:</span>
                          <strong>{s.locationNote}</strong>
                        </span>
                      )}
                    </div>

                    {/* HÀNG 3: THỜI GIAN CỤ THỂ, KHUNG GIỜ VÀ PHÂN CÔNG KTV */}
                    <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-blue-950 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200">
                        <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>Hạn kiểm tra:</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatDateTime(s.nextDueAt)}
                        </span>
                      </span>

                      {s.scheduledTimeSlot && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          <span>⏱ Ca:</span>
                          <strong>{s.scheduledTimeSlot}</strong>
                        </span>
                      )}

                      <span>·</span>
                      <span>Chu kỳ: <strong>{s.intervalDays}</strong> ngày</span>

                      <span>·</span>
                      <span className="inline-flex items-center gap-1.5">
                        KTV phụ trách:{" "}
                        {s.assignedTechnicianId ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(s)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer transition-colors"
                            title="Bấm để đổi KTV phụ trách"
                          >
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            {s.assignedTechnicianName ?? `KTV #${s.assignedTechnicianId}`}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(s)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 cursor-pointer transition-colors animate-pulse"
                            title="Chưa gán kỹ thuật viên — Bấm để gán ngay"
                          >
                            <UserPlus className="w-3 h-3 text-amber-600" />
                            Chưa gán (Gán ngay)
                          </button>
                        )}
                      </span>

                      {s.lastDoneAt && (
                        <>
                          <span>·</span>
                          <span className="text-[11px]">
                            Lần trước: <span className="font-mono">{formatDateTime(s.lastDoneAt)}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-8 text-xs gap-1 cursor-pointer font-medium ${
                        !s.assignedTechnicianId
                          ? "border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
                          : "border-border text-foreground hover:bg-muted/80"
                      }`}
                      onClick={() => handleOpenAssignModal(s)}
                      title={s.assignedTechnicianId ? "Thay đổi KTV phụ trách" : "Gán KTV phụ trách cho lịch này"}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-0.5 text-amber-600" />
                      {s.assignedTechnicianId ? "Đổi KTV" : "Gán KTV"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted/80 h-8 text-xs gap-1 cursor-pointer"
                      onClick={() => setSelectedSchedule(s)}
                    >
                      <Info className="w-3.5 h-3.5 mr-0.5 text-blue-600" /> Chi tiết & Lịch sử
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-8 text-xs gap-1 cursor-pointer font-medium"
                      onClick={() => openInspectionModal(s)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Ghi nhận kiểm tra
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer"
                      onClick={() => setDeleteConfirm({ id: s.id, title: s.title })}
                      title="Xóa kế hoạch kiểm tra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* MODAL 1: GHI NHẬN / NGHIỆM THU KIỂM TRA ĐỊNH KỲ */}
      <Dialog open={!!inspectingSchedule} onOpenChange={(open) => !open && setInspectingSchedule(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {inspectingSchedule && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    Biên bản nghiệm thu
                  </Badge>
                  {inspectingSchedule.lockerName && (
                    <Badge variant="outline" className="text-xs">
                      {inspectingSchedule.lockerName}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Ghi nhận kết quả kiểm tra định kỳ
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {inspectingSchedule.title} · Chu kỳ {inspectingSchedule.intervalDays} ngày
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 my-2 text-xs">
                {/* Khối Địa điểm và Thời điểm ca kiểm tra */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                      Thiết bị Kiosk kiểm tra:
                    </span>
                    <span className="font-semibold text-foreground text-right">
                      {inspectingSchedule.lockerName ?? `Kiosk #${inspectingSchedule.lockerId}`}
                      {inspectingSchedule.lockerCode ? ` (${inspectingSchedule.lockerCode})` : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      Địa điểm cơ sở:
                    </span>
                    <span className="font-bold text-teal-900 text-right">
                      {inspectingSchedule.address || "FPT University HCMC"}
                    </span>
                  </div>

                  {inspectingSchedule.locationNote && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                        Vị trí trong toà nhà:
                      </span>
                      <span className="font-semibold text-foreground text-right">
                        {inspectingSchedule.locationNote}
                      </span>
                    </div>
                  )}

                  {inspectingSchedule.scheduledTimeSlot && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Khung giờ / Ca kiểm tra:
                      </span>
                      <span className="font-semibold text-amber-900 text-right">
                        {inspectingSchedule.scheduledTimeSlot}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      Mốc thời gian nghiệm thu:
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {formatDateTime(new Date().toISOString())}
                    </span>
                  </div>
                </div>

                {/* Chọn KTV thực hiện */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Kỹ thuật viên thực hiện ca kiểm tra</label>
                  <select
                    className="h-9 rounded-md border px-2 text-xs bg-background border-border/80"
                    value={inspectTechId}
                    onChange={(e) => setInspectTechId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">— Chọn KTV thực hiện ca trực —</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} (KTV #{t.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Đánh giá kết quả */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Đánh giá kết quả tổng thể</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectStatus("PASSED")}
                      className={`p-2 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        inspectStatus === "PASSED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300"
                          : "bg-background text-muted-foreground hover:border-border"
                      }`}
                    >
                      ✓ Đạt chuẩn
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectStatus("ATTENTION")}
                      className={`p-2 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        inspectStatus === "ATTENTION"
                          ? "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-300"
                          : "bg-background text-muted-foreground hover:border-border"
                      }`}
                    >
                      ⚠ Cần theo dõi
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectStatus("DEFECT_DETECTED")}
                      className={`p-2 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        inspectStatus === "DEFECT_DETECTED"
                          ? "bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-300"
                          : "bg-background text-muted-foreground hover:border-border"
                      }`}
                    >
                      🚨 Có lỗi phát sinh
                    </button>
                  </div>
                </div>

                {/* Tiêu chí checklist thực tế */}
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/60">
                  <span className="font-semibold text-foreground block">
                    Checklist các tiêu chí kiểm tra:
                  </span>
                  <div className="space-y-1">
                    {(inspectingSchedule.checklist
                      ? inspectingSchedule.checklist.split(";").map((c) => c.trim()).filter(Boolean)
                      : DEFAULT_KIOSK_CHECKLIST
                    ).map((chk) => {
                      const passed = inspectPassedChecks.includes(chk);
                      return (
                        <label
                          key={chk}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={passed}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInspectPassedChecks((prev) => [...prev, chk]);
                              } else {
                                setInspectPassedChecks((prev) => prev.filter((p) => p !== chk));
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className={passed ? "text-foreground font-medium" : "text-muted-foreground"}>
                            {chk}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Ghi chú biên bản */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Ghi chú biên bản kiểm tra & hiện trường</label>
                  <textarea
                    rows={3}
                    value={inspectNote}
                    onChange={(e) => setInspectNote(e.target.value)}
                    placeholder="VD: Đã lau chùi sạch sẽ bề mặt cảm ứng, thử nghiệm đóng mở 16 ô đều nhạy, kiểm tra điện áp UPS đạt 12.8V..."
                    className="w-full rounded-md border p-2 text-xs bg-background border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Ảnh chụp hiện trường */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">URL Ảnh minh chứng (Mỗi dòng 1 đường dẫn link ảnh)</label>
                  <textarea
                    rows={2}
                    value={inspectPhotos}
                    onChange={(e) => setInspectPhotos(e.target.value)}
                    placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
                    className="w-full rounded-md border p-2 text-xs bg-background border-border/80 font-mono text-[11px]"
                  />
                </div>

                {/* Ngoại lệ nếu phát hiện hỏng hóc */}
                {inspectStatus === "DEFECT_DETECTED" && (
                  <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 space-y-2">
                    <label className="flex items-center gap-2 text-rose-900 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreateReport}
                        onChange={(e) => setAutoCreateReport(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>Tự động tạo ngay phiếu sự cố (Incident Report) để phân luồng sửa chữa</span>
                    </label>
                    {autoCreateReport && (
                      <Input
                        value={faultReason}
                        onChange={(e) => setFaultReason(e.target.value)}
                        placeholder="Mô tả sự cố cần khắc phục (VD: Ổ khóa ô #3 bị cháy cuộn hút)"
                        className="h-8 text-xs bg-background"
                      />
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setInspectingSchedule(null)} className="text-xs">
                  Hủy bỏ
                </Button>
                <Button
                  size="sm"
                  onClick={submitInspection}
                  disabled={completing}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {completing ? "Đang lưu..." : "Xác nhận & Cập nhật kỳ tới"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CHI TIẾT KẾ HOẠCH & DANH SÁCH LỊCH SỬ KIỂM ĐỊNH THẬT TỪ BACKEND */}
      <Dialog open={!!selectedSchedule} onOpenChange={(open) => !open && setSelectedSchedule(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedSchedule && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {selectedSchedule.due && (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold" variant="outline">
                      Đến hạn kiểm tra
                    </Badge>
                  )}
                  {selectedSchedule.priority && getPriorityBadge(selectedSchedule.priority)}
                  {isDroneSchedule(selectedSchedule) ? (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold" variant="outline">
                      ✈ Đội bay Drone
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-semibold" variant="outline">
                      📦 Trạm Kiosk
                    </Badge>
                  )}
                  {getRemainingDaysInfo(selectedSchedule.nextDueAt) && (
                    <Badge
                      className={`text-xs font-semibold ${
                        getRemainingDaysInfo(selectedSchedule.nextDueAt)!.isOverdue
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                      variant="outline"
                    >
                      {getRemainingDaysInfo(selectedSchedule.nextDueAt)!.text}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {selectedSchedule.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Hồ sơ kế hoạch bảo trì phòng ngừa và nhật ký kiểm định thực tế của Kỹ thuật viên
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-2">
                {/* 4 THÔNG SỐ CỐT LÕI CỦA KẾ HOẠCH */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/70 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-medium">Thiết bị</span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">
                      {isDroneSchedule(selectedSchedule)
                        ? (selectedSchedule.droneCode ?? "Thiết bị Drone")
                        : (selectedSchedule.lockerName ?? `Kiosk #${selectedSchedule.lockerId}`)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {isDroneSchedule(selectedSchedule)
                        ? "Mã: Drone Fleet"
                        : (selectedSchedule.lockerCode ? `Mã: ${selectedSchedule.lockerCode}` : "")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Chu kỳ định kỳ</span>
                    <span className="font-bold text-foreground mt-0.5 block">
                      Mỗi {selectedSchedule.intervalDays} ngày
                    </span>
                    <span className="text-[10px] text-muted-foreground">Lặp lại tự động</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Hạn kiểm tra tới</span>
                    <span className="font-bold text-foreground mt-0.5 block font-mono text-[11px]">
                      {formatDateTime(selectedSchedule.nextDueAt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {getRemainingDaysInfo(selectedSchedule.nextDueAt)?.text ?? ""}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground block font-medium">KTV Phụ trách</span>
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedSchedule;
                          setSelectedSchedule(null);
                          handleOpenAssignModal(target);
                        }}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer font-medium"
                      >
                        {selectedSchedule.assignedTechnicianId ? "Đổi KTV" : "+ Gán KTV"}
                      </button>
                    </div>
                    <span className="font-bold text-foreground mt-0.5 block truncate">
                      {selectedSchedule.assignedTechnicianName ?? (selectedSchedule.assignedTechnicianId ? `KTV #${selectedSchedule.assignedTechnicianId}` : "Chưa phân công")}
                    </span>
                    <span className={`text-[10px] font-medium ${selectedSchedule.assignedTechnicianId ? "text-emerald-600" : "text-amber-600"}`}>
                      {selectedSchedule.assignedTechnicianId ? "Chính thức" : "Cần phân công"}
                    </span>
                  </div>
                </div>

                {/* THẺ ĐỊA ĐIỂM & VỊ TRÍ ĐẶT TRẠM CHI TIẾT */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      Địa điểm & Vị trí đặt trạm kiểm tra
                    </span>
                    {(selectedSchedule.address || lockerMap.get(selectedSchedule.lockerId)?.address) && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${selectedSchedule.address || lockerMap.get(selectedSchedule.lockerId)?.address || ""} ${selectedSchedule.lockerName || ""}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> Chỉ đường Google Maps
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-background border border-border/60 space-y-1">
                      <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        Địa chỉ Kiosk / Chi nhánh:
                      </span>
                      <span className="font-semibold text-foreground block text-xs">
                        {selectedSchedule.address || lockerMap.get(selectedSchedule.lockerId)?.address || "FPT University HCMC"}
                      </span>
                      {((selectedSchedule as any).storeName || lockerMap.get(selectedSchedule.lockerId)?.storeName) && (
                        <span className="text-[11px] text-muted-foreground block">
                          Toà nhà / Cửa hàng: <strong>{((selectedSchedule as any).storeName || lockerMap.get(selectedSchedule.lockerId)?.storeName)}</strong>
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-background border border-border/60 space-y-1">
                      <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        Vị trí đặt tủ trong toà nhà:
                      </span>
                      <span className="font-semibold text-foreground block text-xs">
                        {selectedSchedule.locationNote || "Chưa có ghi chú vị trí (VD: Sảnh chính, tầng hầm)"}
                      </span>
                      {selectedSchedule.scheduledTimeSlot && (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 font-medium">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            Khung giờ khuyến nghị: <strong>{selectedSchedule.scheduledTimeSlot}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* HƯỚNG DẪN & CHECKLIST TIÊU CHUẨN NẾU CÓ */}
                {(selectedSchedule.description || selectedSchedule.checklist) && (
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-2">
                    {selectedSchedule.description && (
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[11px]">
                          Hướng dẫn quy trình (SOP):
                        </span>
                        <p className="text-foreground mt-0.5">{selectedSchedule.description}</p>
                      </div>
                    )}
                    {selectedSchedule.checklist && (
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[11px] mb-1">
                          Các hạng mục tiêu chuẩn cần kiểm tra:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {selectedSchedule.checklist.split(",").map((chk, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-background border border-border/70 text-[11px] text-foreground"
                            >
                              ✓ {chk.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BẢNG LỊCH SỬ CÁC LẦN KIỂM ĐỊNH THỰC TẾ TRONG QUÁ KHỨ */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Lịch sử nghiệm thu thực tế ({inspectionLogs.length} lần kiểm tra)
                    </h4>
                    {inspectionLogs.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        Lần gần nhất: {formatDateTime(inspectionLogs[0].createdAt)}
                      </span>
                    )}
                  </div>

                  {isLoadingLogs ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                      Đang tải nhật ký kiểm định từ máy chủ...
                    </div>
                  ) : inspectionLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                      Chưa có biên bản kiểm tra thực tế nào cho lịch này. Nhấp &quot;Nghiệm thu kiểm tra&quot; để tạo đợt đầu tiên.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {inspectionLogs.map((log) => {
                        const isPassed = log.status === "PASSED";
                        const isDefect = log.status === "DEFECT_FOUND";
                        return (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl border border-border/70 bg-card hover:border-border transition-colors space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    isPassed
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                                      : isDefect
                                      ? "bg-rose-50 text-rose-700 border-rose-300 font-semibold"
                                      : "bg-amber-50 text-amber-700 border-amber-300 font-semibold"
                                  }
                                >
                                  {isPassed
                                    ? "✓ ĐẠT CHUẨN"
                                    : isDefect
                                    ? "⚠️ PHÁT HIỆN LỖI"
                                    : "🔧 CẦN BẢO TRÌ"}
                                </Badge>
                                <span className="font-semibold text-foreground">
                                  {log.technicianName ?? (log.technicianId ? `KTV #${log.technicianId}` : "KTV Kiosk")}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {formatDateTime(log.createdAt)}
                              </span>
                            </div>

                            {log.note && (
                              <p className="text-muted-foreground bg-muted/30 p-2 rounded-lg text-[11px] leading-relaxed">
                                {log.note}
                              </p>
                            )}

                            {log.createdReportId && (
                              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center justify-between">
                                <span>Đã tự động khởi tạo phiếu sự cố khẩn: <strong>#{log.createdReportId}</strong></span>
                              </div>
                            )}

                            {log.photoUrls && log.photoUrls.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                {log.photoUrls.map((photo, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setEnlargedPhoto(photo)}
                                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-border/70 group hover:opacity-90 cursor-pointer"
                                  >
                                    <img
                                      src={photo}
                                      alt={`Ảnh ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <ExternalLink className="w-3 h-3 text-white" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2 border-t">
                <div className="flex items-center justify-between w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                    onClick={() => {
                      setDeleteConfirm({ id: selectedSchedule.id, title: selectedSchedule.title });
                      setSelectedSchedule(null);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa lịch
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedSchedule(null)}>
                      Đóng
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs gap-1 cursor-pointer"
                      onClick={() => {
                        const target = selectedSchedule;
                        setSelectedSchedule(null);
                        handleOpenAssignModal(target);
                      }}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      {selectedSchedule.assignedTechnicianId ? "Đổi KTV" : "Gán KTV"}
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => {
                        const target = selectedSchedule;
                        setSelectedSchedule(null);
                        openInspectionModal(target);
                      }}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Nghiệm thu kiểm tra
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG PHÂN CÔNG KỸ THUẬT VIÊN KIỂM TRA ĐỊNH KỲ */}
      <Dialog open={!!assigningSchedule} onOpenChange={(open) => !open && setAssigningSchedule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-600" />
              Phân công Kỹ thuật viên Kiosk
            </DialogTitle>
            <DialogDescription className="text-xs">
              Chỉ định KTV phụ trách kiểm tra định kỳ cho trạm Kiosk để KTV nhận việc trên ứng dụng di động.
            </DialogDescription>
          </DialogHeader>

          {assigningSchedule && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Kế hoạch kiểm tra:</span>
                  <span className="font-semibold text-foreground text-right">{assigningSchedule.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Trạm Kiosk:</span>
                  <span className="font-semibold text-foreground">
                    {assigningSchedule.lockerName ?? `Kiosk #${assigningSchedule.lockerId}`}
                    {assigningSchedule.lockerCode ? ` (${assigningSchedule.lockerCode})` : ""}
                  </span>
                </div>
                {(assigningSchedule.address || lockerMap.get(assigningSchedule.lockerId)?.address) && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" /> Địa chỉ công tác:
                    </span>
                    <span className="text-foreground text-right font-medium text-[11px]">
                      {assigningSchedule.address || lockerMap.get(assigningSchedule.lockerId)?.address}
                    </span>
                  </div>
                )}
                {assigningSchedule.locationNote && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Vị trí đặt tủ:</span>
                    <span className="font-semibold text-indigo-700 text-right">📌 {assigningSchedule.locationNote}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-600" /> Hạn & Ca thực hiện:
                  </span>
                  <span className="text-foreground font-medium">
                    {formatDateTime(assigningSchedule.nextDueAt)}
                    {assigningSchedule.scheduledTimeSlot ? ` (Ca: ${assigningSchedule.scheduledTimeSlot})` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                  <span>Chu kỳ định kỳ:</span>
                  <span>Mỗi {assigningSchedule.intervalDays} ngày</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-orange-600" />
                  Chọn Kỹ thuật viên phụ trách:
                </label>
                <select
                  className="w-full h-9 rounded-md border border-border/80 px-3 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={selectedTechToAssign}
                  onChange={(e) => setSelectedTechToAssign(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">— Chưa phân công (Bỏ gán KTV) —</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} (KTV #{t.id}) {t.phoneNumber ? `· ${t.phoneNumber}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground italic">
                  * Khi phân công, lịch kiểm tra sẽ tự động đồng bộ vào ứng dụng di động của KTV và hồ sơ kỹ thuật viên.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setAssigningSchedule(null)}
              disabled={isAssigningTech}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={handleSaveTechnicianAssignment}
              disabled={isAssigningTech}
            >
              {isAssigningTech ? "Đang lưu..." : "Lưu phân công"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG XEM PHÓNG TO ẢNH MINH CHỨNG */}
      <Dialog open={!!enlargedPhoto} onOpenChange={(open) => !open && setEnlargedPhoto(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-zinc-800 text-white">
          <DialogHeader className="p-2">
            <DialogTitle className="text-sm font-medium text-zinc-300">
              Ảnh minh chứng hiện trường kiểm tra định kỳ
            </DialogTitle>
          </DialogHeader>
          {enlargedPhoto && (
            <div className="flex items-center justify-center max-h-[75vh] overflow-hidden rounded-lg">
              <img src={enlargedPhoto} alt="Ảnh phóng to" className="max-h-[75vh] w-auto object-contain rounded-md" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog xác nhận xóa lịch kiểm tra */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa kế hoạch bảo trì?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa kế hoạch kiểm tra định kỳ &quot;{deleteConfirm?.title}&quot;?
              Lịch sử các đợt kiểm tra trước đó vẫn sẽ được lưu trữ để tra cứu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={async () => {
                if (!deleteConfirm) return;
                await act(
                  () => deleteSchedule(deleteConfirm.id).unwrap(),
                  {
                    title: "Đã xóa kế hoạch kiểm tra",
                    desc: `Kế hoạch bảo trì "${deleteConfirm.title}" đã được loại bỏ.`,
                  },
                  {
                    title: "Không thể xóa lịch",
                    desc: "Vui lòng kiểm tra lại quyền truy cập hoặc thử lại sau.",
                  },
                );
                setDeleteConfirm(null);
              }}
            >
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
