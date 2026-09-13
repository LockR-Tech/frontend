import { useState } from "react";
import { CalendarClock, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
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

  const create = async () => {
    if (!lockerId || !title.trim()) {
      toast.error("Chọn tủ và nhập tên công việc");
      return;
    }
    try {
      await createSchedule({
        lockerId: Number(lockerId),
        title: title.trim(),
        intervalDays,
      }).unwrap();
      toast.success("Đã tạo lịch định kỳ");
      setTitle("");
    } catch {
      toast.error("Tạo lịch thất bại");
    }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch {
      toast.error("Thao tác thất bại");
    }
  };

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("vi-VN") : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4" /> Bảo trì định kỳ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Tủ</label>
            <select
              className="h-9 rounded-md border px-2 text-sm bg-background"
              value={lockerId}
              onChange={(e) =>
                setLockerId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— Chọn tủ —</option>
              {lockers.map((l) => (
                <option key={l.lockerId} value={l.lockerId}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs text-muted-foreground">Công việc</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Kiểm tra khóa & cảm biến"
            />
          </div>
          <div className="flex flex-col gap-1 w-28">
            <label className="text-xs text-muted-foreground">Chu kỳ (ngày)</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={intervalDays}
              onChange={(e) => setIntervalDays(Number(e.target.value) || 1)}
            />
          </div>
          <Button onClick={create} disabled={creating}>
            <Plus className="w-4 h-4 mr-1" /> Tạo
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Đang tải...
          </p>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Chưa có lịch định kỳ nào. Tạo lịch để nhắc kỹ thuật kiểm tra tủ
            theo chu kỳ.
          </p>
        ) : (
          <div className="divide-y">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div>
                  <p className="font-medium">
                    {s.title}{" "}
                    {s.due && (
                      <Badge
                        className="ml-1 bg-red-100 text-red-800 border-red-300"
                        variant="outline"
                      >
                        Đến hạn
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {s.lockerName ?? `Tủ #${s.lockerId}`} · mỗi {s.intervalDays}{" "}
                    ngày · hạn {fmt(s.nextDueAt)} · lần trước {fmt(s.lastDoneAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      act(
                        () => completeSchedule(s.id).unwrap(),
                        "Đã ghi nhận kiểm tra",
                      )
                    }
                  >
                    <Check className="w-4 h-4 mr-1" /> Đã kiểm tra
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      act(() => deleteSchedule(s.id).unwrap(), "Đã xóa lịch")
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
