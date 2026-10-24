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
    lids?: { axis: number; enabled: boolean; status: LidStatus | null }[];
  } | null;
}

export type LidAction = "open" | "close" | "home" | "stop";

const ROOT = (lockerId: number) => `/api/locker-technician/cabinet/${lockerId}`;

export const cabinetControlApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Trạng thái các trục nắp của tủ (poll để hiển thị).
    getCabinetPanel: builder.query<ApiResponse<CabinetPanel>, number>({
      query: (lockerId) => `${ROOT(lockerId)}/panel`,
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
  useOpenCabinetBoxMutation,
  useControlLidMutation,
  useJogLidMutation,
  useTuneLidMutation,
} = cabinetControlApi;
