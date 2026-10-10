import { baseApi } from "~/stores/baseAPi";
import type { ApiResponse } from "~/types";
import type { DroneParcelIncident } from "~/stores/apis/admin/droneIncidents";

// Slice droneIncidents.ts chưa có endpoint bàn giao hub. Backend chỉ mở ở route KTV
// (DroneParcelIncidentController#hubHandover) nhưng cho phép ADMIN; gateway cũng cho
// ADMIN đi qua /api/locker-technician/**. Không có body.
export const droneIncidentHubApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    confirmDroneParcelHubHandover: builder.mutation<
      ApiResponse<DroneParcelIncident>,
      number
    >({
      query: (id) => ({
        url: `/api/locker-technician/drone-recoveries/${id}/hub-handover`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        "DroneIncidents",
        { type: "DroneIncidents", id },
      ],
    }),
  }),
});

export const { useConfirmDroneParcelHubHandoverMutation } = droneIncidentHubApi;
