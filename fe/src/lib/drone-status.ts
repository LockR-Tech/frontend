import i18n from "~/utils/i18n";

// Khớp DroneStatus của backend: IDLE, RESERVED, CHARGING, IN_FLIGHT, MAINTENANCE, FAULT.
const DRONE_STATUS_LABEL_KEYS: Record<string, string> = {
  IDLE: "admin.maintenance.droneStatus.idle",
  RESERVED: "admin.maintenance.droneStatus.reserved",
  CHARGING: "admin.maintenance.droneStatus.charging",
  IN_FLIGHT: "admin.maintenance.droneStatus.inFlight",
  MAINTENANCE: "admin.maintenance.droneStatus.maintenance",
  FAULT: "admin.maintenance.droneStatus.fault",
};

/** Nhãn trạng thái drone theo ngôn ngữ đang chọn; mã lạ giữ nguyên. */
export function getDroneStatusLabel(status?: string | null): string {
  if (!status) return "—";
  const key = DRONE_STATUS_LABEL_KEYS[status.toUpperCase()];
  return key ? i18n.t(key) : status;
}

/** Nhãn trạng thái phiếu sự cố tủ/drone (OPEN, IN_PROGRESS, RESOLVED, REJECTED). */
export function getReportStatusLabel(status?: string | null): string {
  switch ((status ?? "").toUpperCase()) {
    case "OPEN":
      return i18n.t("admin.maintenance.status.openAwaitingTech");
    case "IN_PROGRESS":
      return i18n.t("admin.maintenance.status.inProgress");
    case "RESOLVED":
      return i18n.t("admin.maintenance.status.resolved");
    case "REJECTED":
      return i18n.t("admin.maintenance.status.rejected");
    default:
      return status || "—";
  }
}
