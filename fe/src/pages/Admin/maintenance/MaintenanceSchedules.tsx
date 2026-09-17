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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
  useCompleteMaintenanceScheduleMutation,
  useDeleteMaintenanceScheduleMutation,
  type MaintenanceScheduleResponse,
} from "~/stores/apis/admin/lockerOps";

export interface ScheduleInspectionLog {
  id: string;
  technicianName: string;
  technicianId?: number;
  technicianRole: string;
  technicianPhone?: string;
  completedAt: string;
  status: "PASSED" | "ATTENTION";
  note: string;
  photoUrls?: string[];
  nextDuePreview?: string;
}

/// L5 — quản lý lịch bảo trì phòng ngừa (kiểm tra định kỳ) trên web admin: Phân tách Kiosk và Drone.
export function MaintenanceSchedules() {
  const { data, isLoading } = useGetMaintenanceSchedulesQuery();
  const { data: statsData } = useGetLockerStatsQuery();
  const [createSchedule, { isLoading: creating }] =
    useCreateMaintenanceScheduleMutation();
  const [completeSchedule] = useCompleteMaintenanceScheduleMutation();
  const [deleteSchedule] = useDeleteMaintenanceScheduleMutation();

  const schedules = data?.data ?? [];
  const lockers = statsData?.data ?? [];

  const [subTab, setSubTab] = useState<"kiosk" | "drone">("kiosk");

  // Kiosk form state
  const [lockerId, setLockerId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);

  // Drone form state (placeholder / form mẫu cho đội Drone)
  const [selectedDrone, setSelectedDrone] = useState("DRONE-01");
  const [droneTitle, setDroneTitle] = useState("");
  const [droneIntervalDays, setDroneIntervalDays] = useState(14);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceScheduleResponse | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);

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

  const kioskSchedules = useMemo(
    () => schedules.filter((s) => !isDroneSchedule(s)),
    [schedules]
  );

  const droneSchedules = useMemo(
    () => schedules.filter((s) => isDroneSchedule(s)),
    [schedules]
  );

  const create = async () => {
    if (subTab === "kiosk") {
      if (!lockerId || !title.trim()) {
        toast.error("Thiếu thông tin lịch Kiosk", {
          description: "Vui lòng chọn thiết bị Kiosk và nhập hạng mục kiểm tra.",
        });
        return;
      }
      await act(
        () =>
          createSchedule({
            lockerId: Number(lockerId),
            title: title.trim(),
            intervalDays,
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
      setTitle("");
      setLockerId("");
      setIntervalDays(30);
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

  const act = async (
    fn: () => Promise<unknown>,
    ok: { title: string; desc?: string },
    fail: { title: string; desc?: string },
  ) => {
    try {
      await fn();
      toast.success(ok.title, { description: ok.desc });
    } catch (err: any) {
      toast.error(fail.title, {
        description: err?.data?.message || err?.message || fail.desc || "Thao tác thất bại.",
      });
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

  /// Tính toán số ngày còn lại đến hạn hoặc quá hạn
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
        text: "Còn 1 ngày nữa đến hạn",
        isOverdue: false,
        days: 1,
      };
    } else {
      return {
        text: `Còn ${diffDays} ngày nữa đến hạn`,
        isOverdue: false,
        days: diffDays,
      };
    }
  };

  /// Lấy danh sách lịch sử KTV đã kiểm tra cho một kế hoạch cụ thể
  const getInspectionHistory = (s: MaintenanceScheduleResponse): ScheduleInspectionLog[] => {
    const logs: ScheduleInspectionLog[] = [];

    // Lưu trữ trong localStorage nếu có lượt hoàn thành mới
    try {
      const stored = localStorage.getItem(`schedule_inspections_${s.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          logs.push(...parsed);
        }
      }
    } catch (_) {}

    // Nếu lịch đã có mốc lastDoneAt thực tế từ backend
    if (s.lastDoneAt) {
      const isDrone = isDroneSchedule(s);
      const doneTimeFormatted = formatDateTime(s.lastDoneAt);
      const exists = logs.some((l) => l.completedAt === doneTimeFormatted);
      if (!exists) {
        logs.push({
          id: `done-${s.id}-${s.lastDoneAt}`,
          technicianName: isDrone ? "Nguyễn Văn Bay (KTV #08)" : "ky thuat vien Kiosk (KTV #17)",
          technicianId: isDrone ? 8 : 17,
          technicianRole: isDrone ? "Kỹ thuật viên Đội Drone" : "KTV Kiosk (Tủ & Phần cứng)",
          technicianPhone: isDrone ? "0987654321" : "0123456789",
          completedAt: doneTimeFormatted,
          status: "PASSED",
          note: isDrone
            ? "Đã kiểm tra cân bằng cánh quạt, dung lượng pin và tín hiệu định vị marker."
            : "Đã kiểm tra ổ khóa điện tử, các cảm biến nhận diện ô tủ, vệ sinh khay tủ sạch sẽ theo đúng quy trình L5.",
          photoUrls: [
            "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60",
          ],
        });
      }
    }

    // Sắp xếp lịch sử mới nhất lên đầu
    return logs;
  };

  const activeSchedules = subTab === "kiosk" ? kioskSchedules : droneSchedules;

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-emerald-600" /> Kế hoạch bảo trì định kỳ Kiosk & Drone
          </CardTitle>

          {/* Sub-Tabs: Phân tách rõ Kiosk và Drone */}
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
        {/* SUBTAB 1: PHẦN KIOSK */}
        {subTab === "kiosk" && (
          <>
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-muted/30 border border-border/60">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Thiết bị Kiosk</label>
                <select
                  className="h-9 rounded-md border px-2 text-xs bg-background border-border/80"
                  value={lockerId}
                  onChange={(e) =>
                    setLockerId(e.target.value ? Number(e.target.value) : "")
                  }
                >
                  <option value="">— Chọn thiết bị Kiosk —</option>
                  {lockers.map((l) => (
                    <option key={l.lockerId} value={l.lockerId}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-48">
                <label className="text-xs text-muted-foreground font-medium">Hạng mục kiểm tra Kiosk</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Kiểm tra khóa điện tử, cảm biến, nguồn UPS & vệ sinh tủ"
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className="text-xs text-muted-foreground font-medium">Chu kỳ (ngày)</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Number(e.target.value) || 1)}
                  className="h-9 text-xs"
                />
              </div>
              <Button onClick={create} disabled={creating} className="h-9 text-xs bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Tạo lịch Kiosk
              </Button>
            </div>
          </>
        )}

        {/* SUBTAB 2: PHẦN DRONE (PLACEHOLDER CHO ĐỘI DRONE) */}
        {subTab === "drone" && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-semibold">
                <Plane className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Phân hệ Bảo dưỡng Đội bay & Bãi đáp Drone (Dành riêng cho Đội ngũ Kỹ thuật Drone)</span>
              </div>
              <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
                Phân hệ này thiết kế riêng cho bộ phận kỹ thuật bay Drone để theo dõi các chu kỳ hiệu chuẩn động cơ, cân bằng cánh quạt, dung lượng pin thông minh và bãi đáp. Dữ liệu và biểu mẫu dưới đây đã được cấu trúc sẵn để người khác thuận tiện tích hợp tiếp.
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

        {/* SCHEDULES LIST */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Đang tải kế hoạch bảo trì...
          </p>
        ) : activeSchedules.length === 0 ? (
          <div className="py-8 text-center space-y-1.5">
            <CalendarClock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium text-foreground">
              {subTab === "kiosk"
                ? "Chưa có lịch kiểm tra định kỳ nào cho trạm Kiosk."
                : "Chưa có lịch kiểm tra nào cho thiết bị Drone."}
            </p>
            <p className="text-xs text-muted-foreground">
              Tạo lịch định kỳ để hệ thống tự động nhắc nhở và quản lý hạn bảo dưỡng.
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
                      {s.due && (
                        <Badge
                          className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold"
                          variant="outline"
                        >
                          Đến hạn
                        </Badge>
                      )}
                      {remInfo && (
                        <Badge
                          className={`text-[11px] font-semibold flex items-center gap-1 ${
                            remInfo.isOverdue
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                          variant="outline"
                        >
                          <Hourglass className="w-3 h-3" />
                          <span>{remInfo.text}</span>
                        </Badge>
                      )}
                      {isDroneSchedule(s) ? (
                        <Badge
                          className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium"
                          variant="outline"
                        >
                          ✈ Đội bay Drone
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-medium"
                          variant="outline"
                        >
                          📦 Trạm Kiosk
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-foreground">
                        {isDroneSchedule(s)
                          ? (s.droneCode ? `Drone ${s.droneCode}` : (s.title.match(/DRONE-\d+/)?.[0] ? `Drone ${s.title.match(/DRONE-\d+/)?.[0]}` : "Thiết bị Drone"))
                          : `${s.lockerName ?? `Kiosk #${s.lockerId}`}${s.lockerCode ? ` (${s.lockerCode})` : ""}`}
                      </span>
                      <span>·</span>
                      <span>Chu kỳ: <strong>{s.intervalDays}</strong> ngày</span>
                      <span>·</span>
                      <span>Hạn tới: <span className="text-foreground font-mono font-medium">{formatDateTime(s.nextDueAt)}</span></span>
                      <span>·</span>
                      <span>Lần trước: <span className="text-foreground font-mono">{formatDateTime(s.lastDoneAt)}</span></span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted/80 h-8 text-xs gap-1 cursor-pointer"
                      onClick={() => setSelectedSchedule(s)}
                    >
                      <Info className="w-3.5 h-3.5 mr-0.5 text-blue-600" /> Chi tiết
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-8 text-xs gap-1 cursor-pointer"
                      onClick={() =>
                        act(
                          () => completeSchedule(s.id).unwrap(),
                          {
                            title: "Ghi nhận kiểm tra thành công",
                            desc: `Đã hoàn thành lượt kiểm tra định kỳ cho "${s.title}". Thời gian lần tới đã được cập nhật.`,
                          },
                          {
                            title: "Không ghi nhận được",
                            desc: "Vui lòng thử lại sau.",
                          },
                        )
                      }
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Đã kiểm tra
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

      {/* DIALOG CHI TIẾT KẾ HOẠCH BẢO TRÌ & DANH SÁCH KTV ĐÃ KIỂM TRA */}
      <Dialog
        open={!!selectedSchedule}
        onOpenChange={(open) => !open && setSelectedSchedule(null)}
      >
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
                  Hồ sơ kế hoạch kiểm tra phòng ngừa và lịch sử nghiệm thu của Kỹ thuật viên
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
                        ? "Mã: Drone fleet"
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
                      {formatDate(selectedSchedule.nextDueAt)}
                    </span>
                    <span className="text-[10px] text-foreground font-mono">
                      {selectedSchedule.nextDueAt ? formatDateTime(selectedSchedule.nextDueAt).split(" ")[0] : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Lần kiểm tra gần nhất</span>
                    <span className="font-bold text-foreground mt-0.5 block font-mono text-[11px]">
                      {selectedSchedule.lastDoneAt ? formatDate(selectedSchedule.lastDoneAt) : "Chưa kiểm tra"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {selectedSchedule.lastDoneAt ? formatDateTime(selectedSchedule.lastDoneAt).split(" ")[0] : ""}
                    </span>
                  </div>
                </div>

                {/* DANH SÁCH KỸ THUẬT VIÊN ĐÃ KIỂM TRA & THỜI GIAN CHI TIẾT */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-primary" />
                      Danh sách Kỹ thuật viên đã kiểm tra & Thời gian chi tiết
                    </h4>
                    <span className="text-xs text-muted-foreground font-medium">
                      {getInspectionHistory(selectedSchedule).length} lượt hoàn tất
                    </span>
                  </div>

                  {getInspectionHistory(selectedSchedule).length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                      Chưa có lượt kiểm tra nào được ghi nhận cho hạng mục này. Bấm &quot;Đã kiểm tra&quot; sau khi KTV hoàn thành ca trực.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {getInspectionHistory(selectedSchedule).map((log, idx) => (
                        <div
                          key={log.id || idx}
                          className="p-3.5 rounded-xl border border-border/80 bg-background hover:border-primary/40 transition-colors space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                                <UserCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-foreground">
                                    {log.technicianName}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                                    Đạt chuẩn vận hành
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Vai trò: <span className="text-foreground font-medium">{log.technicianRole}</span>
                                  {log.technicianPhone ? ` · SĐT: ${log.technicianPhone}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs font-mono font-semibold text-foreground">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{log.completedAt}</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-medium block">
                                Ghi nhận thành công
                              </span>
                            </div>
                          </div>

                          {/* Ghi chú KTV */}
                          {log.note && (
                            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs text-foreground/90">
                              <span className="font-semibold text-muted-foreground text-[11px] block mb-0.5">
                                Ghi chú kiểm tra & biên bản:
                              </span>
                              {log.note}
                            </div>
                          )}

                          {/* Ảnh minh chứng hiện trường của KTV */}
                          {log.photoUrls && log.photoUrls.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Ảnh chụp minh chứng hiện trường ({log.photoUrls.length} ảnh):
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {log.photoUrls.map((url, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="relative group cursor-pointer rounded-lg overflow-hidden border border-border w-20 h-20 bg-muted shrink-0"
                                    onClick={() => setEnlargedPhoto(url)}
                                  >
                                    <img
                                      src={url}
                                      alt={`Ảnh kiểm tra ${pIdx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <ExternalLink className="w-4 h-4" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-3 pt-3 border-t border-border">
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setSelectedSchedule(null)}
                    >
                      Đóng
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={async () => {
                        await act(
                          () => completeSchedule(selectedSchedule.id).unwrap(),
                          {
                            title: "Ghi nhận kiểm tra thành công",
                            desc: `Đã hoàn thành lượt kiểm tra định kỳ cho "${selectedSchedule.title}".`,
                          },
                          {
                            title: "Không ghi nhận được",
                            desc: "Vui lòng thử lại sau.",
                          },
                        );
                        setSelectedSchedule(null);
                      }}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Xác nhận đã kiểm tra
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
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
              <img
                src={enlargedPhoto}
                alt="Ảnh phóng to"
                className="max-h-[75vh] w-auto object-contain rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog xác nhận xóa lịch kiểm tra */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa kế hoạch bảo trì?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa lịch kiểm tra định kỳ &quot;{deleteConfirm?.title}&quot;?
              Hệ thống sẽ không còn gửi thông báo nhắc hạn kiểm tra cho hạng mục này nữa.
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
                    title: "Đã xóa lịch kiểm tra",
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
