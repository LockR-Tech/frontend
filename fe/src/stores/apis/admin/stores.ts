import { baseApi } from '../../baseAPi';
import { ADMIN_ENDPOINTS } from '../../../constants';
import type { ApiResponse, PageableRequest } from '../../../types';
import type { MediaUpload } from '../media';

const TAGS = {
  STORES: 'Stores',
} as const;

/** StoreResponse của store-service (đọc `imageUrl ?? image`; createdAt/updatedAt có thể chưa có). */
export interface StoreRecord {
  id: number;
  name: string;
  contactPhone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  active?: boolean | null;
  /** ACTIVE / INACTIVE. */
  status?: string | null;
  distanceKm?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * StoreRequest của store-service — `name` bắt buộc. PUT giữ nguyên trường null/bỏ trống,
 * nên muốn xoá contactPhone/address/description phải gửi chuỗi rỗng.
 */
export interface StoreRequestBody {
  name: string;
  contactPhone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  active?: boolean;
  status?: string;
}

export type StoreStatusValue = 'ACTIVE' | 'INACTIVE';

/** Trạng thái hoạt động thật của cửa hàng (ưu tiên `status`, bản cũ chỉ có `active`). */
export const isStoreActive = (store: Pick<StoreRecord, 'status' | 'active'>) =>
  store.status ? store.status.toUpperCase() === 'ACTIVE' : store.active !== false;

export const storeManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Backend trả List (không phân trang) — page/size bị bỏ qua.
    getAllStores: builder.query<ApiResponse<StoreRecord[]>, PageableRequest>({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.STORES,
        params,
      }),
      providesTags: [TAGS.STORES],
    }),

    getStoreById: builder.query<ApiResponse<StoreRecord>, number>({
      query: (id) => ADMIN_ENDPOINTS.STORE_BY_ID(id),
      providesTags: (result, error, id) => [{ type: TAGS.STORES, id }],
    }),

    createStore: builder.mutation<ApiResponse<StoreRecord>, StoreRequestBody>({
      query: (storeData) => ({
        url: ADMIN_ENDPOINTS.STORES,
        method: 'POST',
        body: storeData,
      }),
      invalidatesTags: [TAGS.STORES],
    }),

    updateStore: builder.mutation<ApiResponse<StoreRecord>, { id: number; data: StoreRequestBody }>({
      query: ({ id, data }) => ({
        url: ADMIN_ENDPOINTS.STORE_BY_ID(id),
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.STORES, id }, TAGS.STORES],
    }),

    // PUT /api/admin/stores/{id}/status — body {status}; backend đặt luôn active = (status == ACTIVE).
    updateStoreStatus: builder.mutation<
      ApiResponse<StoreRecord>,
      { id: number; data: { status: StoreStatusValue } }
    >({
      query: ({ id, data }) => ({
        url: ADMIN_ENDPOINTS.STORE_STATUS(id),
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.STORES, id }, TAGS.STORES],
    }),

    deleteStore: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.STORE_BY_ID(id),
        method: 'DELETE',
      }),
      invalidatesTags: [TAGS.STORES],
    }),

    // Ảnh cửa hàng: body là MediaUpload lấy từ phản hồi Cloudinary (purpose STORE_IMAGE)
    updateStoreImage: builder.mutation<
      ApiResponse<StoreRecord>,
      { id: number; media: MediaUpload }
    >({
      query: ({ id, media }) => ({
        url: ADMIN_ENDPOINTS.STORE_IMAGE(id),
        method: 'PUT',
        body: media,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.STORES, id }, TAGS.STORES],
    }),

    deleteStoreImage: builder.mutation<ApiResponse<StoreRecord>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.STORE_IMAGE(id),
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: TAGS.STORES, id }, TAGS.STORES],
    }),
  }),
});

export const {
  useGetAllStoresQuery,
  useGetStoreByIdQuery,
  useCreateStoreMutation,
  useUpdateStoreMutation,
  useUpdateStoreStatusMutation,
  useDeleteStoreMutation,
  useUpdateStoreImageMutation,
  useDeleteStoreImageMutation,
} = storeManagementApi;
