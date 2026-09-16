import { useState, useMemo } from "react";
import { CalendarClock, Check, Plus, Trash2, Boxes, Plane, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
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
} from "~/stores/apis/admin/lockerOps";

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
        toast.warning("Chưa đủ thông tin", {
          description: "Vui lòng chọn thiết bị Kiosk và nhập nội dung hạng mục kiểm tra.",
        });
        return;
      }
      try {
        await createSchedule({
          lockerId: Number(lockerId),
          title: title.trim(),
          intervalDays,
        }).unwrap();
        toast.success("Tạo lịch bảo trì Kiosk thành công", {
          description: `Kế hoạch kiểm tra "${title.trim()}" chu kỳ ${intervalDays} ngày đã được thiết lập.`,
        });
        setTitle("");
      } catch (err: any) {
        toast.error("Tạo lịch thất bại", {
          description: err?.data?.message || err?.message || "Không thể tạo lịch kiểm tra định kỳ.",
        });
      }
    } else {
      if (!droneTitle.trim()) {
        toast.warning("Chưa đủ thông tin", {
          description: "Vui lòng nhập nội dung hạng mục kiểm tra Drone.",
        });
        return;
      }
      const fullDroneTitle = `[${selectedDrone}] ${droneTitle.trim()}`;
      try {
        const fallbackLocker = lockers[0]?.lockerId;
        await createSchedule({
          lockerId: fallbackLocker ? Number(fallbackLocker) : 1,
          title: fullDroneTitle,
          intervalDays: droneIntervalDays,
        }).unwrap();
        toast.success("Đã thiết lập lịch kiểm tra Drone", {
          description: `Kế hoạch "${fullDroneTitle}" chu kỳ ${droneIntervalDays} ngày đã được lưu cho đội Drone.`,
        });
        setDroneTitle("");
      } catch (err: any) {
        toast.error("Tạo lịch thất bại", {
          description: err?.data?.message || err?.message || "Không thể tạo lịch.",
        });
      }
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
            {activeSchedules.map((s) => (
              <div
                key={s.id}
                className="py-3 flex items-center justify-between gap-3 flex-wrap hover:bg-muted/20 px-2 rounded-lg transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">
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
                    {subTab === "drone" && (
                      <Badge
                        className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                        variant="outline"
                      >
                        Đội bay phụ trách
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.lockerName ?? `Thiết bị #${s.lockerId}`} · Chu kỳ: {s.intervalDays}{" "}
                    ngày · Hạn tới: <span className="text-foreground font-mono">{formatDate(s.nextDueAt)}</span> · Lần trước: <span className="text-foreground font-mono">{formatDateTime(s.lastDoneAt)}</span>
                  </p>
                </div>
                <div className="flex gap-2">
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
            ))}
          </div>
        )}
      </CardContent>

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
