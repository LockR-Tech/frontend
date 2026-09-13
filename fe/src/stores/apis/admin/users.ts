import { baseApi } from '../../baseAPi';
import { ADMIN_ENDPOINTS } from '../../../constants';
import type {
  ApiResponse,
  Page,
  PageableRequest,
  AdminUserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  UpdateUserRolesRequest,
} from '../../../types';
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UpdateUserStatusRequestSchema,
  UpdateUserRolesRequestSchema,
  createValidator,
} from '../../../schemas';

const TAGS = {
  USERS: 'Users',
} as const;

// Create validators for each request type
const createUserValidator = createValidator(CreateUserRequestSchema);
const updateUserValidator = createValidator(UpdateUserRequestSchema);
const updateUserStatusValidator = createValidator(UpdateUserStatusRequestSchema);
const updateUserRolesValidator = createValidator(UpdateUserRolesRequestSchema);

export const userManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query<ApiResponse<Page<AdminUserResponse>>, PageableRequest>({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.USERS,
        params,
      }),
      providesTags: [TAGS.USERS],
    }),

    getUserById: builder.query<ApiResponse<AdminUserResponse>, number>({
      query: (id) => ADMIN_ENDPOINTS.USER_BY_ID(id),
      providesTags: (result, error, id) => [{ type: TAGS.USERS, id }],
    }),

    createUser: builder.mutation<ApiResponse<AdminUserResponse>, CreateUserRequest>({
      query: (userData) => {
        // Validate with Zod before sending
        createUserValidator.validateRequestBody(userData);
        return {
          url: ADMIN_ENDPOINTS.USERS,
          method: 'POST',
          body: userData,
        };
      },
      invalidatesTags: [TAGS.USERS],
    }),

    updateUser: builder.mutation<
      ApiResponse<AdminUserResponse>,
      { id: number; data: UpdateUserRequest }
    >({
      query: ({ id, data }) => {
        // Validate with Zod before sending
        updateUserValidator.validateRequestBody(data);
        return {
          url: ADMIN_ENDPOINTS.USER_BY_ID(id),
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.USERS, id }, TAGS.USERS],
    }),

    updateUserStatus: builder.mutation<
      ApiResponse<AdminUserResponse>,
      { id: number; data: UpdateUserStatusRequest }
    >({
      query: ({ id, data }) => {
        // Validate with Zod before sending
        updateUserStatusValidator.validateRequestBody(data);
        return {
          url: ADMIN_ENDPOINTS.USER_STATUS(id),
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.USERS, id }, TAGS.USERS],
    }),

    updateUserRoles: builder.mutation<
      ApiResponse<AdminUserResponse>,
      { id: number; data: UpdateUserRolesRequest }
    >({
      query: ({ id, data }) => {
        // Validate with Zod before sending
        updateUserRolesValidator.validateRequestBody(data);
        return {
          url: ADMIN_ENDPOINTS.USER_ROLES(id),
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.USERS, id }, TAGS.USERS],
    }),

    deleteUser: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.USER_BY_ID(id),
        method: 'DELETE',
      }),
      invalidatesTags: [TAGS.USERS],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
  useUpdateUserRolesMutation,
  useDeleteUserMutation,
} = userManagementApi;
