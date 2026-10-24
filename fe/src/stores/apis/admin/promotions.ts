import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type { ApiResponse } from "../../../types";
import type { MediaUpload } from "../media";

const TAGS = {
  PROMOTIONS: "Promotions",
} as const;

/** Entity Promotion của order-service (trả thẳng, không qua DTO). */
export interface AdminPromotion {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  /** PERCENTAGE; mọi giá trị khác backend tính như số tiền cố định. */
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  stackable?: boolean | null;
  /** null = áp dụng toàn hệ thống. */
  lockerId?: number | null;
  /** Mã / tên tủ áp dụng — backend tra qua LockerClient; null nếu toàn hệ thống hoặc tra lỗi. */
  lockerCode?: string | null;
  lockerName?: string | null;
  /** null = không giới hạn. */
  totalUsageLimit?: number | null;
  perUserLimit?: number | null;
  /** > 0 = voucher đổi bằng điểm (giá bằng điểm, 1 điểm = 1đ); null = mã thường. */
  pointsCost?: number | null;
  /** Trạng thái lưu trong DB: ACTIVE / INACTIVE. */
  status: string;
  /** LocalDateTime UTC, không offset. */
  startAt?: string | null;
  endAt?: string | null;
  usageCount?: number | null;
  createdByUserId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * PromotionRequest của order-service — PUT ghi đè mọi trường (kể cả lockerId).
 * `lockerId` luôn gửi tường minh: null = toàn hệ thống.
 */
export interface AdminPromotionRequest {
  code: string;
  name: string;
  description?: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  stackable?: boolean;
  status?: "ACTIVE" | "INACTIVE";
  startAt?: string;
  endAt?: string;
  lockerId: number | null;
  totalUsageLimit?: number;
  perUserLimit?: number;
  /** > 0 = chỉ có được bằng cách đổi điểm; bỏ trống = mã thường. */
  pointsCost?: number;
}

/** Dựng lại request đầy đủ từ một khuyến mãi để chỉ đổi vài trường (vd ngưng áp dụng). */
export const promotionToRequest = (
  p: AdminPromotion,
  overrides: Partial<AdminPromotionRequest> = {},
): AdminPromotionRequest => ({
  code: p.code,
  name: p.name,
  description: p.description ?? undefined,
  discountType: p.discountType,
  discountValue: Number(p.discountValue ?? 0),
  maxDiscountAmount: p.maxDiscountAmount ?? undefined,
  minOrderAmount: p.minOrderAmount ?? undefined,
  stackable: p.stackable ?? false,
  status: p.status?.toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  startAt: p.startAt ?? undefined,
  endAt: p.endAt ?? undefined,
  lockerId: p.lockerId ?? null,
  totalUsageLimit: p.totalUsageLimit ?? undefined,
  perUserLimit: p.perUserLimit ?? undefined,
  pointsCost: p.pointsCost ?? undefined,
  ...overrides,
});

export const promotionManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/admin/promotions?code=&status=&lockerId= — List, không phân trang.
    // lockerId=0 = chỉ voucher toàn hệ thống.
    getAllPromotions: builder.query<
      ApiResponse<AdminPromotion[]>,
      { code?: string; status?: string; lockerId?: number } | void
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.PROMOTIONS,
        params: params ? { ...params } : undefined,
      }),
      providesTags: [TAGS.PROMOTIONS],
    }),

    getActivePromotions: builder.query<ApiResponse<AdminPromotion[]>, void>({
      query: () => ADMIN_ENDPOINTS.PROMOTIONS_ACTIVE,
      providesTags: [TAGS.PROMOTIONS],
    }),

    getPromotionsByStatus: builder.query<
      ApiResponse<AdminPromotion[]>,
      string
    >({
      query: (status) => ADMIN_ENDPOINTS.PROMOTIONS_BY_STATUS(status),
      providesTags: [TAGS.PROMOTIONS],
    }),

    searchPromotions: builder.query<
      ApiResponse<AdminPromotion[]>,
      { keyword: string }
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.PROMOTIONS_SEARCH,
        params,
      }),
      providesTags: [TAGS.PROMOTIONS],
    }),

    getPromotionById: builder.query<ApiResponse<AdminPromotion>, number>({
      query: (id) => ADMIN_ENDPOINTS.PROMOTION_BY_ID(id),
      providesTags: (result, error, id) => [{ type: TAGS.PROMOTIONS, id }],
    }),

    validatePromotionCode: builder.query<
      ApiResponse<AdminPromotion>,
      string
    >({
      query: (code) => ADMIN_ENDPOINTS.PROMOTION_VALIDATE(code),
    }),

    createPromotion: builder.mutation<
      ApiResponse<AdminPromotion>,
      AdminPromotionRequest
    >({
      query: (data) => ({
        url: ADMIN_ENDPOINTS.PROMOTIONS,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [TAGS.PROMOTIONS],
    }),

    updatePromotion: builder.mutation<
      ApiResponse<AdminPromotion>,
      { id: number; data: AdminPromotionRequest }
    >({
      query: ({ id, data }) => ({
        url: ADMIN_ENDPOINTS.PROMOTION_BY_ID(id),
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: TAGS.PROMOTIONS, id },
        TAGS.PROMOTIONS,
      ],
    }),

    // Mã đã có lượt dùng/đã lưu ví → 400 PROMOTION_HAS_HISTORY, phải chuyển INACTIVE.
    deletePromotion: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.PROMOTION_BY_ID(id),
        method: "DELETE",
      }),
      invalidatesTags: [TAGS.PROMOTIONS],
    }),

    // Ảnh khuyến mãi: body là MediaUpload (purpose PROMOTION_IMAGE), trả về Promotion
    updatePromotionImage: builder.mutation<
      ApiResponse<AdminPromotion>,
      { id: number; media: MediaUpload }
    >({
      query: ({ id, media }) => ({
        url: ADMIN_ENDPOINTS.PROMOTION_IMAGE(id),
        method: "PUT",
        body: media,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: TAGS.PROMOTIONS, id },
        TAGS.PROMOTIONS,
      ],
    }),

    deletePromotionImage: builder.mutation<ApiResponse<AdminPromotion>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.PROMOTION_IMAGE(id),
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: TAGS.PROMOTIONS, id },
        TAGS.PROMOTIONS,
      ],
    }),
  }),
});

export const {
  useGetAllPromotionsQuery,
  useGetActivePromotionsQuery,
  useGetPromotionsByStatusQuery,
  useSearchPromotionsQuery,
  useGetPromotionByIdQuery,
  useValidatePromotionCodeQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useDeletePromotionMutation,
  useUpdatePromotionImageMutation,
  useDeletePromotionImageMutation,
} = promotionManagementApi;
