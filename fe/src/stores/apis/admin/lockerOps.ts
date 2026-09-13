import { baseApi } from '../../baseAPi';
import type { ApiResponse } from '../../../types';

// ---- Types mirroring locker-service Phase 1/2 DTOs ----

export interface CellResponse {
  id: number;
  boxNumber: number;
  size: string | null;
  cellType: 'DRONE' | 'STANDARD' | 'XL';
  rowIndex: number | null;
  colIndex: number | null;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'FAULT' | string;
  faultReason: string | null;
}

export interface LockerLayoutResponse {
  lockerId: number;
  code: string;
  name: string;
  status: string;
  landingPad: boolean;
  landingMarkerId: string | null;
  totalCells: number;
  availableCells: number;
  faultCells: number;
  cells: CellResponse[];
}

export interface LockerStatsResponse {
  lockerId: number;
  code: string;
  name: string;
  status: string;
  landingPad: boolean;
  totalCells: number;
  availableCells: number;
  reservedCells: number;
  occupiedCells: number;
  faultCells: number;
  utilization: number;
  openReports: number;
}

export interface FaultCellResponse {
  lockerId: number;
  lockerCode: string | null;
  lockerName: string | null;
  lockerAddress: string | null;
  lockerLatitude: number | null;
  lockerLongitude: number | null;
  boxId: number;
  boxNumber: number;
  cellType: string;
  rowIndex: number | null;
  colIndex: number | null;
  faultReason: string | null;
  openReportId: number | null;
}

export interface LockerReportResponse {
  id: number;
  lockerId: number;
  boxId: number | null;
  userId: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | string;
  assignedToUserId: number | null;
  assignedAt: string | null;
  resolvedByUserId: number | null;
  resolvedAt: string | null;
  createdAt: string;
  lockerCode: string | null;
  lockerName: string | null;
  lockerAddress: string | null;
  lockerLatitude: number | null;
  lockerLongitude: number | null;
  boxNumber: number | null;
  cellType: string | null;
  slaHours: number | null;
  slaDueAt: string | null;
  overdue: boolean | null;
  reporterName: string | null;
  reporterPhone: string | null;
}

export interface RepairLogResponse {
  id: number;
  reportId: number;
  actorUserId: number | null;
  note: string;
  createdAt: string;
}

export interface MaintenanceScheduleResponse {
  id: number;
  lockerId: number;
  lockerName: string | null;
  lockerCode: string | null;
  title: string;
  intervalDays: number;
  lastDoneAt: string | null;
  nextDueAt: string | null;
  active: boolean | null;
  due: boolean | null;
}

export interface DeviceStatusResponse {
  id: number;
  deviceId: string;
  lockerId: number | null;
  status: string;
  lastSeenAt: string | null;
}

const TAG = 'Lockers' as const;

export const lockerOpsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLockerStats: builder.query<ApiResponse<LockerStatsResponse[]>, void>({
      query: () => '/api/admin/lockers/stats',
      providesTags: [TAG],
    }),

    getLockerLayout: builder.query<ApiResponse<LockerLayoutResponse>, number>({
      query: (lockerId) => `/api/lockers/${lockerId}/layout`,
      providesTags: (_r, _e, id) => [{ type: TAG, id }],
    }),

    getFaultCells: builder.query<ApiResponse<FaultCellResponse[]>, void>({
      query: () => '/api/maintenance/faults',
      providesTags: [TAG],
    }),

    getMaintenanceReports: builder.query<ApiResponse<LockerReportResponse[]>, void>({
      query: () => '/api/maintenance/reports',
      providesTags: [TAG],
    }),

    claimReport: builder.mutation<ApiResponse<LockerReportResponse>, number>({
      query: (reportId) => ({
        url: `/api/maintenance/reports/${reportId}/claim`,
        method: 'PUT',
      }),
      invalidatesTags: [TAG],
    }),

    resolveReport: builder.mutation<ApiResponse<LockerReportResponse>, number>({
      query: (reportId) => ({
        url: `/api/maintenance/reports/${reportId}/resolve`,
        method: 'PUT',
      }),
      invalidatesTags: [TAG],
    }),

    reportBoxFault: builder.mutation<ApiResponse<CellResponse>, { boxId: number; reason: string }>({
      query: ({ boxId, reason }) => ({
        url: `/api/boxes/${boxId}/fault`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: [TAG],
    }),

    clearBoxFault: builder.mutation<ApiResponse<CellResponse>, number>({
      query: (boxId) => ({
        url: `/api/maintenance/boxes/${boxId}/clear-fault`,
        method: 'POST',
      }),
      invalidatesTags: [TAG],
    }),

    // L5 — vòng đời ô: ngưng dùng / vệ sinh / khôi phục
    setBoxOutOfService: builder.mutation<
      ApiResponse<CellResponse>,
      { boxId: number; reason?: string }
    >({
      query: ({ boxId, reason }) => ({
        url: `/api/maintenance/boxes/${boxId}/out-of-service`,
        method: 'POST',
        body: reason ? { reason } : undefined,
      }),
      invalidatesTags: [TAG],
    }),

    setBoxCleaning: builder.mutation<ApiResponse<CellResponse>, number>({
      query: (boxId) => ({
        url: `/api/maintenance/boxes/${boxId}/cleaning`,
        method: 'POST',
      }),
      invalidatesTags: [TAG],
    }),

    returnBoxToService: builder.mutation<ApiResponse<CellResponse>, number>({
      query: (boxId) => ({
        url: `/api/maintenance/boxes/${boxId}/return-to-service`,
        method: 'POST',
      }),
      invalidatesTags: [TAG],
    }),

    // Emergency override: open a box without the customer's PIN/QR. Always
    // audited (credential MASTER) by iot-service's box_access_logs.
    forceOpenBox: builder.mutation<ApiResponse<Record<string, unknown>>, number>({
      query: (boxId) => ({
        url: `/api/maintenance/boxes/${boxId}/force-open`,
        method: 'POST',
      }),
      invalidatesTags: [TAG],
    }),

    // L5 — nhật ký xử lý phiếu bảo trì (work-log)
    getReportLogs: builder.query<ApiResponse<RepairLogResponse[]>, number>({
      query: (reportId) => `/api/maintenance/reports/${reportId}/logs`,
      providesTags: (_r, _e, id) => [{ type: TAG, id: `logs-${id}` }],
    }),

    addReportLog: builder.mutation<
      ApiResponse<RepairLogResponse>,
      { reportId: number; note: string }
    >({
      query: ({ reportId, note }) => ({
        url: `/api/maintenance/reports/${reportId}/logs`,
        method: 'POST',
        body: { note },
      }),
      invalidatesTags: (_r, _e, { reportId }) => [{ type: TAG, id: `logs-${reportId}` }],
    }),

    // L5 — bảo trì phòng ngừa (lịch kiểm tra định kỳ), dùng bởi MaintenanceSchedules.tsx
    getMaintenanceSchedules: builder.query<
      ApiResponse<MaintenanceScheduleResponse[]>,
      void
    >({
      query: () => '/api/maintenance/schedules',
      providesTags: [{ type: TAG, id: 'schedules' }],
    }),

    createMaintenanceSchedule: builder.mutation<
      ApiResponse<MaintenanceScheduleResponse>,
      { lockerId: number; title: string; intervalDays: number }
    >({
      query: (body) => ({
        url: '/api/admin/lockers/schedules',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: TAG, id: 'schedules' }],
    }),

    completeMaintenanceSchedule: builder.mutation<
      ApiResponse<MaintenanceScheduleResponse>,
      number
    >({
      query: (id) => ({
        url: `/api/maintenance/schedules/${id}/complete`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: TAG, id: 'schedules' }],
    }),

    deleteMaintenanceSchedule: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: `/api/admin/lockers/schedules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: TAG, id: 'schedules' }],
    }),

    // Cabinet heartbeat was collected but never surfaced anywhere until now.
    getDeviceStatuses: builder.query<ApiResponse<DeviceStatusResponse[]>, void>({
      query: () => '/api/admin/iot/device-status',
      providesTags: [{ type: TAG, id: 'device-status' }],
    }),
  }),
});

export const {
  useGetLockerStatsQuery,
  useGetLockerLayoutQuery,
  useGetFaultCellsQuery,
  useGetMaintenanceReportsQuery,
  useClaimReportMutation,
  useResolveReportMutation,
  useReportBoxFaultMutation,
  useClearBoxFaultMutation,
  useSetBoxOutOfServiceMutation,
  useSetBoxCleaningMutation,
  useReturnBoxToServiceMutation,
  useForceOpenBoxMutation,
  useGetReportLogsQuery,
  useAddReportLogMutation,
  useGetMaintenanceSchedulesQuery,
  useCreateMaintenanceScheduleMutation,
  useCompleteMaintenanceScheduleMutation,
  useDeleteMaintenanceScheduleMutation,
  useGetDeviceStatusesQuery,
} = lockerOpsApi;
