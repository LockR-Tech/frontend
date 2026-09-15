import { useState } from "react";
import { CalendarClock, Check, Plus, Trash2 } from "lucide-react";
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

/// L5 — quản lý lịch bảo trì phòng ngừa (kiểm tra định kỳ) trên web admin.
export function MaintenanceSchedules() {
  const { data, isLoading } = useGetMaintenanceSchedulesQuery();
  const { data: statsData } = useGetLockerStatsQuery();
  const [createSchedule, { isLoading: creating }] =
    useCreateMaintenanceScheduleMutation();
  const [completeSchedule] = useCompleteMaintenanceScheduleMutation();
  const [deleteSchedule] = useDeleteMaintenanceScheduleMutation();

  const schedules = data?.data ?? [];
  const lockers = statsData?.data ?? [];

  const [lockerId, setLockerId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);

  const create = async () => {
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
      toast.success("Tạo lịch định kỳ thành công", {
        description: `Kế hoạch kiểm tra "${title.trim()}" chu kỳ ${intervalDays} ngày đã được thiết lập.`,
      });
      setTitle("");
    } catch (err: any) {
      toast.error("Tạo lịch thất bại", {
        description: err?.data?.message || err?.message || "Không thể tạo lịch kiểm tra định kỳ.",
      });
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

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-emerald-600" /> Kế hoạch bảo trì định kỳ Kiosk & Drone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Thiết bị Kiosk</label>
            <select
              className="h-9 rounded-md border px-2 text-sm bg-background border-border/80"
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
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs text-muted-foreground font-medium">Hạng mục kiểm tra</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Kiểm tra khóa, cảm biến & bãi đáp Drone"
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
            />
          </div>
          <Button onClick={create} disabled={creating} className="h-9">
            <Plus className="w-4 h-4 mr-1" /> Tạo lịch
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Đang tải...
          </p>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Chưa có lịch định kỳ nào. Tạo lịch để nhắc kỹ thuật kiểm tra thiết bị theo chu kỳ.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="py-3 flex items-center justify-between gap-3 flex-wrap hover:bg-muted/20 px-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {s.title}{" "}
                    {s.due && (
                      <Badge
                        className="ml-1 bg-rose-50 text-rose-700 border-rose-200 text-xs"
                        variant="outline"
                      >
                        Đến hạn
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.lockerName ?? `Kiosk #${s.lockerId}`} · Chu kỳ: {s.intervalDays}{" "}
                    ngày · Hạn tới: <span className="text-foreground font-mono">{formatDate(s.nextDueAt)}</span> · Lần trước: <span className="text-foreground font-mono">{formatDateTime(s.lastDoneAt)}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-8 text-xs gap-1"
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
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
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
