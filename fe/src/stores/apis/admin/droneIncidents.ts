import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types";

export interface DroneIncidentEvidence {
  id: number;
  stage: string;
  url?: string;
  secureUrl?: string;
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
  /** order-service trả `version`; giữ `proposalVersion` cho dữ liệu mẫu cũ. */
  version?: number;
  proposalVersion?: number;
  resolutionType: string;
  redeliveryOffered: boolean;
  compensationAmount: number | null;
  refundShippingFee: boolean;
  policyVersion: string;
  overrideReason: string | null;
  /** Nội dung phương án gửi khách (bắt buộc với thỏa thuận riêng). */
  resolutionNote?: string | null;
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
  orderStatus?: string | null;
  deliveryStage?: string | null;
  compensationRate?: number | null;
  declaredValue?: number | null;
  suggestedCompensation?: number | null;
  recoveryTechnicianName?: string | null;
  recoveryTechnicianPhone?: string | null;
  recoveryTechnicianRole?: string | null;
  compensationCap?: number | null;
  freeRedeliveryAllowed?: boolean;
  refundShippingFeeAllowed?: boolean;
  recoverySlaHours?: number | null;
  approvalRequired?: boolean;
  incidentPolicyEnabled?: boolean;
  disputeAllowed?: boolean;
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
        resolutionNote?: string;
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
    completeDroneIncidentRedelivery: builder.mutation<
      ApiResponse<DroneParcelIncident>,
      number
    >({
      query: (id) => ({
        url: `/api/admin/drone-incidents/${id}/redelivery/complete`,
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
  useCompleteDroneIncidentRedeliveryMutation,
} = droneIncidentApi;

export const SAMPLE_DRONE_INCIDENTS: DroneParcelIncident[] = [
  {
    id: 999,
    incidentCode: "INC-2026-DROP-001",
    orderId: 8801,
    orderCode: "ORD-2026-8801",
    missionId: 501,
    droneUnitId: 101,
    droneCode: "DRN-HCMC-09",
    customerUserId: 1,
    reportedByUserId: 1,
    reason:
      "Drone gặp sự cố mất lực nâng cánh quạt số 3 khi cách điểm giao 350m. Kiện hàng rơi xuống bãi cỏ khuôn viên ĐH FPT (gần Tủ thông minh FPT-01). Hệ thống kích hoạt tìm kiếm KTV Kiosk & Drone gần nhất trong bán kính R.",
    status: "RECOVERY_IN_PROGRESS",
    parcelStatus: "DROPPED",
    recoveryStatus: "ASSIGNED",
    inspectionStatus: "PENDING",
    redeliveryStatus: "NOT_STARTED",
    compensationStatus: "PENDING",
    returnFlightStatus: "LANDED_EMERGENCY",
    dropLatitude: 10.84155,
    dropLongitude: 106.8102,
    gpsAccuracyM: 2.5,
    gpsSource: "DRONE_TELEMETRY",
    telemetryObservedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    telemetryStale: false,
    telemetryJson: JSON.stringify({
      altitudeM: 0.1,
      speedKmh: 0.0,
      batteryPercent: 42,
      lastHealthWarning: "MOTOR_3_CURRENT_SPIKE",
    }),
    cameraStatus: "ONLINE",
    cameraSnapshotUrl:
      "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800",
    inspectionReportId: null,
    recoveryAssignedToUserId: null,
    recoveryLockerId: null,
    recoveryOutcome: null,
    parcelCondition: null,
    recoveryNote: null,
    recoveredLatitude: null,
    recoveredLongitude: null,
    recoveredGpsAccuracyM: null,
    returnedToHubAt: null,
    redeliveryOrderId: null,
    compensationReference: null,
    compensationRate: 60,
    compensationCap: 0,
    freeRedeliveryAllowed: true,
    refundShippingFeeAllowed: true,
    recoverySlaHours: 4,
    approvalRequired: true,
    disputeAllowed: true,
    incidentPolicyEnabled: true,
    declaredValue: 350000,
    suggestedCompensation: 210000,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    evidence: [],
    timeline: [
      {
        id: 1,
        eventType: "DRONE_DROPPED_PARCEL",
        fromStatus: "DELIVERING",
        toStatus: "RECOVERY_IN_PROGRESS",
        actorUserId: null,
        note: "Cảm biến gia tốc phát hiện rơi tự do từ độ cao 28m. Ngắt motor cánh quạt khẩn cấp.",
        metadataJson: null,
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        eventType: "SEARCH_RADIUS_TRIGGERED",
        fromStatus: "REPORTED",
        toStatus: "ASSIGNED",
        actorUserId: 1,
        note: "Kích hoạt tìm kiếm KTV gần nhất trong bán kính R = 3km. Phát hiện 3 ứng viên.",
        metadataJson: null,
        createdAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      },
    ],
    proposals: [],
  },
  {
    id: 998,
    incidentCode: "INC-2026-DROP-002",
    orderId: 8802,
    orderCode: "ORD-2026-8802",
    missionId: 502,
    droneUnitId: 102,
    droneCode: "DRN-HCMC-14",
    customerUserId: 2,
    reportedByUserId: 1,
    reason:
      "Gió giật mạnh tại toạ độ giao hàng khiến drone mất thăng bằng phải hạ cánh khẩn cấp. Kiện hàng rơi cách tủ FPT 75m.",
    status: "AWAITING_ADMIN_REVIEW",
    parcelStatus: "RETRIEVED",
    recoveryStatus: "SUBMITTED",
    inspectionStatus: "COMPLETED",
    redeliveryStatus: "NOT_STARTED",
    compensationStatus: "PENDING",
    returnFlightStatus: "RTH_COMPLETED",
    dropLatitude: 10.84155,
    dropLongitude: 106.8102,
    gpsAccuracyM: 3.0,
    gpsSource: "DRONE_TELEMETRY",
    telemetryObservedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    telemetryStale: false,
    telemetryJson: JSON.stringify({
      altitudeM: 0.0,
      speedKmh: 0.0,
      batteryPercent: 35,
    }),
    cameraStatus: "ONLINE",
    cameraSnapshotUrl:
      "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800",
    inspectionReportId: null,
    recoveryAssignedToUserId: 12,
    recoveryLockerId: 1,
    recoveryOutcome: "FOUND",
    parcelCondition: "INTACT",
    recoveryNote:
      "Đã tiếp cận hiện trường và tìm thấy kiện hàng tại bãi cỏ gần hàng rào. Hộp carton còn nguyên seal niêm phong, không móp méo, mã vận đơn ORD-2026-8802 rõ ràng. Drone cánh số 2 bị gãy nhẹ đã được thu hồi kèm theo.",
    recoveredLatitude: 10.84159,
    recoveredLongitude: 106.81024,
    recoveredGpsAccuracyM: 3.2,
    returnedToHubAt: null,
    redeliveryOrderId: null,
    compensationReference: null,
    compensationRate: 60,
    compensationCap: 0,
    freeRedeliveryAllowed: true,
    refundShippingFeeAllowed: true,
    recoverySlaHours: 4,
    approvalRequired: true,
    disputeAllowed: true,
    incidentPolicyEnabled: true,
    declaredValue: 500000,
    suggestedCompensation: 300000,
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    evidence: [
      {
        id: 1,
        stage: "ON_SITE_RECOVERY",
        secureUrl:
          "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
        caption: "Ảnh kiện hàng còn nguyên seal tại vị trí phát hiện",
        latitude: 10.84159,
        longitude: 106.81024,
        gpsAccuracyM: 3.2,
        capturedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        uploadedByUserId: 12,
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        stage: "ON_SITE_RECOVERY",
        secureUrl:
          "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800",
        caption: "Toàn cảnh hiện trường bãi cỏ quanh khu vực rơi",
        latitude: 10.841592,
        longitude: 106.810238,
        gpsAccuracyM: 4.0,
        capturedAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
        uploadedByUserId: 12,
        createdAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
      },
    ],
    timeline: [
      {
        id: 1,
        eventType: "DRONE_DROPPED_PARCEL",
        fromStatus: "DELIVERING",
        toStatus: "RECOVERY_IN_PROGRESS",
        actorUserId: null,
        note: "Drone hạ cánh khẩn cấp do gió xoáy",
        metadataJson: null,
        createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        eventType: "RECOVERY_ASSIGNED",
        fromStatus: "REPORTED",
        toStatus: "ASSIGNED",
        actorUserId: 1,
        note: "Phân công KTV Kiosk Nguyễn Văn Tuấn (cách 70m)",
        metadataJson: null,
        createdAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        eventType: "RECOVERY_ACCEPTED",
        fromStatus: "ASSIGNED",
        toStatus: "ACCEPTED",
        actorUserId: 12,
        note: "KTV đã nhận nhiệm vụ trên thiết bị di động",
        metadataJson: null,
        createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      },
      {
        id: 4,
        eventType: "SEARCHING_STARTED",
        fromStatus: "ACCEPTED",
        toStatus: "SEARCHING",
        actorUserId: 12,
        note: "KTV đang di chuyển tới toạ độ hiện trường",
        metadataJson: null,
        createdAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
      },
      {
        id: 5,
        eventType: "RECOVERY_SUBMITTED",
        fromStatus: "SEARCHING",
        toStatus: "SUBMITTED",
        actorUserId: 12,
        note: "KTV check-in toạ độ GPS (độ lệch 6.1m), tải 2 ảnh bằng chứng và báo cáo kiện nguyên vẹn",
        metadataJson: null,
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
    ],
    proposals: [],
  },
];

