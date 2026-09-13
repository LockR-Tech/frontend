import { PARTNER_ENDPOINTS } from "../../constants";
import { baseApi } from "../baseAPi";
import type {
  PartnerOrder,
  PartnerDashboardResponse,
  PartnerResponse,
  PartnerRevenueResponse,
  PartnerService,
  StaffAccessCode,
  GenerateAccessCodeRequest,
  AcceptOrderResponse,
  MarkReadyResponse,
  UpdateWeightRequest,
  PartnerLocker,
  PartnerStore,
  LockerBox,
  StaffContact,
  CreateStaffContactRequest,
  UpdatePartnerProfileRequest,
  OrderComplaintResponse,
  OrderRatingResponse,
} from "../../types/partner.type";
import type { OrderStatus } from "../../types/partner.enum";

// ============================================
// Request/Response Types
// ============================================

interface GetOrdersParams {
  status?: OrderStatus | "ALL";
  page?: number;
  size?: number;
  search?: string;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Backend OrderResponse DTO (what the API actually returns)
interface BackendOrderResponse {
  id: number;
  orderCode: string;
  type?: string;
  status: string;
  pinCode?: string;
  serviceCategory?: string;
  pricingType?: string;
  senderId?: number;
  senderName?: string;
  senderPhone?: string;
  receiverId?: number;
  receiverName?: string;
  receiverPhone?: string;
  lockerId?: number;
  lockerName?: string;
  lockerCode?: string;
  sendBoxNumber?: number;
  receiveBoxNumber?: number;
  sendBoxNumbers?: number[];
  receiveBoxNumbers?: number[];
  staffId?: number;
  staffName?: string;
  actualWeight?: number;
  weightUnit?: string;
  extraFee?: number;
  discount?: number;
  reservationFee?: number;
  storagePrice?: number;
  shippingFee?: number;
  totalPrice?: number;
  description?: string;
  customerNote?: string;
  staffNote?: string;
  deliveryAddress?: string;
  isPaid?: boolean;
  isOvertime?: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  returnedAt?: string;
  receiveAt?: string;
  orderDetails?: unknown[];
}

// Backend LockerResponse DTO
interface BackendStoreResponse {
  id: number;
  name: string;
  status: string;
  active?: boolean;
  address: string;
  contactPhone?: string;
  longitude?: number;
  latitude?: number;
  image?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Backend LockerResponse DTO
interface BackendLockerResponse {
  id: number;
  code: string;
  name: string;
  image?: string;
  status: string;
  address: string;
  longitude?: number;
  latitude?: number;
  description?: string;
  storeId: number;
  storeName: string;
  totalBoxes: number;
  availableBoxes: number;
  boxes?: BackendBoxResponse[];
  createdAt: string;
  updatedAt: string;
}

// Backend BoxResponse DTO
interface BackendBoxResponse {
  id: number;
  boxNumber: number;
  isActive: boolean;
  status: string;
  description?: string;
  lockerId: number;
  lockerCode: string;
}

// Backend UserResponse DTO (for staff)
interface BackendUserResponse {
  id: number;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  imageUrl?: string;
  provider?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  joinDate?: string;
  roles?: string[];
}

// ============================================
// Mapper Functions
// ============================================

/** Map backend OrderResponse → frontend PartnerOrder */
function mapOrderResponse(order: BackendOrderResponse): PartnerOrder {
  return {
    id: order.id,
    orderCode: order.orderCode,
    customerId: order.senderId || 0,
    customerName: order.senderName || "",
    customerPhone: order.senderPhone || "",
    status: order.status as PartnerOrder["status"],
    serviceType: (order.serviceCategory ||
      "WASH") as PartnerOrder["serviceType"],
    returnMethod: "LOCKER" as PartnerOrder["returnMethod"],
    lockerId: order.lockerId || 0,
    lockerName: order.lockerName || "",
    boxNumber: order.sendBoxNumber?.toString() || "",
    pinCode: order.pinCode || "",
    createdAt: order.createdAt || "",
    updatedAt: order.updatedAt || "",
    completedAt: order.completedAt,
    returnedAt: order.returnedAt,
    weight: order.actualWeight,
    totalPrice: order.totalPrice,
    assignedStaffId: order.staffId,
    assignedStaffName: order.staffName,
    deliveryAddress: order.deliveryAddress,
    notes: order.customerNote || order.description,
  };
}

/** Map backend LockerResponse → frontend PartnerLocker */
function mapLockerResponse(locker: BackendLockerResponse): PartnerLocker {
  const boxes: LockerBox[] = (locker.boxes || []).map((box) => ({
    id: box.id,
    boxNumber: box.boxNumber,
    isActive: box.isActive,
    status: box.status,
    description: box.description,
    lockerId: box.lockerId,
    lockerCode: box.lockerCode,
  }));

  const occupiedBoxes = boxes.filter((b) => b.status === "OCCUPIED").length;

  return {
    id: locker.id,
    code: locker.code,
    name: locker.name,
    image: locker.image,
    status: locker.status,
    address: locker.address,
    longitude: locker.longitude,
    latitude: locker.latitude,
    description: locker.description,
    storeId: locker.storeId,
    storeName: locker.storeName,
    totalBoxes: locker.totalBoxes || boxes.length,
    availableBoxes: locker.availableBoxes || 0,
    occupiedBoxes: occupiedBoxes,
    boxes,
    createdAt: locker.createdAt,
    updatedAt: locker.updatedAt,
    location: locker.address, // alias for UI
  };
}

/** Map backend UserResponse → frontend StaffContact */
function mapUserToStaffContact(user: BackendUserResponse): StaffContact {
  return {
    id: user.id,
    name:
      user.name ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.email,
    phoneNumber: user.phoneNumber || "",
    email: user.email,
    imageUrl: user.imageUrl,
    roles: user.roles,
    joinDate: user.joinDate,
  };
}

// Backend ServiceResponse DTO (public /api/services)
interface BackendServiceResponse {
  id: number;
  name: string;
  image?: string;
  price?: number;
  maxPrice?: number;
  unit?: string;
  description?: string;
  status: string;
  category: string;
  serviceType?: string;
  isAddon?: boolean;
  isMonthlyPackage?: boolean;
  estimatedHours?: number;
  storeId?: number;
  storeName?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Map backend ServiceResponse → frontend PartnerService */
function mapServiceResponse(service: BackendServiceResponse): PartnerService {
  return {
    id: service.id,
    name: service.name,
    image: service.image,
    price: service.price || 0,
    maxPrice: service.maxPrice,
    unit: service.unit,
    description: service.description || "",
    status: service.status,
    category: service.category,
    serviceType: service.serviceType,
    isAddon: service.isAddon,
    isMonthlyPackage: service.isMonthlyPackage,
    estimatedHours: service.estimatedHours,
    storeId: service.storeId,
    storeName: service.storeName,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    isActive: service.status === "ACTIVE",
  };
}

// ============================================
// Polling Configuration
// ============================================

/** Polling interval: 10 seconds (in milliseconds) */
export const POLLING_INTERVAL = 10_000;

// ============================================
// Partner API Endpoints
// ============================================

export const partnerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============================================
    // Profile Endpoints
    // ============================================

    getPartnerProfile: builder.query<PartnerResponse, void>({
      query: () => PARTNER_ENDPOINTS.PROFILE,
      transformResponse: (response: ApiResponse<PartnerResponse>) =>
        response.data,
      providesTags: ["User"],
    }),

    updatePartnerProfile: builder.mutation<
      PartnerResponse,
      UpdatePartnerProfileRequest
    >({
      query: (data) => ({
        url: PARTNER_ENDPOINTS.PROFILE,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: ApiResponse<PartnerResponse>) =>
        response.data,
      invalidatesTags: ["User"],
    }),

    // ============================================
    // Dashboard Endpoints
    // ============================================

    getPartnerDashboard: builder.query<PartnerDashboardResponse, void>({
      query: () => PARTNER_ENDPOINTS.DASHBOARD,
      transformResponse: (response: ApiResponse<PartnerDashboardResponse>) =>
        response.data,
      providesTags: ["Dashboard"],
    }),

    // ============================================
    // Order Endpoints
    // ============================================

    getPartnerOrders: builder.query<
      PaginatedResponse<PartnerOrder>,
      GetOrdersParams
    >({
      query: ({ status, page = 0, size = 10, search }) => {
        const params = new URLSearchParams();
        if (status && status !== "ALL") params.append("status", status);
        if (page !== undefined) params.append("page", page.toString());
        if (size !== undefined) params.append("size", size.toString());
        if (search) params.append("search", search);
        return `${PARTNER_ENDPOINTS.ORDERS}?${params.toString()}`;
      },
      transformResponse: (
        response: ApiResponse<PaginatedResponse<BackendOrderResponse>>,
      ) => ({
        ...response.data,
        content: response.data.content.map(mapOrderResponse),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.content.map(({ id }) => ({
                type: "PartnerOrder" as const,
                id,
              })),
              { type: "PartnerOrder", id: "LIST" },
              "Orders",
            ]
          : [{ type: "PartnerOrder", id: "LIST" }, "Orders"],
    }),

    getPendingOrders: builder.query<
      PaginatedResponse<PartnerOrder>,
      { page?: number; size?: number } | void
    >({
      query: (params) => {
        const urlParams = new URLSearchParams();
        if (params && params.page !== undefined)
          urlParams.append("page", params.page.toString());
        if (params && params.size !== undefined)
          urlParams.append("size", params.size.toString());
        const qs = urlParams.toString();
        return qs
          ? `${PARTNER_ENDPOINTS.ORDERS_PENDING}?${qs}`
          : PARTNER_ENDPOINTS.ORDERS_PENDING;
      },
      transformResponse: (
        response: ApiResponse<PaginatedResponse<BackendOrderResponse>>,
      ) => ({
        ...response.data,
        content: response.data.content.map(mapOrderResponse),
      }),
      providesTags: ["Orders"],
    }),

    getPartnerOrderById: builder.query<PartnerOrder, number>({
      query: (id) => PARTNER_ENDPOINTS.ORDER_BY_ID(id),
      transformResponse: (response: ApiResponse<BackendOrderResponse>) =>
        mapOrderResponse(response.data),
      providesTags: (_result, _error, id) => [{ type: "Orders", id }],
    }),

    // Accept order → backend returns StaffAccessCodeResponse directly
    acceptOrder: builder.mutation<AcceptOrderResponse, number>({
      query: (orderId) => ({
        url: PARTNER_ENDPOINTS.ORDER_ACCEPT(orderId),
        method: "POST",
      }),
      transformResponse: (
        response: ApiResponse<StaffAccessCode>,
        _meta,
        orderId,
      ) => ({
        orderId,
        status: "COLLECTED" as AcceptOrderResponse["status"],
        staffAccessCode: response.data,
        message: response.message || "Order accepted",
      }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "PartnerOrder", id: orderId },
        { type: "PartnerOrder", id: "LIST" },
        "Orders",
        "Dashboard",
      ],
    }),

    // Update order weight → backend returns OrderResponse
    updateOrderWeight: builder.mutation<PartnerOrder, UpdateWeightRequest>({
      query: ({ orderId, actualWeight, weightUnit, notes }) => ({
        url: PARTNER_ENDPOINTS.ORDER_WEIGHT(orderId),
        method: "PUT",
        body: {
          actualWeight,
          weightUnit: weightUnit || "kg",
          staffNote: notes,
        },
      }),
      transformResponse: (response: ApiResponse<BackendOrderResponse>) =>
        mapOrderResponse(response.data),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "PartnerOrder", id: orderId },
        { type: "PartnerOrder", id: "LIST" },
        { type: "Orders", id: orderId },
        "Orders",
      ],
    }),

    // Force collect order (skip access code / MQTT) → backend returns OrderResponse
    forceCollectOrder: builder.mutation<PartnerOrder, number>({
      query: (orderId) => ({
        url: PARTNER_ENDPOINTS.ORDER_COLLECT(orderId),
        method: "POST",
      }),
      transformResponse: (response: ApiResponse<BackendOrderResponse>) =>
        mapOrderResponse(response.data),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "PartnerOrder", id: orderId },
        { type: "PartnerOrder", id: "LIST" },
        "Orders",
        "Dashboard",
      ],
    }),

    // Start processing order → backend returns OrderResponse
    processOrder: builder.mutation<PartnerOrder, number>({
      query: (orderId) => ({
        url: PARTNER_ENDPOINTS.ORDER_PROCESS(orderId),
        method: "POST",
      }),
      transformResponse: (response: ApiResponse<BackendOrderResponse>) =>
        mapOrderResponse(response.data),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "PartnerOrder", id: orderId },
        { type: "PartnerOrder", id: "LIST" },
        "Orders",
        "Dashboard",
      ],
    }),

    // Mark order ready → backend returns StaffAccessCodeResponse directly
    markOrderReady: builder.mutation<MarkReadyResponse, number>({
      query: (orderId) => ({
        url: PARTNER_ENDPOINTS.ORDER_READY(orderId),
        method: "POST",
      }),
      transformResponse: (
        response: ApiResponse<StaffAccessCode>,
        _meta,
        orderId,
      ) => ({
        orderId,
        status: "READY" as MarkReadyResponse["status"],
        staffAccessCode: response.data,
        message: response.message || "Order ready",
      }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "PartnerOrder", id: orderId },
        { type: "PartnerOrder", id: "LIST" },
        "Orders",
        "Dashboard",
      ],
    }),

    // ============================================
    // Access Code Endpoints
    // ============================================

    generateAccessCode: builder.mutation<
      StaffAccessCode,
      GenerateAccessCodeRequest
    >({
      query: (data) => ({
        url: PARTNER_ENDPOINTS.ACCESS_CODE_GENERATE,
        method: "POST",
        body: data,
      }),
      transformResponse: (response: ApiResponse<StaffAccessCode>) =>
        response.data,
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "PartnerOrder", id: orderId },
        { type: "PartnerOrder", id: "LIST" },
        "Orders",
        "AccessCodes",
      ],
    }),

    getAccessCodesByOrder: builder.query<StaffAccessCode[], number>({
      query: (orderId) => PARTNER_ENDPOINTS.ACCESS_CODES_BY_ORDER(orderId),
      transformResponse: (response: ApiResponse<StaffAccessCode[]>) =>
        response.data,
    }),

    cancelAccessCode: builder.mutation<void, number>({
      query: (codeId) => ({
        url: PARTNER_ENDPOINTS.ACCESS_CODE_CANCEL(codeId),
        method: "POST",
      }),
    }),

    // ============================================
    // Staff Endpoints (backend: UserResponse-based)
    // GET  /api/partner/staff         → List<UserResponse>
    // POST /api/partner/staff/{id}    → UserResponse (add existing user as staff)
    // DELETE /api/partner/staff/{id}  → void (remove staff)
    // ============================================

    getStaffContacts: builder.query<StaffContact[], void>({
      query: () => PARTNER_ENDPOINTS.STAFF,
      transformResponse: (response: ApiResponse<BackendUserResponse[]>) =>
        response.data.map(mapUserToStaffContact),
      providesTags: ["Partner"],
    }),

    addStaffContact: builder.mutation<StaffContact, CreateStaffContactRequest>({
      query: ({ staffId }) => ({
        url: PARTNER_ENDPOINTS.STAFF_BY_ID(staffId),
        method: "POST",
      }),
      transformResponse: (response: ApiResponse<BackendUserResponse>) =>
        mapUserToStaffContact(response.data),
      invalidatesTags: ["Partner"],
    }),

    deleteStaffContact: builder.mutation<void, number>({
      query: (id) => ({
        url: PARTNER_ENDPOINTS.STAFF_BY_ID(id),
        method: "DELETE",
      }),
      invalidatesTags: ["Partner"],
    }),

    // ============================================
    // Store Endpoints
    // ============================================

    getPartnerStores: builder.query<PartnerStore[], void>({
      query: () => PARTNER_ENDPOINTS.STORES,
      transformResponse: (response: ApiResponse<BackendStoreResponse[]>) =>
        response.data.map((s) => ({
          id: s.id,
          name: s.name,
          active: s.active,
          status:
            s.active !== undefined
              ? s.active
                ? "ACTIVE"
                : "INACTIVE"
              : (s.status ?? "ACTIVE"),
          address: s.address,
          contactPhone: s.contactPhone,
          longitude: s.longitude,
          latitude: s.latitude,
          image: s.image,
          description: s.description,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
      providesTags: ["Lockers"],
    }),

    getStoreLockers: builder.query<PartnerLocker[], number>({
      query: (storeId) => PARTNER_ENDPOINTS.STORE_LOCKERS(storeId),
      transformResponse: (response: ApiResponse<BackendLockerResponse | BackendLockerResponse[]>) => {
        const data = Array.isArray(response.data) ? response.data : [response.data];
        return data.map(mapLockerResponse);
      },
      providesTags: ["Lockers"],
    }),

    getLockerBoxes: builder.query<LockerBox[], number>({
      query: (lockerId) => PARTNER_ENDPOINTS.LOCKER_BOXES(lockerId),
      transformResponse: (response: ApiResponse<BackendBoxResponse[]>) =>
        response.data.map((box) => ({
          id: box.id,
          boxNumber: box.boxNumber,
          isActive: box.isActive,
          status: box.status,
          description: box.description,
          lockerId: box.lockerId,
          lockerCode: box.lockerCode,
        })),
    }),

    // ============================================
    // Locker Endpoints
    // ============================================

    getPartnerLockers: builder.query<PartnerLocker[], void>({
      query: () => PARTNER_ENDPOINTS.LOCKERS,
      transformResponse: (response: ApiResponse<BackendLockerResponse[]>) =>
        response.data.map(mapLockerResponse),
      providesTags: ["Lockers"],
    }),

    getAvailableBoxes: builder.query<LockerBox[], number>({
      query: (lockerId) => PARTNER_ENDPOINTS.LOCKER_AVAILABLE_BOXES(lockerId),
      transformResponse: (response: ApiResponse<BackendBoxResponse[]>) =>
        response.data.map((box) => ({
          id: box.id,
          boxNumber: box.boxNumber,
          isActive: box.isActive,
          status: box.status,
          description: box.description,
          lockerId: box.lockerId,
          lockerCode: box.lockerCode,
        })),
    }),

    // ============================================
    // Services Endpoints (public /api/services)
    // Backend has no partner-specific services endpoint.
    // We use the public GET /api/services endpoint.
    // ============================================

    getPartnerServices: builder.query<PartnerService[], void>({
      query: () => "/api/services",
      transformResponse: (response: ApiResponse<BackendServiceResponse[]>) =>
        response.data.map(mapServiceResponse),
      providesTags: ["Services"],
    }),

    // ============================================
    // Revenue Endpoints
    // ============================================

    getPartnerRevenue: builder.query<
      PartnerRevenueResponse,
      { fromDate?: string; toDate?: string }
    >({
      query: ({ fromDate, toDate }) => {
        const params = new URLSearchParams();
        if (fromDate) params.append("fromDate", fromDate);
        if (toDate) params.append("toDate", toDate);
        return `${PARTNER_ENDPOINTS.REVENUE}?${params.toString()}`;
      },
      transformResponse: (response: ApiResponse<PartnerRevenueResponse>) =>
        response.data,
    }),

    // ============================================
    // Order Complaint Endpoints
    // BE: GET /api/orders/{orderId}/complaints
    // ============================================

    getOrderComplaints: builder.query<OrderComplaintResponse[], number>({
      query: (orderId) => PARTNER_ENDPOINTS.ORDER_COMPLAINTS(orderId),
      transformResponse: (response: ApiResponse<OrderComplaintResponse[]>) =>
        response.data ?? [],
      providesTags: (_result, _error, orderId) => [
        { type: "Orders", id: orderId },
      ],
    }),

    getOrderRating: builder.query<OrderRatingResponse | null, number>({
      query: (orderId) => PARTNER_ENDPOINTS.ORDER_RATING(orderId),
      transformResponse: (response: ApiResponse<OrderRatingResponse>) =>
        response.data ?? null,
      providesTags: (_result, _error, orderId) => [
        { type: "Orders", id: orderId },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  // Profile
  useGetPartnerProfileQuery,
  useUpdatePartnerProfileMutation,

  // Dashboard
  useGetPartnerDashboardQuery,

  // Orders
  useGetPartnerOrdersQuery,
  useGetPendingOrdersQuery,
  useGetPartnerOrderByIdQuery,
  useAcceptOrderMutation,
  useForceCollectOrderMutation,
  useUpdateOrderWeightMutation,
  useProcessOrderMutation,
  useMarkOrderReadyMutation,

  // Access Codes
  useGenerateAccessCodeMutation,
  useGetAccessCodesByOrderQuery,
  useCancelAccessCodeMutation,

  // Staff
  useGetStaffContactsQuery,
  useAddStaffContactMutation,
  useDeleteStaffContactMutation,

  // Lockers
  useGetPartnerStoresQuery,
  useGetStoreLockersQuery,
  useGetLockerBoxesQuery,
  useGetPartnerLockersQuery,
  useGetAvailableBoxesQuery,

  // Services
  useGetPartnerServicesQuery,

  // Revenue
  useGetPartnerRevenueQuery,

  // Complaints
  useGetOrderComplaintsQuery,

  // Rating
  useGetOrderRatingQuery,
} = partnerApi;
