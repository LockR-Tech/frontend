import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types";

export interface DroneIncidentEvidence {
  id: number;
  stage: string;
  secureUrl: string;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyM: number | null;
  capturedAt: string | null;
  uploadedByUserId: number;
  createdAt: string;
}

export interface DroneIncidentTimelineItem {
  id: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorUserId: number | null;
  note: string | null;
  metadataJson: string | null;
  createdAt: string;
}

export interface DroneIncidentProposal {
  id: number;
  proposalVersion: number;
  resolutionType: string;
  redeliveryOffered: boolean;
  compensationAmount: number | null;
  refundShippingFee: boolean;
  policyVersion: string;
  overrideReason: string | null;
  proposedByUserId: number;
  status: string;
  customerResponseNote: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface DroneParcelIncident {
  id: number;
  incidentCode: string;
  orderId: number;
  orderCode: string | null;
  missionId: number;
  droneUnitId: number;
  droneCode: string;
  customerUserId: number | null;
  reportedByUserId: number;
  reason: string;
  status: string;
  parcelStatus: string;
  recoveryStatus: string;
  inspectionStatus: string;
  redeliveryStatus: string;
  compensationStatus: string;
  returnFlightStatus: string;
  dropLatitude: number | null;
  dropLongitude: number | null;
  gpsAccuracyM: number | null;
  gpsSource: string;
  telemetryObservedAt: string | null;
  telemetryStale: boolean;
  telemetryJson: string | null;
  cameraStatus: string;
  cameraSnapshotUrl: string | null;
  inspectionReportId: number | null;
  recoveryAssignedToUserId: number | null;
  recoveryLockerId: number | null;
  recoveryOutcome: string | null;
  parcelCondition: string | null;
  recoveryNote: string | null;
  recoveredLatitude: number | null;
  recoveredLongitude: number | null;
  recoveredGpsAccuracyM: number | null;
  returnedToHubAt: string | null;
  redeliveryOrderId: number | null;
  compensationReference: string | null;
  createdAt: string;
  updatedAt: string;
  evidence: DroneIncidentEvidence[];
  timeline: DroneIncidentTimelineItem[];
  proposals: DroneIncidentProposal[];
}

const TAG = "DroneIncidents" as const;

export const droneIncidentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDroneIncidents: builder.query<ApiResponse<DroneParcelIncident[]>, void>({
      query: () => "/api/admin/drone-incidents",
      providesTags: [TAG],
    }),
    getDroneIncident: builder.query<ApiResponse<DroneParcelIncident>, number>({
      query: (id) => `/api/admin/drone-incidents/${id}`,
      providesTags: (_result, _error, id) => [{ type: TAG, id }],
    }),
    verifyDroneRecovery: builder.mutation<
      ApiResponse<DroneParcelIncident>,
      number
    >({
      query: (id) => ({
        url: `/api/admin/drone-incidents/${id}/recovery/verify`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [TAG, { type: TAG, id }],
    }),
    assignDroneRecovery: builder.mutation<
      ApiResponse<DroneParcelIncident>,
      {
        id: number;
        technicianId: number;
        responsibilityLockerId?: number;
        note?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/admin/drone-incidents/${id}/recovery/assign`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [TAG, { type: TAG, id }],
    }),
    createDroneIncidentProposal: builder.mutation<
      ApiResponse<DroneParcelIncident>,
      {
        id: number;
        resolutionType: string;
        redeliveryOffered: boolean;
        compensationAmount: number;
        refundShippingFee: boolean;
        overrideReason?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/admin/drone-incidents/${id}/proposals`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [TAG, { type: TAG, id }],
    }),
    approveDroneIncidentCompensation: builder.mutation<
      ApiResponse<DroneParcelIncident>,
      number
    >({
      query: (id) => ({
        url: `/api/admin/drone-incidents/${id}/compensation/approve`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [TAG, { type: TAG, id }],
    }),
  }),
});

export const {
  useGetDroneIncidentsQuery,
  useGetDroneIncidentQuery,
  useVerifyDroneRecoveryMutation,
  useAssignDroneRecoveryMutation,
  useCreateDroneIncidentProposalMutation,
  useApproveDroneIncidentCompensationMutation,
} = droneIncidentApi;
