import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type {
  ApiResponse,
  Page,
  PageableRequest,
  PromotionResponse,
  PromotionRequest,
} from "../../../types";
import type { MediaUpload } from "../media";

const TAGS = {
  PROMOTIONS: "Promotions",
} as const;

export const promotionManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllPromotions: builder.query<
      ApiResponse<Page<PromotionResponse>>,
      PageableRequest
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.PROMOTIONS,
        params,
      }),
      providesTags: [TAGS.PROMOTIONS],
    }),

    getActivePromotions: builder.query<ApiResponse<PromotionResponse[]>, void>({
      query: () => ADMIN_ENDPOINTS.PROMOTIONS_ACTIVE,
      providesTags: [TAGS.PROMOTIONS],
    }),

    getPromotionsByStatus: builder.query<
      ApiResponse<PromotionResponse[]>,
      string
    >({
      query: (status) => ADMIN_ENDPOINTS.PROMOTIONS_BY_STATUS(status),
      providesTags: [TAGS.PROMOTIONS],
    }),

    searchPromotions: builder.query<
      ApiResponse<PromotionResponse[]>,
      { keyword: string }
    >({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.PROMOTIONS_SEARCH,
        params,
      }),
      providesTags: [TAGS.PROMOTIONS],
    }),

    getPromotionById: builder.query<ApiResponse<PromotionResponse>, number>({
      query: (id) => ADMIN_ENDPOINTS.PROMOTION_BY_ID(id),
      providesTags: (result, error, id) => [{ type: TAGS.PROMOTIONS, id }],
    }),

    validatePromotionCode: builder.query<
      ApiResponse<PromotionResponse>,
      string
    >({
      query: (code) => ADMIN_ENDPOINTS.PROMOTION_VALIDATE(code),
    }),

    createPromotion: builder.mutation<
      ApiResponse<PromotionResponse>,
      PromotionRequest
    >({
      query: (data) => ({
        url: ADMIN_ENDPOINTS.PROMOTIONS,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [TAGS.PROMOTIONS],
    }),

    updatePromotion: builder.mutation<
      ApiResponse<PromotionResponse>,
      { id: number; data: PromotionRequest }
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

    deletePromotion: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.PROMOTION_BY_ID(id),
        method: "DELETE",
      }),
      invalidatesTags: [TAGS.PROMOTIONS],
    }),

    // Ảnh khuyến mãi: body là MediaUpload (purpose PROMOTION_IMAGE), trả về Promotion
    updatePromotionImage: builder.mutation<
      ApiResponse<PromotionResponse>,
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

    deletePromotionImage: builder.mutation<ApiResponse<PromotionResponse>, number>({
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
