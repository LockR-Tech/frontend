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
import type { MediaUpload } from '../media';

const TAGS = {
  USERS: 'Users',
} as const;

// user-service trả `status` (ACTIVE/INACTIVE…), không có `enabled` — mọi màn đọc `enabled`
// (bảng người dùng, KTV, ô chọn KTV ở Drone/Kiosk) nên suy ra ở một chỗ.
const withEnabled = (user: AdminUserResponse): AdminUserResponse => ({
  ...user,
  enabled: user.status ? user.status === 'ACTIVE' : user.enabled ?? true,
});

// Danh sách có thể là List hoặc Page tuỳ endpoint — giữ nguyên dạng, chỉ chuẩn hoá từng user.
const normalizeUserList = (
  res: ApiResponse<Page<AdminUserResponse>>,
): ApiResponse<Page<AdminUserResponse>> => {
  const data = res?.data as unknown;
  if (Array.isArray(data)) {
    return { ...res, data: data.map(withEnabled) as unknown as Page<AdminUserResponse> };
  }
  const page = data as Page<AdminUserResponse> | undefined;
  if (page && Array.isArray(page.content)) {
    return { ...res, data: { ...page, content: page.content.map(withEnabled) } };
  }
  return res;
};

// Create validators for each request type
const createUserValidator = createValidator(CreateUserRequestSchema);
const updateUserValidator = createValidator(UpdateUserRequestSchema);
const updateUserStatusValidator = createValidator(UpdateUserStatusRequestSchema);
const updateUserRolesValidator = createValidator(UpdateUserRolesRequestSchema);

export const userManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // `role`: user-service lọc theo vai trò (vd LOCKER_TECHNICIAN); page/size bị bỏ qua (trả cả danh sách).
    getAllUsers: builder.query<ApiResponse<Page<AdminUserResponse>>, PageableRequest & { role?: string }>({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.USERS,
        params,
      }),
      transformResponse: normalizeUserList,
      providesTags: [TAGS.USERS],
    }),

    getUserById: builder.query<ApiResponse<AdminUserResponse>, number>({
      query: (id) => ADMIN_ENDPOINTS.USER_BY_ID(id),
      transformResponse: (res: ApiResponse<AdminUserResponse>) =>
        res?.data ? { ...res, data: withEnabled(res.data) } : res,
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

    // Ảnh đại diện (admin đổi hộ): body là MediaUpload (purpose AVATAR), trả về UserSummary
    updateUserAvatar: builder.mutation<
      ApiResponse<Partial<AdminUserResponse>>,
      { id: number; media: MediaUpload }
    >({
      query: ({ id, media }) => ({
        url: ADMIN_ENDPOINTS.USER_AVATAR(id),
        method: 'PUT',
        body: media,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: TAGS.USERS, id }, TAGS.USERS],
    }),

    deleteUserAvatar: builder.mutation<ApiResponse<Partial<AdminUserResponse>>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.USER_AVATAR(id),
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: TAGS.USERS, id }, TAGS.USERS],
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
  useUpdateUserAvatarMutation,
  useDeleteUserAvatarMutation,
} = userManagementApi;
