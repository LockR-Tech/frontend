import type { TFunction } from "i18next";

/** Khoá i18n cho trạng thái nhiệm vụ bay (DroneMission.status). */
export const MISSION_STATUS_LABELS: Record<string, string> = {
  AWAITING_LOADING: "admin.drones.missionStatus.awaitingLoading",
  ASSIGNED: "admin.drones.missionStatus.assigned",
  LOADING: "admin.drones.missionStatus.loading",
  READY_TO_LAUNCH: "admin.drones.missionStatus.readyToLaunch",
  LAUNCHING: "admin.drones.missionStatus.launching",
  DEPARTED: "admin.drones.missionStatus.departed",
  EN_ROUTE: "admin.drones.missionStatus.inFlight",
  APPROACHING: "admin.drones.missionStatus.approaching",
  IN_FLIGHT: "admin.drones.missionStatus.inFlight",
  ARRIVED: "admin.drones.missionStatus.arrived",
  DEPOSITED: "admin.drones.missionStatus.deposited",
  READY_FOR_PICKUP: "admin.drones.missionStatus.readyForPickup",
  COMPLETED: "admin.drones.missionStatus.completed",
  CANCELED: "admin.drones.missionStatus.canceled",
  EXPIRED: "admin.drones.missionStatus.expired",
  FAILED: "admin.drones.missionStatus.failed",
  DROP_REPORTED: "admin.drones.missionStatus.dropReported",
};

/** Nhãn đã dịch; mã lạ thì trả lại chính mã. */
export function missionStatusLabel(t: TFunction, status: string | null | undefined): string {
  if (!status) return "—";
  const key = MISSION_STATUS_LABELS[status];
  return key ? t(key) : status;
}
