import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types/auth";

/** Kết quả một lệnh điều khiển tủ (mở ô / nắp). */
export interface CabinetCommandResult {
  accepted: boolean;
  status: string; // ACCEPTED | SUCCESS | OPEN | FAILED | TIMEOUT
  message: string;
  result: unknown;
}

export interface LidStatus {
  axis: number;
  state: string; // UNKNOWN | OPEN | CLOSED | MOVING | STOPPED | FAULT
  busy: boolean;
  homeLimit?: boolean;
  endLimit?: boolean;
  lastSteps?: number;
  lastError?: string | null;
  motion?: string | null;
  progressSteps?: number;
  config?: {
    rps?: number;
    start_rps?: number;
    ramp_steps?: number;
    pulse_us?: number;
    max_revs?: number;
    steps_per_rev?: number;
    open_dir_high?: boolean;
    limit_active_low?: boolean;
  };
}

export interface CabinetPanel {
  accepted: boolean;
  status: string;
  message: string;
  result: {
    // boxes: số ô mà nắp của trục nằm trên (LIDn_BOXES trên Pi); rỗng = chưa khai báo.
    lids?: { axis: number; enabled: boolean; boxes?: number[]; status: LidStatus | null }[];
    // Bản đồ chân đang chạy thật trên Pi (Pi cũ không gửi).
    hardware?: HardwareConfig;
  } | null;
}

/** Một trục nắp trượt trong bản đồ chân (GPIO theo số BCM). */
export interface LidAxisConfig {
  axis: number;
  enabled: boolean;
  pulPin: number;
  dirPin: number;
  homePin: number;
  endPin: number;
  openDirHigh: boolean;
  limitActiveLow: boolean;
  boxes: number[];
}

/** Bản đồ chân Pi thực sự dùng — gửi xuống tủ bằng lệnh hw-config. Phần tử i của relayPins/doorPins = ô i+1. */
export interface HardwareConfig {
  relayPins: number[];
  relayActiveHigh: boolean;
  unlockMs: number;
  doorPins: number[];
  doorClosedLow: boolean;
  requireDoorSensor: boolean;
  lidBypassPhysicalMotion: boolean;
  lids: LidAxisConfig[];
}

/** Một dòng sơ đồ đấu dây (chỉ để tra cứu, Pi không dùng). */
export interface WiringRow {
  group: string;
  from: string;
  to: string;
  via: string;
  wire: string;
  note: string;
}

export interface HardwareConfigView {
  lockerId: number;
  config: HardwareConfig;
  wiring: WiringRow[];
  defaultTemplate: boolean;
  updatedBy: number | null;
  updatedAt: string | null;
  appliedBy: number | null;
  appliedAt: string | null;
  applyStatus: string | null;
  applyMessage: string | null;
}

export interface HardwareApplyResult extends CabinetCommandResult {
  warnings: string[];
  errors: string[];
}

export type LidAction = "open" | "close" | "home" | "stop";

/** Một dòng nhật ký điều khiển: lệnh từ web (WEB) hoặc việc tủ đã làm (CABINET). */
export interface CabinetControlLog {
  id: number;
  lockerId: number;
  source: "WEB" | "CABINET" | string;
  actorUserId: number | null;
  action: string; // BOX_OPEN | BOX_TEST | LID_OPEN | LID_CLOSE | LID_HOME | LID_STOP | LID_JOG | LID_TUNE
  axis: number | null;
  boxId: number | null;
  boxNumber: number | null;
  revolutions: number | null;
  status: string;
  message: string | null;
  occurredAt: string;
  createdAt: string;
}

const ROOT = (lockerId: number) => `/api/locker-technician/cabinet/${lockerId}`;

export const cabinetControlApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Trạng thái các trục nắp của tủ (poll để hiển thị).
    getCabinetPanel: builder.query<ApiResponse<CabinetPanel>, number>({
      query: (lockerId) => `${ROOT(lockerId)}/panel`,
    }),

    // Nhật ký lưu trên server: vẫn xem được khi tủ mất kết nối.
    getCabinetLogs: builder.query<ApiResponse<CabinetControlLog[]>, { lockerId: number; limit?: number }>({
      query: ({ lockerId, limit = 100 }) => `${ROOT(lockerId)}/logs?limit=${limit}`,
    }),

    // Cấu hình phần cứng đã lưu (chưa lưu thì là mẫu TU01, defaultTemplate = true).
    getCabinetHardware: builder.query<ApiResponse<HardwareConfigView>, number>({
      query: (lockerId) => `${ROOT(lockerId)}/hardware`,
    }),

    saveCabinetHardware: builder.mutation<
      ApiResponse<HardwareConfigView>,
      { lockerId: number; config: HardwareConfig; wiring: WiringRow[] }
    >({
      query: ({ lockerId, config, wiring }) => ({
        url: `${ROOT(lockerId)}/hardware`,
        method: "PUT",
        body: { config, wiring },
      }),
    }),

    // Gửi bản đã lưu xuống tủ; tủ khởi động lại bộ điều khiển khoảng 10 giây.
    applyCabinetHardware: builder.mutation<ApiResponse<HardwareApplyResult>, number>({
      query: (lockerId) => ({ url: `${ROOT(lockerId)}/hardware/apply`, method: "POST" }),
    }),

    openCabinetBox: builder.mutation<
      ApiResponse<CabinetCommandResult>,
      { lockerId: number; boxId: number }
    >({
      query: ({ lockerId, boxId }) => ({
        url: `${ROOT(lockerId)}/boxes/${boxId}/open`,
        method: "POST",
      }),
    }),

    controlLid: builder.mutation<
      ApiResponse<CabinetCommandResult>,
      { lockerId: number; axis: number; action: LidAction }
    >({
      query: ({ lockerId, axis, action }) => ({
        url: `${ROOT(lockerId)}/lid/${axis}/${action}`,
        method: "POST",
      }),
    }),

    jogLid: builder.mutation<
      ApiResponse<CabinetCommandResult>,
      { lockerId: number; axis: number; revolutions: number; direction: "open" | "close" }
    >({
      query: ({ lockerId, axis, revolutions, direction }) => ({
        url: `${ROOT(lockerId)}/lid/${axis}/jog`,
        method: "POST",
        body: { revolutions, direction },
      }),
    }),

    tuneLid: builder.mutation<
      ApiResponse<CabinetCommandResult>,
      { lockerId: number; axis: number; changes: Record<string, number | boolean> }
    >({
      query: ({ lockerId, axis, changes }) => ({
        url: `${ROOT(lockerId)}/lid/${axis}/tuning`,
        method: "PUT",
        body: changes,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCabinetPanelQuery,
  useGetCabinetLogsQuery,
  useGetCabinetHardwareQuery,
  useSaveCabinetHardwareMutation,
  useApplyCabinetHardwareMutation,
  useOpenCabinetBoxMutation,
  useControlLidMutation,
  useJogLidMutation,
  useTuneLidMutation,
} = cabinetControlApi;
