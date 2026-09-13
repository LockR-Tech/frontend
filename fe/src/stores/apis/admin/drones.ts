import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types";

// Đội drone giao/nhận gắn với bãi đáp của tủ (locker-service).
// Đọc/tạo/sửa/ngưng qua route admin; đổi trạng thái + pin qua route maintenance
// (ADMIN có quyền trên cả hai nhóm route).
export interface DroneResponse {
  id: number;
  code: string;
  status: string; // IDLE | CHARGING | IN_FLIGHT | MAINTENANCE | FAULT | IN_USE
  batteryPercent: number | null;
  lockerId: number | null;
  lockerName: string | null;
  faultReason: string | null;
}

const TAG = "Drones" as const;

export const droneManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDrones: builder.query<ApiResponse<DroneResponse[]>, void>({
      query: () => "/api/admin/drones",
      providesTags: [TAG],
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
        url: `/api/maintenance/drones/${id}/status`,
        method: "POST",
        body: { status, ...(reason ? { reason } : {}) },
      }),
      invalidatesTags: [TAG],
    }),

    updateDroneBattery: builder.mutation<
      ApiResponse<DroneResponse>,
      { id: number; batteryPercent: number }
    >({
      query: ({ id, batteryPercent }) => ({
        url: `/api/maintenance/drones/${id}/battery`,
        method: "POST",
        body: { batteryPercent },
      }),
      invalidatesTags: [TAG],
    }),
  }),
});

export const {
  useGetDronesQuery,
  useCreateDroneMutation,
  useUpdateDroneMutation,
  useDecommissionDroneMutation,
  useUpdateDroneStatusMutation,
  useUpdateDroneBatteryMutation,
} = droneManagementApi;
