import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types";
import type { PageResponse } from "./droneCommLogs";
import type { DroneLockerWeather, DroneStationSuspension } from "./droneOrders";

// Trang "Thời tiết & bay" (order-service, ADMIN):
//   GET    /api/admin/drone-flight-control/stations                       -> thời tiết + lệnh dừng từng trạm
//   PUT    /api/admin/drone-flight-control/stations/{lockerId}/suspension -> dừng bay ở một trạm
//   DELETE /api/admin/drone-flight-control/stations/{lockerId}/suspension -> mở lại
//   GET    /api/admin/drone-flight-control/suspension-logs                -> ai dừng / mở trạm nào, lúc nào
//   GET    /api/admin/drone-flight-control/blocks                         -> lịch sử chặn bay (phân trang)
//   GET    /api/admin/drone-flight-control/blocks/summary?hours=24        -> số lần chặn theo nguyên nhân
// Tắt bay toàn hệ thống và ngưỡng thời tiết là quy tắc nghiệp vụ scope `order` (businessSettings).

const BASE = "/api/admin/drone-flight-control";
const TAG = "DroneFlightControl" as const;

/** WEATHER_UNSAFE | WEATHER_UNAVAILABLE | FLIGHTS_SUSPENDED | STATION_SUSPENDED */
export type FlightBlockCause = string;
/** BOOKING | ACCEPT | LAUNCH | IN_PROGRESS */
export type FlightBlockAction = string;

export interface DroneFlightBlock {
  id: number;
  /** LocalDateTime UTC, không offset. */
  createdAt: string;
  action: FlightBlockAction;
  cause: FlightBlockCause;
  orderId: number | null;
  orderCode: string | null;
  actorUserId: number | null;
  sourceLockerId: number | null;
  destinationLockerId: number | null;
  blockedLockerId: number | null;
  message: string | null;
  weatherStatus: string | null;
  maxWindSpeedKmh: number | null;
  maxWindGustKmh: number | null;
  maxPrecipitationMm: number | null;
  weatherCode: number | null;
  weatherProvider: string | null;
}

export interface DroneStationSuspensionLog {
  id: number;
  lockerId: number;
  /** SUSPEND | RESUME */
  action: string;
  reason: string | null;
  note: string | null;
  resumeAt: string | null;
  actorUserId: number | null;
  createdAt: string;
}

export interface SuspendStationArgs {
  lockerId: number;
  reason: string;
  note?: string | null;
  /** LocalDateTime UTC không offset; null = dừng tới khi mở lại. */
  resumeAt?: string | null;
}

export interface FlightBlockFilters {
  cause?: string;
  action?: string;
  lockerId?: number;
  orderCode?: string;
  /** yyyy-MM-dd */
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export const droneFlightControlApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFlightStations: builder.query<ApiResponse<DroneLockerWeather[]>, void>({
      query: () => `${BASE}/stations`,
      providesTags: [{ type: TAG, id: "stations" }],
    }),
    suspendStation: builder.mutation<ApiResponse<DroneStationSuspension>, SuspendStationArgs>({
      query: ({ lockerId, ...body }) => ({
        url: `${BASE}/stations/${lockerId}/suspension`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        { type: TAG, id: "stations" },
        { type: TAG, id: "logs" },
      ],
    }),
    resumeStation: builder.mutation<ApiResponse<null>, number>({
      query: (lockerId) => ({ url: `${BASE}/stations/${lockerId}/suspension`, method: "DELETE" }),
      invalidatesTags: [
        { type: TAG, id: "stations" },
        { type: TAG, id: "logs" },
      ],
    }),
    getStationSuspensionLogs: builder.query<ApiResponse<DroneStationSuspensionLog[]>, { lockerId?: number; limit?: number }>({
      query: ({ lockerId, limit }) => ({
        url: `${BASE}/suspension-logs`,
        params: { limit: limit ?? 50, ...(lockerId ? { lockerId } : {}) },
      }),
      providesTags: [{ type: TAG, id: "logs" }],
    }),
    getFlightBlocks: builder.query<ApiResponse<PageResponse<DroneFlightBlock>>, FlightBlockFilters>({
      query: (filters) => ({
        url: `${BASE}/blocks`,
        params: Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ""),
        ),
      }),
      providesTags: [{ type: TAG, id: "blocks" }],
    }),
    getFlightBlockSummary: builder.query<ApiResponse<Record<string, number>>, number | void>({
      query: (hours) => ({ url: `${BASE}/blocks/summary`, params: { hours: hours ?? 24 } }),
      providesTags: [{ type: TAG, id: "blocks" }],
    }),
  }),
});

export const {
  useGetFlightStationsQuery,
  useSuspendStationMutation,
  useResumeStationMutation,
  useGetStationSuspensionLogsQuery,
  useGetFlightBlocksQuery,
  useGetFlightBlockSummaryQuery,
} = droneFlightControlApi;
