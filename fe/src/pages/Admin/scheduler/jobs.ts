import { Bell, Clock4, Package, RefreshCcw, Timer } from "lucide-react";

// Danh mục job lấy theo OrderScheduler.java (order-service). `/api/admin/scheduler/status`
// chỉ trả {enabled, owner} nên danh sách job dựng ở client.
export type SchedulerJobKey =
  | "autoCancel"
  | "releaseBoxes"
  | "pickupReminders"
  | "releaseOverdue"
  | "reconcileBoxes";

export interface SchedulerJobMeta {
  key: SchedulerJobKey;
  icon: React.ElementType;
  color: string;
  /** Job đổi trạng thái đơn/ô hàng loạt → hỏi lại trước khi chạy tay. */
  needsConfirm: boolean;
}

export const SCHEDULER_JOBS: SchedulerJobMeta[] = [
  { key: "autoCancel", icon: Timer, color: "text-orange-600", needsConfirm: true },
  { key: "pickupReminders", icon: Bell, color: "text-violet-500", needsConfirm: false },
  { key: "releaseOverdue", icon: Clock4, color: "text-rose-600", needsConfirm: true },
  { key: "reconcileBoxes", icon: RefreshCcw, color: "text-sky-600", needsConfirm: true },
  { key: "releaseBoxes", icon: Package, color: "text-primary", needsConfirm: false },
];

export const jobI18nKey = (key: SchedulerJobKey, field: string) =>
  `admin.scheduler.jobs.${key}.${field}`;
