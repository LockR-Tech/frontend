import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types";
import type { ReportAttachmentRequest } from "../media";

// Đội drone giao/nhận gắn với bãi đáp của tủ (locker-service).
// Toàn bộ thao tác của trang ADMIN đi qua route admin. Route drone-technician
// giữ riêng quy tắc claim/ownership cho ứng dụng của kỹ thuật viên drone.
export interface DroneDeviceResponse {
  id: number;
  macAddress: string;
  droneId: number | null;
  droneCode: string | null;
  ipAddress: string | null;
  firmwareVersion: string | null;
  mavlinkStatus: string;
  flightMode: string;
  armed: boolean;
  landedState: string;
  gpsFixType: number;
  gpsSatellites: number;
  batteryPercent: number;
  voltageV: number | null;
  currentA: number | null;
  cameraStatus: string;
  cameraStreamUrl: string | null;
  lastSeenAt: string | null;
  online: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DroneResponse {
  id: number;
  code: string;
  status: string; // IDLE | CHARGING | IN_FLIGHT | MAINTENANCE | FAULT | IN_USE
  batteryPercent: number | null;
  lockerId: number | null;
  lockerName: string | null;
  faultReason: string | null;
  assignedTechnicianId: number | null;
  assignedTechnicianName: string | null;
  lastChargedAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DroneIncidentReportResponse {
  id: number;
  title: string;
  description: string;
  status: string;
  droneUnitId: number | null;
  droneCode: string | null;
}

export interface DroneOperationLogResponse {
  id: number;
  droneUnitId: number;
  actorUserId: number | null;
  note: string;
  createdAt: string;
}

const TAG = "Drones" as const;

export const droneManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDrones: builder.query<ApiResponse<DroneResponse[]>, void>({
      query: () => "/api/admin/drones",
      providesTags: [TAG],
    }),

    getDrone: builder.query<ApiResponse<DroneResponse>, number>({
      query: (id) => `/api/admin/drones/${id}`,
      providesTags: (_result, _error, id) => [{ type: TAG, id }],
    }),

    getDroneOperationLogs: builder.query<ApiResponse<DroneOperationLogResponse[]>, number>({
      query: (id) => `/api/admin/drones/${id}/logs`,
      providesTags: (_result, _error, id) => [{ type: TAG, id: `logs-${id}` }],
    }),

    assignDroneTechnician: builder.mutation<
      ApiResponse<DroneResponse>,
      { id: number; technicianId: number | null }
    >({
      query: ({ id, technicianId }) => ({
        url: `/api/admin/drones/${id}/assign`,
        method: "PUT",
        body: { technicianId },
      }),
      invalidatesTags: (_result, _error, { id }) => [TAG, { type: TAG, id }, { type: TAG, id: `logs-${id}` }],
    }),

    createDrone: builder.mutation<
      ApiResponse<DroneResponse>,
      { lockerId: number; code: string }
    >({
      query: (body) => ({
        url: "/api/admin/lockers/drones",
        method: "POST",
        body,
      }),
      invalidatesTags: [TAG],
    }),

    updateDrone: builder.mutation<
      ApiResponse<DroneResponse>,
      { id: number; lockerId?: number; code?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/admin/drones/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [TAG],
    }),

    decommissionDrone: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: `/api/admin/drones/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [TAG],
    }),

    updateDroneStatus: builder.mutation<
      ApiResponse<DroneResponse>,
      { id: number; status: string; reason?: string }
    >({
      query: ({ id, status, reason }) => ({
        url: `/api/admin/drones/${id}/status`,
        method: "POST",
        body: { status, ...(reason ? { reason } : {}) },
      }),
      invalidatesTags: [TAG],
    }),

    createDroneIncidentReport: builder.mutation<
      ApiResponse<DroneIncidentReportResponse>,
      { id: number; title: string; description: string; attachments?: ReportAttachmentRequest[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/admin/drones/${id}/reports`,
        method: "POST",
        body,
      }),
      invalidatesTags: [TAG],
    }),

    updateDroneBattery: builder.mutation<
      ApiResponse<DroneResponse>,
      { id: number; batteryPercent: number }
    >({
      query: ({ id, batteryPercent }) => ({
        url: `/api/admin/drones/${id}/battery`,
        method: "POST",
        body: { batteryPercent },
      }),
      invalidatesTags: [TAG],
    }),

    getDroneDevice: builder.query<ApiResponse<DroneDeviceResponse>, number>({
      query: (id) => `/api/admin/drones/${id}/device`,
      providesTags: (_result, _error, id) => [{ type: TAG, id: `device-${id}` }],
    }),

    getDroneDevices: builder.query<ApiResponse<DroneDeviceResponse[]>, void>({
      query: () => "/api/admin/drone-devices",
      providesTags: [TAG],
    }),

    assignDroneDevice: builder.mutation<
      ApiResponse<DroneDeviceResponse>,
      { deviceId: number; droneId: number }
    >({
      query: ({ deviceId, droneId }) => ({
        url: `/api/admin/drone-devices/${deviceId}/assign`,
        method: "POST",
        body: { droneId },
      }),
      invalidatesTags: [TAG],
    }),

    unassignDroneDevice: builder.mutation<ApiResponse<DroneDeviceResponse>, number>({
      query: (deviceId) => ({
        url: `/api/admin/drone-devices/${deviceId}/unassign`,
        method: "POST",
      }),
      invalidatesTags: [TAG],
    }),
  }),
});

export const {
  useGetDronesQuery,
  useGetDroneQuery,
  useGetDroneOperationLogsQuery,
  useAssignDroneTechnicianMutation,
  useCreateDroneMutation,
  useUpdateDroneMutation,
  useDecommissionDroneMutation,
  useUpdateDroneStatusMutation,
  useCreateDroneIncidentReportMutation,
  useUpdateDroneBatteryMutation,
  useGetDroneDeviceQuery,
  useGetDroneDevicesQuery,
  useAssignDroneDeviceMutation,
  useUnassignDroneDeviceMutation,
} = droneManagementApi;
