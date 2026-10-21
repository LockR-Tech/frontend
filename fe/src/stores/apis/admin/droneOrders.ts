import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types";
import type { MediaUpload } from "../media";

// Hành trình giao hàng bằng drone (order-service, `DroneDeliveryQueryService`).
// Cùng một read model với màn theo dõi của khách và của điều phối viên trên app,
// nên ba bên luôn nhìn cùng một bộ dữ liệu.

export interface DroneLockerPoint {
  lockerId: number;
  code: string | null;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface DroneJourneyEvent {
  id: number;
  fromStage: string | null;
  toStage: string;
  actorUserId: number | null;
  actorName: string | null;
  note: string | null;
  occurredAt: string;
}

export interface DroneOrderTracking {
  pickup?: DronePickupView | null;
  sender?: { name: string | null; phone: string | null; email: string | null } | null;
  receiverEmail?: string | null;
  block?: DroneIncidentLink | null;
  failure?: DroneIncidentLink | null;
  orderId: number;
  orderCode: string;
  userId: number;
  receiverUserId: number | null;
  destinationLockerId: number | null;
  reservedBoxId: number | null;
  reservedBoxNumber: number | null;
  /** Ô drone ở tủ gửi đang giữ cho kiện; null sau khi đã nạp lên drone. */
  sourceBoxId: number | null;
  sourceBoxNumber: number | null;
  type: string;
  /** Trạng thái đơn: AWAITING_DISPATCH | STORING | COMPLETED | CANCELED | EXPIRED. */
  status: string;
  deliveryStage: string | null;
  paymentStatus: string | null;
  parcelWeightGrams: number | null;
  description: string | null;
  totalPrice: number | null;
  /** Phí thu thêm vì đội bay cân kiện nặng hơn khai báo; null khi không lệch hoặc server cũ. */
  weightSurcharge?: number | null;
  /** Phần khách còn phải trả. */
  amountDue?: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  fulfillmentMode: string | null;
  missionId: number | null;
  missionStatus: string | null;
  droneUnitId: number | null;
  droneCode: string | null;
  sourceLockerId: number | null;
  etaMinutes: number | null;
  /** Current drone coordinates; null until telemetry is wired into the shared tracking response. */
  currentLatitude: number | null;
  currentLongitude: number | null;
  assignedByUserId: number | null;
  assignedByName: string | null;
  payloadWeightGrams: number | null;
  sealCode: string | null;
  loadedByUserId: number | null;
  loadedByName: string | null;
  loadingNote: string | null;
  parcelMatched: boolean | null;
  payloadSecured: boolean | null;
  compartmentLocked: boolean | null;
  loadedAt: string | null;
  readyToLaunchAt: string | null;
  launchingAt: string | null;
  missionCreatedAt: string | null;
  missionUpdatedAt: string | null;
  paidAt: string | null;
  /** Lần thanh toán thành công gần nhất: phương thức (WALLET, SEPAY, ...; đơn cũ có thể là VNPAY/MOMO). */
  paymentMethod: string | null;
  /** Mã tham chiếu Lock.R của giao dịch — nội dung chuyển khoản / mã gửi sang cổng. */
  paymentReference: string | null;
  /** Mã giao dịch phía cổng thanh toán/ngân hàng; null với ví Lock.R và tiền mặt. */
  paymentTransactionId: string | null;
  pickupDeadline: string | null;
  completedAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  cancelReason: number | null;
  cancelNote: string | null;
  staffNote?: string | null;
  sourceLocker: DroneLockerPoint | null;
  destinationLocker: DroneLockerPoint | null;
  /** Khai báo kiện lúc đặt đơn; kích thước và giá trị khai báo có thể null. */
  parcelLengthCm?: number | null;
  parcelWidthCm?: number | null;
  parcelHeightCm?: number | null;
  /** DOCUMENT | FOOD | CLOTHING | ELECTRONICS | COSMETICS | OTHER. */
  parcelCategory?: string | null;
  declaredValue?: number | null;
  fragile?: boolean | null;
  /** Khoảng cách đường chim bay tủ gửi → tủ nhận, mét. */
  routeDistanceMeters?: number | null;
  /** Người gửi xác nhận đã bỏ kiện vào ô gửi; null ⇒ đội bay chưa tiếp nhận được. */
  parcelDroppedAt?: string | null;
  /** Đơn đã đóng mà kiện chưa được trả cho người gửi. */
  parcelReturnPending?: boolean | null;
  /** SOURCE_BOX (còn trong ô gửi) | FLIGHT_TEAM (đội bay giữ). */
  parcelHeldAt?: string | null;
  parcelReturnedAt?: string | null;
  parcelReturnNote?: string | null;
  batteryPercentAtLaunch?: number | null;
  landedAt?: string | null;
  depositedAt?: string | null;
  depositedByName?: string | null;
  missionEndedAt?: string | null;
  failedStage?: string | null;
  /** Mới nhất trước. */
  journeyEvents: DroneJourneyEvent[];
}

export interface DroneIncidentLink {
  reason: string;
  reasonLabel: string | null;
  ticketId: number | null;
  note: string | null;
  at: string | null;
  autoCloseAt: string | null;
}

export interface DronePickupView {
  status: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  distanceToSourceLockerMeters: number | null;
  technicianId: number | null;
  technicianName: string | null;
  technicianPhone: string | null;
  technicianDistanceMeters: number | null;
  offeredAt: string | null;
  offerExpiresAt: string | null;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  failureReason: string | null;
  failureNote: string | null;
  technicianNote: string | null;
}

export interface DroneTechnicianCandidate {
  technicianId: number;
  name: string | null;
  phone: string | null;
  onDuty: boolean;
  busy: boolean;
  locationFresh: boolean;
  distanceMeters: number | null;
  locationAt: string | null;
}

export interface DroneCameraMetadata {
  status: "CONNECTING" | "LIVE" | "RECONNECTING" | "OFFLINE" | "UNAVAILABLE" | "ERROR";
  integrationAvailable: boolean;
  streamType?: "HLS" | string;
  streamUrl?: string;
  droneCode: string;
  journeyStatus: string;
  telemetryLive: boolean;
  batteryPercent?: number;
  flightMode?: string;
  latitude?: number;
  longitude?: number;
  observedAt?: string;
}

export interface ReportDroppedParcelPayload {
  reason: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracyM?: number;
  cameraStatus?: string;
  cameraSnapshot?: MediaUpload;
  snapshotCapturedAt?: string;
}

const TAG = "DroneOrders" as const;

export const droneOrderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDronePickupCandidates: builder.query<ApiResponse<DroneTechnicianCandidate[]>, number>({
      query: (id) => `/api/admin/drone-orders/${id}/pickup/candidates`,
      providesTags: [TAG],
    }),
    assignDronePickup: builder.mutation<ApiResponse<DroneOrderTracking>, { orderId: number; technicianId: number }>({
      query: ({ orderId, technicianId }) => ({
        url: `/api/admin/drone-orders/${orderId}/pickup/assign`,
        method: "POST", body: { technicianId },
      }),
      invalidatesTags: [TAG],
    }),
    getDroneOrdersByTicket: builder.query<ApiResponse<DroneOrderTracking[]>, number>({
      query: (id) => `/api/admin/drone-orders/by-ticket/${id}`,
      providesTags: [TAG],
    }),
    // includeFinished=true (mặc định của backend): cả đơn đã hoàn tất/huỷ để xem lại.
    getDroneOrders: builder.query<ApiResponse<DroneOrderTracking[]>, void>({
      query: () => "/api/admin/drone-orders",
      providesTags: [TAG],
    }),

    getDroneOrder: builder.query<ApiResponse<DroneOrderTracking>, number>({
      query: (orderId) => `/api/admin/drone-orders/${orderId}`,
      providesTags: (_result, _error, orderId) => [{ type: TAG, id: orderId }],
    }),

    getDroneCamera: builder.query<ApiResponse<DroneCameraMetadata>, number>({
      query: (orderId) => `/api/admin/drone-orders/${orderId}/camera`,
      providesTags: (_result, _error, orderId) => [{ type: TAG, id: `camera-${orderId}` }],
    }),

    reportDroppedParcel: builder.mutation<
      ApiResponse<unknown>,
      { orderId: number; idempotencyKey: string; payload: ReportDroppedParcelPayload }
    >({
      query: ({ orderId, idempotencyKey, payload }) => ({
        url: `/api/admin/drone-orders/${orderId}/drop-incident`,
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: payload,
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        TAG,
        { type: TAG, id: orderId },
        "DroneIncidents",
      ],
    }),

    // Giao không hoàn tất trước/sau phóng: nhả tài nguyên, tạo yêu cầu hoàn tiền.
    // reason là mã nghiệp vụ; reasonCode chỉ dùng cho client cũ.
    failDroneOrder: builder.mutation<
      ApiResponse<unknown>,
      { orderId: number; reason?: string; reasonCode?: number; note?: string }
    >({
      query: ({ orderId, reason, reasonCode, note }) => ({
        url: `/api/admin/drone-orders/${orderId}/fail`,
        method: "POST",
        body: { ...(reason ? { reason } : { reasonCode }), ...(note ? { note } : {}) },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [TAG, { type: TAG, id: orderId }, "PaymentRefunds"],
    }),

    // Đơn không giao được: xác nhận kiện đã về tay người gửi (nhả ô gửi nếu còn giữ).
    confirmDroneParcelReturn: builder.mutation<
      ApiResponse<DroneOrderTracking>,
      { orderId: number; note?: string }
    >({
      query: ({ orderId, note }) => ({
        url: `/api/admin/drone-orders/${orderId}/parcel-return`,
        method: "POST",
        body: note ? { note } : {},
      }),
      invalidatesTags: (_result, _error, { orderId }) => [TAG, { type: TAG, id: orderId }],
    }),
  }),
});

export const {
  useGetDronePickupCandidatesQuery,
  useAssignDronePickupMutation,
  useGetDroneOrdersByTicketQuery,
  useGetDroneOrdersQuery,
  useGetDroneOrderQuery,
  useGetDroneCameraQuery,
  useReportDroppedParcelMutation,
  useFailDroneOrderMutation,
  useConfirmDroneParcelReturnMutation,
} = droneOrderApi;
