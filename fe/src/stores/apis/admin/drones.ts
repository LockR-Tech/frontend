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

export interface DroneIotLogResponse {
  id: number;
  droneId: number;
  droneCode: string;
  component: string;
  eventType: string;
  result: string;
  actorType: string;
  actorId?: string | null;
  orderId?: number | null;







  message: string;

  createdAt: string;
}

export interface DroneIotLogQueryParams {
  droneId: number;
  component?: string;
  eventType?: string;
  result?: string;
  search?: string;
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

    // Xoá mềm, bắt buộc có lý do.
    decommissionDrone: builder.mutation<ApiResponse<void>, { id: number; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/api/admin/drones/${id}`,
        method: "DELETE",
        params: { reason },
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
      { deviceId: number; droneId: number; ipAddress?: string }
    >({
      query: ({ deviceId, droneId, ipAddress }) => ({
        url: `/api/admin/drone-devices/${deviceId}/assign`,
        method: "POST",
        body: { droneId, ipAddress },
      }),
      invalidatesTags: (_result, _error, { droneId }) => [
        TAG,
        { type: TAG, id: droneId },
        { type: TAG, id: `device-${droneId}` },
        { type: TAG, id: `logs-${droneId}` },
        { type: TAG, id: `iot-logs-${droneId}` },
      ],
    }),

    unassignDroneDevice: builder.mutation<
      ApiResponse<DroneDeviceResponse>,
      { deviceId: number; droneId?: number } | number
    >({
      query: (arg) => {
        const deviceId = typeof arg === "number" ? arg : arg.deviceId;
        return {
          url: `/api/admin/drone-devices/${deviceId}/unassign`,
          method: "POST",
        };
      },
      invalidatesTags: (_result, _error, arg) => {
        const droneId =
          typeof arg === "object" ? arg.droneId : _result?.data?.droneId;
        return [
          TAG,
          ...(droneId
            ? [
                { type: TAG, id: droneId },
                { type: TAG, id: `device-${droneId}` },
                { type: TAG, id: `logs-${droneId}` },
                { type: TAG, id: `iot-logs-${droneId}` },
              ]
            : []),
        ];
      },
    }),

    registerDroneDevice: builder.mutation<
      ApiResponse<DroneDeviceResponse>,
      {
        droneId: number;
        code?: string;
        macAddress?: string;
        ipAddress?: string;
        batteryPercent?: number;
        voltageV?: number;
        currentA?: number;
        firmwareVersion?: string;
        mavlinkStatus?: string;
        flightMode?: string;
        armed?: boolean;
        landedState?: string;
        gpsFixType?: number;
        gpsSatellites?: number;
        cameraStatus?: string;
        cameraStreamUrl?: string;
      }
    >({
      query: ({ droneId, ...body }) => ({
        url: `/api/admin/drones/${droneId}/device`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { droneId }) => [
        TAG,
        { type: TAG, id: droneId },
        { type: TAG, id: `device-${droneId}` },
        { type: TAG, id: `logs-${droneId}` },
        { type: TAG, id: `iot-logs-${droneId}` },
      ],
    }),

    getDroneIotLogs: builder.query<ApiResponse<DroneIotLogResponse[]>, DroneIotLogQueryParams | number>({
      query: (arg) => {
        const droneId = typeof arg === "number" ? arg : arg.droneId;
        const params =
          typeof arg === "number"
            ? {}
            : {
                component: arg.component && arg.component !== "ALL" ? arg.component : undefined,
                eventType: arg.eventType && arg.eventType !== "ALL" ? arg.eventType : undefined,
                result: arg.result && arg.result !== "ALL" ? arg.result : undefined,
                search: arg.search?.trim() ? arg.search.trim() : undefined,
              };
        return {
          url: `/api/admin/drones/${droneId}/iot-logs`,
          params,
        };
      },
      providesTags: (_result, _error, arg) => {
        const droneId = typeof arg === "number" ? arg : arg.droneId;
        return [TAG, { type: TAG, id: `iot-logs-${droneId}` }];
      },
    }),

    createDroneIotLog: builder.mutation<
      ApiResponse<DroneIotLogResponse>,
      {
        droneId: number;
        droneCode?: string;
        component: string;
        eventType: string;
        result: string;
        actorType?: string;
        actorId?: string;
        orderId?: number;







        message: string;

      }
    >({
      query: ({ droneId, ...body }) => ({
        url: `/api/admin/drones/${droneId}/iot-logs`,
        method: "POST",
        body: { droneId, ...body },
      }),
      invalidatesTags: (_result, _error, { droneId }) => [TAG, { type: TAG, id: `iot-logs-${droneId}` }],
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
  useRegisterDroneDeviceMutation,
  useGetDroneIotLogsQuery,
  useCreateDroneIotLogMutation,
} = droneManagementApi;
