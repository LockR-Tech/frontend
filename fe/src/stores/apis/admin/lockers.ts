import { baseApi } from '../../baseAPi';
import { ADMIN_ENDPOINTS } from '../../../constants';
import type {
  ApiResponse,
  Page,
  PageableRequest,
  AdminLockerResponse,
  CreateLockerRequest,
  CreateBoxRequest,
  UpdateLockerMaintenanceRequest,
  UpdateBoxStatusRequest,
} from '../../../types';
import {
  CreateLockerRequestSchema,
  CreateBoxRequestSchema,
  UpdateLockerMaintenanceRequestSchema,
  UpdateBoxStatusRequestSchema,
  createValidator,
} from '../../../schemas';

const TAGS = {
  LOCKERS: 'Lockers',
} as const;

// Create validators
const createLockerValidator = createValidator(CreateLockerRequestSchema);
const createBoxValidator = createValidator(CreateBoxRequestSchema);
const updateLockerMaintenanceValidator = createValidator(UpdateLockerMaintenanceRequestSchema);
const updateBoxStatusValidator = createValidator(UpdateBoxStatusRequestSchema);

export const lockerManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllLockers: builder.query<ApiResponse<Page<AdminLockerResponse>>, PageableRequest>({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.LOCKERS,
        params,
      }),
      providesTags: [TAGS.LOCKERS],
    }),

    getLockersByStore: builder.query<ApiResponse<AdminLockerResponse[]>, number>({
      query: (storeId) => ADMIN_ENDPOINTS.LOCKERS_BY_STORE(storeId),
      providesTags: [TAGS.LOCKERS],
    }),

    getLockerById: builder.query<ApiResponse<AdminLockerResponse>, number>({
      query: (id) => ADMIN_ENDPOINTS.LOCKER_BY_ID(id),
      providesTags: (result, error, id) => [{ type: TAGS.LOCKERS, id }],
    }),

    createLocker: builder.mutation<ApiResponse<AdminLockerResponse>, CreateLockerRequest>({
      query: (lockerData) => {
        // Validate with Zod before sending
        createLockerValidator.validateRequestBody(lockerData);
        return {
          url: ADMIN_ENDPOINTS.LOCKERS,
          method: 'POST',
          body: lockerData,
        };
      },
      invalidatesTags: [TAGS.LOCKERS],
    }),

    updateLocker: builder.mutation<
      ApiResponse<AdminLockerResponse>,
      { id: number; data: CreateLockerRequest }
    >({
      query: ({ id, data }) => {
        // Validate with Zod before sending
        createLockerValidator.validateRequestBody(data);
        return {
          url: ADMIN_ENDPOINTS.LOCKER_BY_ID(id),
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.LOCKERS, id }, TAGS.LOCKERS],
    }),

    setLockerMaintenance: builder.mutation<
      ApiResponse<AdminLockerResponse>,
      { id: number; data: UpdateLockerMaintenanceRequest }
    >({
      query: ({ id, data }) => {
        // Validate with Zod before sending
        updateLockerMaintenanceValidator.validateRequestBody(data);
        return {
          url: ADMIN_ENDPOINTS.LOCKER_MAINTENANCE(id),
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.LOCKERS, id }, TAGS.LOCKERS],
    }),

    addBoxToLocker: builder.mutation<
      ApiResponse<AdminLockerResponse>,
      { id: number; data: CreateBoxRequest }
    >({
      query: ({ id, data }) => {
        // Validate with Zod before sending
        createBoxValidator.validateRequestBody(data);
        return {
          url: ADMIN_ENDPOINTS.LOCKER_BOXES(id),
          method: 'POST',
          body: data,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.LOCKERS, id }, TAGS.LOCKERS],
    }),

    updateBoxStatus: builder.mutation<
      ApiResponse<void>,
      { boxId: number; data: UpdateBoxStatusRequest }
    >({
      query: ({ boxId, data }) => {
        // Validate with Zod before sending
        updateBoxStatusValidator.validateRequestBody(data);
        return {
          url: ADMIN_ENDPOINTS.BOX_STATUS(boxId),
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: [TAGS.LOCKERS],
    }),

    deleteLocker: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.LOCKER_BY_ID(id),
        method: 'DELETE',
      }),
      invalidatesTags: [TAGS.LOCKERS],
    }),
  }),
});

export const {
  useGetAllLockersQuery,
  useGetLockersByStoreQuery,
  useGetLockerByIdQuery,
  useCreateLockerMutation,
  useUpdateLockerMutation,
  useSetLockerMaintenanceMutation,
  useAddBoxToLockerMutation,
  useUpdateBoxStatusMutation,
  useDeleteLockerMutation,
} = lockerManagementApi;
