import { baseApi } from '../../baseAPi';
import { ADMIN_ENDPOINTS } from '../../../constants';
import type {
  ApiResponse,
  Page,
  PageableRequest,
  AdminStoreResponse,
  CreateStoreRequest,
  UpdateUserStatusRequest,
} from '../../../types';
import {
  CreateStoreRequestSchema,
  UpdateStoreStatusRequestSchema,
  createValidator,
} from '../../../schemas';

const TAGS = {
  STORES: 'Stores',
} as const;

// Create validators
const createStoreValidator = createValidator(CreateStoreRequestSchema);
const updateStoreStatusValidator = createValidator(UpdateStoreStatusRequestSchema);

export const storeManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllStores: builder.query<ApiResponse<Page<AdminStoreResponse>>, PageableRequest>({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.STORES,
        params,
      }),
      providesTags: [TAGS.STORES],
    }),

    getStoreById: builder.query<ApiResponse<AdminStoreResponse>, number>({
      query: (id) => ADMIN_ENDPOINTS.STORE_BY_ID(id),
      providesTags: (result, error, id) => [{ type: TAGS.STORES, id }],
    }),

    createStore: builder.mutation<ApiResponse<AdminStoreResponse>, CreateStoreRequest>({
      query: (storeData) => {
        // Validate with Zod before sending
        createStoreValidator.validateRequestBody(storeData);
        return {
          url: ADMIN_ENDPOINTS.STORES,
          method: 'POST',
          body: storeData,
        };
      },
      invalidatesTags: [TAGS.STORES],
    }),

    updateStore: builder.mutation<
      ApiResponse<AdminStoreResponse>,
      { id: number; data: CreateStoreRequest }
    >({
      query: ({ id, data }) => {
        // Validate with Zod before sending
        createStoreValidator.validateRequestBody(data);
        return {
          url: ADMIN_ENDPOINTS.STORE_BY_ID(id),
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.STORES, id }, TAGS.STORES],
    }),

    updateStoreStatus: builder.mutation<
      ApiResponse<AdminStoreResponse>,
      { id: number; data: UpdateUserStatusRequest }
    >({
      query: ({ id, data }) => {
        // Validate with Zod before sending
        updateStoreStatusValidator.validateRequestBody(data);
        return {
          url: ADMIN_ENDPOINTS.STORE_STATUS(id),
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.STORES, id }, TAGS.STORES],
    }),

    deleteStore: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.STORE_BY_ID(id),
        method: 'DELETE',
      }),
      invalidatesTags: [TAGS.STORES],
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
} = storeManagementApi;
