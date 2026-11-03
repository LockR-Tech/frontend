/// Chép đúng tên hằng trong `backend/auth-service/…/settings/AuthSettingsCatalog.java`.
/// Web đọc metadata từ `GET /api/admin/settings/auth`.
export const AuthSettingsKeys = {
  OTP_EXPIRY_SECONDS: "app.auth.otp.expiry-seconds",
  OTP_LENGTH: "app.auth.otp.length",
  TEMP_TOKEN_TTL_SECONDS: "app.auth.temp-token-ttl-seconds",
  ADMIN_2FA_MAX_ATTEMPTS: "app.auth.admin-2fa-max-attempts",
  KIOSK_QR_SESSION_TTL_SECONDS: "app.auth.kiosk-qr.session-ttl-seconds",
  KIOSK_QR_MAX_CONFIRM_ATTEMPTS: "app.auth.kiosk-qr.max-confirm-attempts",
  SPLASH_DURATION_MS: "app.auth.splash-duration-ms",
} as const;

