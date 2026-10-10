import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "react-i18next";

import { Button, Input } from "~/components/ui";
import LanguageSwitcher from "~/components/ui/LanguageSwitcher";
import LockerDroneIllustration from "./components/LockerDroneIllustration";
import { AuthApiError, sanitizeRedirectPath } from "~/utils/auth-session";
import {
  ArrowLeft,
  Drone,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  PackageCheck,
  Shield,
  ShieldCheck,
  Wrench,
} from "lucide-react";

// Mã lỗi `code` mà auth-service thực sự trả (AuthService.adminLogin / verifyAdmin2fa)
const AUTH_ERROR_KEYS: Record<string, string> = {
  AUTH_INVALID: "login.errInvalid",
  ADMIN_AUTH_NOT_ADMIN: "login.errNotAdmin",
  ADMIN_AUTH_OTP_INVALID: "login.errOtpInvalid",
  AUTH_TEMP_TOKEN_INVALID: "login.errSessionExpired",
};

export default function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isWaitingFor2FA,
    maskedEmail,
    adminLoginStep1,
    adminLoginStep2,
    cancelAdmin2FA,
  } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState<string>("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const friendlyAuthError = (err: unknown, fallbackKey: string): string => {
    if (err instanceof AuthApiError) {
      if (err.code === "ADMIN_AUTH_OTP_INVALID") {
        // Nhập sai quá số lần → token tạm bị huỷ, đã quay về bước 1
        if (err.tempTokenGone) return t("login.errOtpTooMany");
        const remaining = /còn\s+(\d+)\s+lần/i.exec(err.message)?.[1];
        if (remaining) {
          return t("login.errOtpRemaining", { count: Number(remaining) });
        }
      }
      const key = AUTH_ERROR_KEYS[err.code];
      return key ? t(key) : t(fallbackKey);
    }
    // fetch ném TypeError khi không tới được máy chủ
    if (err instanceof TypeError) return t("login.errNetwork");
    return t(fallbackKey);
  };

  const getRedirectPath = (userRoles: string[]) => {
    // Deep link: ProtectedRoute gửi state.from; phiên hết hạn gửi ?from=
    const stateFrom = location.state?.from as
      | { pathname?: string; search?: string; hash?: string }
      | undefined;
    const from = sanitizeRedirectPath(
      stateFrom?.pathname
        ? `${stateFrom.pathname}${stateFrom.search ?? ""}${stateFrom.hash ?? ""}`
        : new URLSearchParams(location.search).get("from"),
    );
    if (from) return from;

    // Normalize role: strip optional "ROLE_" prefix before comparing
    const isAdmin = userRoles.some((role) => {
      const r = role.toUpperCase().replace(/^ROLE_/, "");
      return r === "SUPER_ADMIN" || r === "ADMIN";
    });
    return isAdmin ? "/admin/dashboard" : "/";
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminLoginStep1(email, password);
    } catch (err) {
      setError(friendlyAuthError(err, "login.errLogin"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminLoginStep2(otpCode);
      setTimeout(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          navigate(getRedirectPath(parsedUser.role || parsedUser.roles || []), {
            replace: true,
          });
        }
      }, 100);
    } catch (err) {
      // Nếu token tạm đã mất, context đã đưa về bước 1 — xoá mã cũ, giữ email/mật khẩu
      if (err instanceof AuthApiError && err.tempTokenGone) setOtpCode("");
      setError(friendlyAuthError(err, "login.errOtp"));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setOtpCode("");
    setError(null);
    cancelAdmin2FA();
  };

  const errorBox = error && (
    <div
      role="alert"
      className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-lg"
    >
      {error}
    </div>
  );

  const renderOtpStep = () => (
    <>
      <div className="space-y-2">
        <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
          <ShieldCheck size={22} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("login.otpTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("login.otpSentTo")}{" "}
          <span className="font-medium text-foreground">{maskedEmail}</span>
        </p>
      </div>

      <form onSubmit={handleVerifyOtp} className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-medium">{t("login.otpLabel")}</span>
          <Input
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            className="h-14 text-center text-2xl font-semibold tracking-[0.6em] rounded-xl"
            maxLength={6}
            required
            autoFocus
          />
        </label>

        {errorBox}

        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={loading}
            onClick={handleBack}
            className="h-11 rounded-xl"
          >
            <ArrowLeft size={16} />
            {t("login.back")}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={loading || otpCode.length < 6}
            className="h-11 rounded-xl"
          >
            {loading && <LoaderCircle size={16} className="animate-spin" />}
            {loading ? t("login.verifying") : t("login.verify")}
          </Button>
        </div>
      </form>
    </>
  );

  const renderCredentialsStep = () => (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("login.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
      </div>

      <form onSubmit={handleCredentials} className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-medium">{t("login.email")}</span>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder={t("login.emailPlaceholder")}
              className="h-11 pl-10 rounded-xl"
              required
              autoFocus
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium">{t("login.password")}</span>
          <div className="relative">
            <LockKeyhole
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 pl-10 pr-11 rounded-xl"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? t("login.hidePassword") : t("login.showPassword")
              }
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {errorBox}

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-11 w-full rounded-xl"
        >
          {loading && <LoaderCircle size={16} className="animate-spin" />}
          {loading ? t("login.submitting") : t("login.submit")}
        </Button>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck size={14} className="mt-px shrink-0 text-sky-600" />
          {t("login.twoFaNote")}
        </p>
      </form>
    </>
  );

  const features = [
    { icon: PackageCheck, label: t("login.featureLockers") },
    { icon: Drone, label: t("login.featureDrones") },
    { icon: Wrench, label: t("login.featureMaintenance") },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-background p-4 sm:p-6">
      <div className="w-full max-w-5xl rounded-3xl shadow-2xl shadow-slate-900/10 overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_1.05fr] bg-card border border-border">
        {/* Sign-in form */}
        <div className="flex flex-col p-8 sm:p-10 md:p-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
              L
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">
                {t("login.brand")}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield size={11} />
                {t("login.portal")}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-7 py-8 w-full md:max-w-sm">
            {isWaitingFor2FA ? renderOtpStep() : renderCredentialsStep()}
          </div>

          <p className="text-xs text-muted-foreground">{t("login.footer")}</p>
        </div>

        {/* Product panel */}
        <div className="relative hidden md:flex flex-col justify-between gap-6 p-10 bg-slate-950 text-slate-100 overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] bg-[size:28px_28px]"
          />
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/20 blur-3xl"
          />

          <div className="relative flex justify-end -mb-4 text-slate-300">
            <LanguageSwitcher />
          </div>

          <div className="relative space-y-3">
            <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight leading-snug">
              {t("login.heroTitle")}
            </h2>
            <p className="text-sm text-slate-400 max-w-sm">
              {t("login.heroSubtitle")}
            </p>
          </div>

          <LockerDroneIllustration className="relative w-full max-w-[300px] mx-auto h-auto" />

          <ul className="relative grid gap-3">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sky-400 shrink-0">
                  <Icon size={16} />
                </span>
                <span className="text-slate-300">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
