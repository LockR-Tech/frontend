import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useTriggerAutoCancelMutation,
  useTriggerBoxReleaseMutation,
  useTriggerPickupRemindersMutation,
} from "@/stores/apis/admin/scheduler";
import {
  useTriggerReconcileBoxesMutation,
  useTriggerReleaseOverdueMutation,
} from "./schedulerExtraApi";
import { jobI18nKey, type SchedulerJobKey } from "../jobs";

export interface JobResult {
  jobName: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

type JobData = Record<string, unknown> | undefined;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);

function errorMessage(error: unknown, fallback: string): string {
  const e = error as { data?: { message?: unknown }; status?: unknown } | undefined;
  if (typeof e?.data?.message === "string" && e.data.message.trim()) return e.data.message;
  if (e?.status === "FETCH_ERROR") return "Không kết nối được máy chủ";
  return fallback;
}

export function useScheduler() {
  const { t } = useTranslation();
  const [triggerAutoCancel, { isLoading: isTriggeringCancel }] = useTriggerAutoCancelMutation();
  const [triggerBoxRelease, { isLoading: isTriggeringRelease }] = useTriggerBoxReleaseMutation();
  const [triggerPickupReminders, { isLoading: isTriggeringReminders }] =
    useTriggerPickupRemindersMutation();
  const [triggerReleaseOverdue, { isLoading: isTriggeringOverdue }] =
    useTriggerReleaseOverdueMutation();
  const [triggerReconcileBoxes, { isLoading: isTriggeringReconcile }] =
    useTriggerReconcileBoxesMutation();

  const [jobResults, setJobResults] = useState<JobResult[]>([]);

  // Kết quả nằm trong `data` (tên khoá theo OrderService), câu thông báo nằm ở envelope.
  const describe = (key: SchedulerJobKey, data: JobData): string => {
    switch (key) {
      case "autoCancel":
        return t("admin.scheduler.result.canceledOrders", { count: num(data?.canceledOrders) });
      case "pickupReminders":
        return t("admin.scheduler.result.reminders", { count: num(data?.reminders) });
      case "releaseOverdue":
        return t("admin.scheduler.result.expiredOrders", { count: num(data?.expiredOrders) });
      case "reconcileBoxes":
        return data?.skipped
          ? t("admin.scheduler.result.reconcileSkipped")
          : t("admin.scheduler.result.reconciled", {
              released: num(data?.releasedBoxes),
              reclaimed: num(data?.reclaimedBoxes),
            });
      case "releaseBoxes":
      default:
        return t("admin.scheduler.result.done");
    }
  };

  const runners: Record<SchedulerJobKey, () => Promise<{ message?: string; data?: unknown }>> = {
    autoCancel: () => triggerAutoCancel().unwrap(),
    releaseBoxes: () => triggerBoxRelease().unwrap(),
    pickupReminders: () => triggerPickupReminders().unwrap(),
    releaseOverdue: () => triggerReleaseOverdue().unwrap(),
    reconcileBoxes: () => triggerReconcileBoxes().unwrap(),
  };

  const loading: Record<SchedulerJobKey, boolean> = {
    autoCancel: isTriggeringCancel,
    releaseBoxes: isTriggeringRelease,
    pickupReminders: isTriggeringReminders,
    releaseOverdue: isTriggeringOverdue,
    reconcileBoxes: isTriggeringReconcile,
  };

  const pushResult = (result: JobResult) =>
    setJobResults((prev) => [result, ...prev.slice(0, 9)]); // giữ 10 lần gần nhất

  const runJob = async (key: SchedulerJobKey) => {
    const jobName = t(jobI18nKey(key, "title"));
    try {
      const res = await runners[key]();
      const detail = describe(key, res?.data as JobData);
      pushResult({
        jobName,
        success: true,
        message: res?.message ? `${res.message} — ${detail}` : detail,
        timestamp: new Date(),
      });
    } catch (error) {
      pushResult({
        jobName,
        success: false,
        message: errorMessage(error, t("admin.scheduler.result.failed")),
        timestamp: new Date(),
      });
    }
  };

  return {
    runJob,
    loading,
    isLoading: Object.values(loading).some(Boolean),
    jobResults,
  };
}
