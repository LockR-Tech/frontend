import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types";
import { ADMIN_ENDPOINTS } from "../../../constants";

export interface ParcelDropIncident {
  id: number; incidentNumber: string; incidentType: string; status: string; priority: string;
  droneId: number; orderId: number | null; reporterId: number; reporterRole: string | null;
  assignedTechnicianId: number | null; title: string; note: string; reportedAt: string;
  metadata: Record<string, unknown>;
  evidence?: Array<{ id: number; stage: string; url: string; latitude?: number; longitude?: number }>;
}

export const parcelDropIncidentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createParcelDropIncident: builder.mutation<ApiResponse<ParcelDropIncident>, { droneId: number; orderId?: number; incidentType?: "PARCEL_DROP" | "CONNECTION_LOST" | "DRONE_FAULT"; note?: string }>({
      query: (body) => ({ url: ADMIN_ENDPOINTS.PARCEL_DROP_INCIDENTS, method: "POST", body }),
      invalidatesTags: ["Incidents"],
    }),
    getParcelDropIncidents: builder.query<ApiResponse<ParcelDropIncident[]>, void>({ query: () => ADMIN_ENDPOINTS.PARCEL_DROP_INCIDENTS, providesTags: ["Incidents"] }),
    compensationParcelDropIncident: builder.mutation<ApiResponse<ParcelDropIncident>, { id: number; action: string; note?: string; approvedAmount?: number }>({ query: ({ id, action, ...body }) => ({ url: ADMIN_ENDPOINTS.PARCEL_DROP_COMPENSATION(id, action), method: "POST", body }), invalidatesTags: ["Incidents"] }),
    assignParcelDropIncident: builder.mutation<ApiResponse<ParcelDropIncident>, { id: number; technicianId: number }>({ query: ({ id, technicianId }) => ({ url: ADMIN_ENDPOINTS.PARCEL_DROP_ASSIGN(id), method: "PUT", params: { technicianId } }), invalidatesTags: ["Incidents"] }),
    closeParcelDropIncident: builder.mutation<ApiResponse<ParcelDropIncident>, { id: number; resolution?: string }>({ query: ({ id, resolution }) => ({ url: ADMIN_ENDPOINTS.PARCEL_DROP_CLOSE(id), method: "POST", params: resolution ? { resolution } : undefined }), invalidatesTags: ["Incidents"] }),
  }),
});

export const { useGetParcelDropIncidentsQuery, useCreateParcelDropIncidentMutation, useCompensationParcelDropIncidentMutation, useAssignParcelDropIncidentMutation, useCloseParcelDropIncidentMutation } = parcelDropIncidentApi;
