import {
  useTriggerAutoCancelMutation,
  useTriggerBoxReleaseMutation,
  useTriggerPickupRemindersMutation,
} from "@/stores/apis/admin/scheduler";
import { useState } from "react";

export interface JobResult {
  jobName: string;
  success: boolean;
  message: string;
  canceledCount?: number;
  timestamp: Date;
}

export function useScheduler() {
  const [triggerAutoCancel, { isLoading: isTriggeringCancel }] =
    useTriggerAutoCancelMutation();
  const [triggerBoxRelease, { isLoading: isTriggeringRelease }] =
    useTriggerBoxReleaseMutation();
  const [triggerPickupReminders, { isLoading: isTriggeringReminders }] =
    useTriggerPickupRemindersMutation();

  const [jobResults, setJobResults] = useState<JobResult[]>([]);

  const isLoading =
    isTriggeringCancel || isTriggeringRelease || isTriggeringReminders;

  const addJobResult = (jobName: string, success: boolean, message: string) => {
    setJobResults((prev) => [
      {
        jobName,
        success,
        message,
        timestamp: new Date(),
      },
      ...prev.slice(0, 9), // Keep last 10 results
    ]);
  };

  const handleTriggerAutoCancel = async () => {
    try {
      const result = await triggerAutoCancel().unwrap();
      setJobResults((prev) => [
        {
          jobName: "Auto-Cancel Orders",
          success: true,
          message: result.data?.message || "Job completed",
          canceledCount: (result.data as any)?.canceledCount,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch (error: any) {
      setJobResults((prev) => [
        {
          jobName: "Auto-Cancel Orders",
          success: false,
          message: error?.data?.message || "Failed to trigger job",
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    }
  };

  const handleTriggerBoxRelease = async () => {
    try {
      const result = await triggerBoxRelease().unwrap();
      setJobResults((prev) => [
        {
          jobName: "Release Boxes",
          success: true,
          message: result.data?.message || "Job completed",
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch (error: any) {
      setJobResults((prev) => [
        {
          jobName: "Release Boxes",
          success: false,
          message: error?.data?.message || "Failed to trigger job",
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    }
  };

  const handleTriggerPickupReminders = async () => {
    try {
      const result = await triggerPickupReminders().unwrap();
      setJobResults((prev) => [
        {
          jobName: "Pickup Reminders",
          success: true,
          message: result.data?.message || "Job completed",
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch (error: any) {
      setJobResults((prev) => [
        {
          jobName: "Pickup Reminders",
          success: false,
          message: error?.data?.message || "Failed to trigger job",
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    }
  };

  return {
    handleTriggerAutoCancel,
    handleTriggerBoxRelease,
    handleTriggerPickupReminders,
    isTriggeringCancel,
    isTriggeringRelease,
    isTriggeringReminders,
    isLoading,
    jobResults,
  };
}
