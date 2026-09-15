import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS, PUBLIC_SETTINGS_ENDPOINTS } from "../../../constants";

// Quy tắc nghiệp vụ (giá, phí, thời hạn, SLA, giới hạn…) cấu hình từ admin — ADR-0005.
// Mỗi backend service sở hữu quy tắc của mình và expose cùng một hợp đồng theo `scope`:
//   GET    /api/admin/settings/{scope}               -> SettingView[]
//   PUT    /api/admin/settings/{scope}  {values}     -> SettingView[] (cả danh sách đã làm mới)
//   DELETE /api/admin/settings/{scope}/{key}         -> SettingView[] (chỉ key vừa khôi phục)
//   GET    /api/admin/settings/{scope}/audits        -> SettingAudit[] (mới nhất trước)
//   GET    /api/settings/{scope}/public (không auth) -> { key: typedValue }
// Service chưa triển khai trả 404 -> UI hiển thị trạng thái "chưa hỗ trợ" theo từng tab.

export const SETTING_SCOPES = [
  "order",
  "locker",
  "payment",
  "iot",
  "auth",
  "loyalty",
  "store",
] as const;

export type SettingScope = (typeof SETTING_SCOPES)[number];

export type SettingType =
  | "INTEGER"
  | "DECIMAL"
  | "BOOLEAN"
  | "STRING"
  | "INTEGER_LIST";

/** Một quy tắc nghiệp vụ. Mọi giá trị đều ở dạng chuỗi (INTEGER_LIST: "2,4,8"). */
export interface SettingView {
  scope: string;
  key: string;
  group: string | null;
  label: string | null;
  description: string | null;
  type: SettingType;
  value: string | null;
  defaultValue: string | null;
  overridden: boolean;
  min: string | null;
  max: string | null;
  unit: string | null;
  allowedValues: string[] | null;
  publicValue: boolean;
  updatedByUserId: number | null;
  /** LocalDateTime UTC, không offset. */
  updatedAt: string | null;
}

export interface SettingAudit {
  id: number;
  key: string;
  oldValue: string | null;
  /** `null` = khôi phục mặc định. */
  newValue: string | null;
  actorUserId: number | null;
  /** LocalDateTime UTC, không offset. */
  changedAt: string;
}

/** Giá trị gửi lên khi lưu: backend nhận số, boolean, chuỗi hoặc mảng. */
export type SettingValueInput = string | number | boolean | number[];

export interface SettingsApiResponse<T> {
  success: boolean;
  code: string | null;
  message: string | null;
  data: T;
  errors?: unknown;
}

export interface UpdateBusinessSettingsArgs {
  scope: SettingScope;
  values: Record<string, SettingValueInput>;
}

export interface ResetBusinessSettingArgs {
  scope: SettingScope;
  key: string;
}

export interface BusinessSettingAuditsArgs {
  scope: SettingScope;
  key?: string;
  limit?: number;
}

const SETTINGS_TAG = "BusinessSettings" as const;
const AUDITS_TAG = "BusinessSettingAudits" as const;

export const businessSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBusinessSettings: builder.query<
      SettingsApiResponse<SettingView[]>,
      SettingScope
    >({
      query: (scope) => ADMIN_ENDPOINTS.SETTINGS_BY_SCOPE(scope),
      providesTags: (_result, _error, scope) => [
        { type: SETTINGS_TAG, id: scope },
      ],
    }),

    updateBusinessSettings: builder.mutation<
      SettingsApiResponse<SettingView[]>,
      UpdateBusinessSettingsArgs
    >({
      query: ({ scope, values }) => ({
        url: ADMIN_ENDPOINTS.SETTINGS_BY_SCOPE(scope),
        method: "PUT",
        body: { values },
      }),
      // Ghi ngay danh sách mới vào cache để form không nháy giá trị cũ trước khi refetch.
      async onQueryStarted({ scope }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (Array.isArray(data?.data)) {
            dispatch(
              businessSettingsApi.util.updateQueryData(
                "getBusinessSettings",
                scope,
                (draft) => {
                  draft.data = data.data;
                },
              ),
            );
          }
        } catch {
          // lỗi được xử lý ở nơi gọi mutation
        }
      },
      invalidatesTags: (result, _error, { scope }) =>
        result
          ? [
              { type: SETTINGS_TAG, id: scope },
              { type: AUDITS_TAG, id: scope },
            ]
          : [],
    }),

    resetBusinessSetting: builder.mutation<
      SettingsApiResponse<SettingView[]>,
      ResetBusinessSettingArgs
    >({
      query: ({ scope, key }) => ({
        url: ADMIN_ENDPOINTS.SETTING_BY_KEY(scope, key),
        method: "DELETE",
      }),
      async onQueryStarted({ scope }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const updated = Array.isArray(data?.data) ? data.data : [];
          if (updated.length === 0) return;
          dispatch(
            businessSettingsApi.util.updateQueryData(
              "getBusinessSettings",
              scope,
              (draft) => {
                if (!Array.isArray(draft.data)) return;
                for (const item of updated) {
                  const index = draft.data.findIndex((s) => s.key === item.key);
                  if (index >= 0) draft.data[index] = item;
                }
              },
            ),
          );
        } catch {
          // lỗi được xử lý ở nơi gọi mutation
        }
      },
      invalidatesTags: (result, _error, { scope }) =>
        result
          ? [
              { type: SETTINGS_TAG, id: scope },
              { type: AUDITS_TAG, id: scope },
            ]
          : [],
    }),

    getBusinessSettingAudits: builder.query<
      SettingsApiResponse<SettingAudit[]>,
      BusinessSettingAuditsArgs
    >({
      query: ({ scope, key, limit = 100 }) => ({
        url: ADMIN_ENDPOINTS.SETTING_AUDITS(scope),
        params: key ? { key, limit } : { limit },
      }),
      providesTags: (_result, _error, { scope }) => [
        { type: AUDITS_TAG, id: scope },
      ],
    }),

    /** Giá trị công khai (đã ép kiểu) cho app khách/kiosk; không cần đăng nhập. */
    getPublicBusinessSettings: builder.query<
      SettingsApiResponse<Record<string, unknown>>,
      SettingScope
    >({
      query: (scope) => PUBLIC_SETTINGS_ENDPOINTS.BY_SCOPE(scope),
      providesTags: (_result, _error, scope) => [
        { type: SETTINGS_TAG, id: scope },
      ],
    }),
  }),
});

export const {
  useGetBusinessSettingsQuery,
  useUpdateBusinessSettingsMutation,
  useResetBusinessSettingMutation,
  useGetBusinessSettingAuditsQuery,
  useGetPublicBusinessSettingsQuery,
} = businessSettingsApi;
