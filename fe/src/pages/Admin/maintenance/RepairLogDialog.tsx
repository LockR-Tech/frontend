import { useState } from "react";
import { History, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import {
  useGetReportLogsQuery,
  useAddReportLogMutation,
} from "~/stores/apis/admin/lockerOps";

/// Nút "Nhật ký" + hộp thoại xem/thêm các bước xử lý (work-log) cho 1 phiếu.
export function RepairLogDialog({
  reportId,
  title,
}: {
  reportId: number;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const { data, isLoading } = useGetReportLogsQuery(reportId, { skip: !open });
  const [addLog, { isLoading: adding }] = useAddReportLogMutation();
  const logs = data?.data ?? [];

  const submit = async () => {
    const text = note.trim();
    if (!text) return;
    try {
      await addLog({ reportId, note: text }).unwrap();
      setNote("");
    } catch {
      toast.error("Không thêm được ghi chú");
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <History className="w-4 h-4 mr-1" /> Nhật ký
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nhật ký xử lý · {title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Đang tải...
              </p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Chưa có ghi chú. Thêm bước xử lý đầu tiên bên dưới.
              </p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="rounded-md bg-muted/50 p-3">
                  <p className="text-sm whitespace-pre-wrap">{l.note}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(l.createdAt).toLocaleString("vi-VN")}
                    {l.actorUserId ? ` · KTV #${l.actorUserId}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thêm bước xử lý / ghi chú..."
              rows={2}
              className="flex-1"
            />
            <Button onClick={submit} disabled={adding || !note.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
