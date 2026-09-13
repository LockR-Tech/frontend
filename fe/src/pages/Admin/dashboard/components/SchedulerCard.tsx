import { useState } from "react";
import {
  Clock,
  RotateCcw,
  Package,
  Bell,
  Play,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";

interface SchedulerJob {
  id: string;
  name: string;
  description: string;
  frequency: string;
  lastRun: string | null;
  status: "idle" | "running" | "success" | "error";
  icon: React.ElementType;
}

export function SchedulerCard() {
  const [jobs, setJobs] = useState<SchedulerJob[]>([
    {
      id: "auto-cancel",
      name: "Auto-Cancel Orders",
      description: "Hủy đơn INITIALIZED quá 30 phút",
      frequency: "Mỗi 5 phút",
      lastRun: "2 phút trước",
      status: "idle",
      icon: XCircle,
    },
    {
      id: "release-boxes",
      name: "Release Boxes",
      description: "Giải phóng box từ đơn COMPLETED",
      frequency: "Mỗi 2 phút",
      lastRun: "1 phút trước",
      status: "idle",
      icon: Package,
    },
    {
      id: "pickup-reminders",
      name: "Pickup Reminders",
      description: "Nhắc nhở khách lấy đồ quá 24h",
      frequency: "Mỗi 1 giờ",
      lastRun: "45 phút trước",
      status: "idle",
      icon: Bell,
    },
  ]);

  const runJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, status: "running" } : job
      )
    );

    // Simulate API call
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, status: "success", lastRun: "Vừa xong" }
            : job
        )
      );
      toast.success(`Đã chạy ${jobId} thành công`);
    }, 1500);
  };

  const getStatusBadge = (status: SchedulerJob["status"]) => {
    switch (status) {
      case "running":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            <RotateCcw className="mr-1 h-3 w-3 animate-spin" />
            Đang chạy
          </Badge>
        );
      case "success":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Hoàn thành
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            <XCircle className="mr-1 h-3 w-3" />
            Lỗi
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted/30 text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Sẵn sàng
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Scheduler Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => {
            const Icon = job.icon;
            return (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{job.name}</h4>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground/70">
                      <span className="flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        {job.frequency}
                      </span>
                      {job.lastRun && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Chạy lần cuối: {job.lastRun}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runJob(job.id)}
                  disabled={job.status === "running"}
                >
                  <Play className="mr-1 h-4 w-4" />
                  Chạy ngay
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-primary/5 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Các scheduler tự động chạy theo lịch. Bạn có thể trigger thủ công
            khi cần.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
