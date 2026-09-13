import { AUTH_ENDPOINTS, USER_ENDPOINTS } from "../../constants";
import { baseApi } from "../baseAPi";

interface LoginRequest {
  username: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string[];
    permissions: string[];
  };
}

interface RefreshTokenRequest {
  refreshToken: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Email/Password Login
    login: builder.mutation<AuthResponse, { username: string; password: string }>({
      query: (credentials) => ({
        url: AUTH_ENDPOINTS.LOGIN,
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),

    // Phone Login
    phoneLogin: builder.mutation<AuthResponse, { phone: string; otp: string }>({
      query: (credentials) => ({
        url: AUTH_ENDPOINTS.PHONE_LOGIN,
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),

    // Email OTP Send
    sendEmailOtp: builder.mutation<{ success: boolean }, { email: string }>({
      query: (data) => ({
        url: AUTH_ENDPOINTS.EMAIL_SEND_OTP,
        method: "POST",
        body: data,
      }),
    }),

    // Email OTP Verify
    verifyEmailOtp: builder.mutation<AuthResponse, { email: string; otp: string }>({
      query: (credentials) => ({
        url: AUTH_ENDPOINTS.EMAIL_VERIFY_OTP,
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),

    // Complete Registration
    completeRegistration: builder.mutation<AuthResponse, { email?: string; phone?: string; otp: string; userData: any }>({
      query: (data) => ({
        url: AUTH_ENDPOINTS.EMAIL_COMPLETE_REGISTRATION,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),

    // Refresh Token
    refreshToken: builder.mutation<AuthResponse, RefreshTokenRequest>({
      query: (data) => ({
        url: AUTH_ENDPOINTS.REFRESH_TOKEN,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),

    // Logout
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: AUTH_ENDPOINTS.LOGOUT,
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),

    // Get User Profile
    getProfile: builder.query<any, void>({
      query: () => USER_ENDPOINTS.PROFILE,
      providesTags: ["User"],
    }),

    // Update Profile
    updateProfile: builder.mutation<any, Partial<any>>({
      query: (userData) => ({
        url: USER_ENDPOINTS.PROFILE,
        method: "PUT",
        body: userData,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useLoginMutation,
  usePhoneLoginMutation,
  useSendEmailOtpMutation,
  useVerifyEmailOtpMutation,
  useCompleteRegistrationMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
} = authApi;