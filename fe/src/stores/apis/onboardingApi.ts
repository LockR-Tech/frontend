import { baseApi } from "../baseAPi";
import type { ApiResponse } from "../../types";
import type { OnboardingState } from "../../onboarding/engine";

// Trạng thái hướng dẫn lần đầu (F3-G13) — user-service, chỉ của người đang đăng nhập.
const ONBOARDING = "/api/user/onboarding";
const TAG = "Onboarding" as const;

export const onboardingApi = baseApi.enhanceEndpoints({ addTagTypes: [TAG] }).injectEndpoints({
  endpoints: (builder) => ({
    getOnboardingState: builder.query<OnboardingState, void>({
      query: () => ONBOARDING,
      transformResponse: (res: ApiResponse<OnboardingState>) => res.data,
      providesTags: [TAG],
    }),
    setOnboardingAutoShow: builder.mutation<OnboardingState, boolean>({
      query: (autoShow) => ({ url: `${ONBOARDING}/auto-show`, method: "PUT", body: { autoShow } }),
      transformResponse: (res: ApiResponse<OnboardingState>) => res.data,
      invalidatesTags: [TAG],
    }),
    markOnboardingSeen: builder.mutation<OnboardingState, { group: string; version: number }>({
      query: (body) => ({ url: `${ONBOARDING}/seen`, method: "POST", body }),
      transformResponse: (res: ApiResponse<OnboardingState>) => res.data,
      invalidatesTags: [TAG],
    }),
  }),
});

export const {
  useGetOnboardingStateQuery,
  useSetOnboardingAutoShowMutation,
  useMarkOnboardingSeenMutation,
} = onboardingApi;
