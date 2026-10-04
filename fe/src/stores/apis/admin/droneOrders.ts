import { baseApi } from "../../baseAPi";
import type { ApiResponse } from "../../../types";

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
  /** Lần thanh toán thành công gần nhất: phương thức (WALLET, VNPAY, ...). */
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
  sourceLocker: DroneLockerPoint | null;
  destinationLocker: DroneLockerPoint | null;
  /** Mới nhất trước. */
  journeyEvents: DroneJourneyEvent[];
}

const TAG = "DroneOrders" as const;

export const droneOrderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // includeFinished=true (mặc định của backend): cả đơn đã hoàn tất/huỷ để xem lại.
    getDroneOrders: builder.query<ApiResponse<DroneOrderTracking[]>, void>({
      query: () => "/api/admin/drone-orders",
      providesTags: [TAG],
    }),

    getDroneOrder: builder.query<ApiResponse<DroneOrderTracking>, number>({
      query: (orderId) => `/api/admin/drone-orders/${orderId}`,
      providesTags: (_result, _error, orderId) => [{ type: TAG, id: orderId }],
    }),
  }),
});

export const { useGetDroneOrdersQuery, useGetDroneOrderQuery } = droneOrderApi;
