import * as React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  CardContent,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from "~/components/ui";
import { LOCKER_IMAGE, LOGIN_IMAGE } from "~/constants/login-page.constants";
import Logo from "~/assets/images/logo/Logo.svg";
import { Mail, Phone, ArrowLeft, User, Shield } from "lucide-react";

type LoginMode = "ADMIN" | "PARTNER";
type PartnerLoginStep = "INPUT" | "OTP";

// Map backend error codes to user-friendly messages
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  E_ADMIN_AUTH_INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  E_ADMIN_AUTH_ACCOUNT_LOCKED: "Tài khoản đã bị khóa.",
  E_ADMIN_AUTH_ACCOUNT_DISABLED: "Tài khoản đã bị vô hiệu hóa.",
  E_PARTNER_AUTH_NOT_FOUND: "Tài khoản partner không tồn tại.",
};

function friendlyAuthError(raw: string): string {
  // Backend may return "AuthenticationException: E_ADMIN_AUTH_INVALID_CREDENTIALS"
  // or just the code directly
  for (const [code, msg] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (raw.includes(code)) return msg;
  }
  return raw;
}

export default function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isWaitingFor2FA,
    maskedEmail,
    isWaitingForOTP,
    partnerContactInfo,
    adminLoginStep1,
    adminLoginStep2,
    cancelAdmin2FA,
    partnerSendOTP,
    partnerVerifyOTP,
    cancelPartnerOTP,
  } = useAuth();
  const { t } = useTranslation();

  const [loginMode, setLoginMode] = React.useState<LoginMode>("ADMIN");
  const [partnerStep, setPartnerStep] =
    React.useState<PartnerLoginStep>("INPUT");

  // Admin form state
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");

  // Partner form state
  const [partnerContact, setPartnerContact] = React.useState<string>("");
  const [partnerContactType, setPartnerContactType] = React.useState<
    "EMAIL" | "PHONE"
  >("EMAIL");
  const [otpCode, setOtpCode] = React.useState<string>("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Get redirect path based on role
  const getRedirectPath = (userRoles: string[]) => {
    const from = location.state?.from?.pathname;
    if (from) return from;

    // Normalize role: strip optional "ROLE_" prefix before comparing
    const normalize = (role: string) =>
      role.toUpperCase().replace(/^ROLE_/, "");

    const isAdmin = userRoles.some((role) => {
      const r = normalize(role);
      return r === "SUPER_ADMIN" || r === "ADMIN";
    });
    const isPartner = userRoles.some((role) => {
      const r = normalize(role);
      return r === "PARTNER" || r === "PARTNER_STAFF";
    });

    if (isAdmin) return "/admin/dashboard";
    if (isPartner) return "/partner/dashboard";
    return "/";
  };

  // ============================================
  // ADMIN LOGIN HANDLERS
  // ============================================

  const handleAdminStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminLoginStep1(email, password);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Đăng nhập thất bại";
      setError(friendlyAuthError(raw));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminLoginStep2(otpCode);
      setTimeout(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          navigate(getRedirectPath(parsedUser.role || parsedUser.roles || []));
        }
      }, 100);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Xác thực OTP thất bại";
      setError(friendlyAuthError(raw));
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PARTNER LOGIN HANDLERS
  // ============================================

  const handlePartnerSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await partnerSendOTP(partnerContact, partnerContactType);
      setPartnerStep("OTP");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Không thể gửi OTP";
      setError(friendlyAuthError(raw));
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await partnerVerifyOTP(partnerContact, otpCode);
      setTimeout(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          navigate(getRedirectPath(parsedUser.role || parsedUser.roles || []));
        }
      }, 100);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Mã OTP không đúng";
      setError(friendlyAuthError(raw));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToInput = () => {
    setPartnerStep("INPUT");
    setOtpCode("");
    setError(null);
    cancelPartnerOTP();
  };

  const handleModeChange = (mode: LoginMode) => {
    setLoginMode(mode);
    setError(null);
    // Reset forms
    setEmail("");
    setPassword("");
    setPartnerContact("");
    setOtpCode("");
    setPartnerStep("INPUT");
    cancelAdmin2FA();
    cancelPartnerOTP();
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderAdminLogin = () => {
    if (isWaitingFor2FA) {
      return (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Xác thực 2FA</h2>
            <p className="text-sm text-muted-foreground">
              Mã OTP đã được gửi đến <strong>{maskedEmail}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Vui lòng kiểm tra email và nhập mã OTP 6 chữ số
            </p>
          </div>

          <form
            onSubmit={handleAdminStep2}
            className="grid gap-4 w-full max-w-md"
          >
            <label className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                Mã OTP
              </span>
              <Input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                type="text"
                placeholder="123456"
                className="mt-2 text-center text-2xl tracking-widest"
                maxLength={6}
                required
                autoFocus
              />
            </label>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={loading}
                onClick={cancelAdmin2FA}
                className="flex-1 rounded-2xl"
              >
                Quay lại
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={loading || otpCode.length < 6}
                className="flex-1 rounded-2xl bg-primary hover:opacity-90"
              >
                {loading ? "Verifying..." : "Xác nhận"}
              </Button>
            </div>
          </form>
        </>
      );
    }

    return (
      <>
        <h2 className="text-2xl font-semibold">{t("signin.title")}</h2>

        <form
          onSubmit={handleAdminStep1}
          className="grid gap-4 w-full max-w-md"
        >
          <label className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Email</span>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="admin@example.com"
              className="mt-2"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {t("label.password")}
            </span>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="mt-2"
              required
            />
          </label>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="rounded-2xl bg-primary hover:opacity-90"
            >
              {loading ? "Signing in..." : "Login"}
            </Button>
            <Link
              to="/auth/forgot"
              className="text-sm text-primary hover:underline"
            >
              {t("link.forgot")}
            </Link>
          </div>
        </form>
      </>
    );
  };

  const renderPartnerLogin = () => {
    if (partnerStep === "OTP") {
      return (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Nhập mã OTP</h2>
            <p className="text-sm text-muted-foreground">
              Mã OTP đã được gửi đến <strong>{partnerContactInfo}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Vui lòng nhập mã OTP 6 chữ số để đăng nhập
            </p>
          </div>

          <form
            onSubmit={handlePartnerVerifyOTP}
            className="grid gap-4 w-full max-w-md"
          >
            <label className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                Mã OTP
              </span>
              <Input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                type="text"
                placeholder="123456"
                className="mt-2 text-center text-2xl tracking-widest"
                maxLength={6}
                required
                autoFocus
              />
            </label>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={loading}
                onClick={handleBackToInput}
                className="flex-1 rounded-2xl"
              >
                <ArrowLeft size={16} className="mr-2" />
                Quay lại
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={loading || otpCode.length < 6}
                className="flex-1 rounded-2xl bg-primary hover:opacity-90"
              >
                {loading ? "Verifying..." : "Đăng nhập"}
              </Button>
            </div>
          </form>
        </>
      );
    }

    return (
      <>
        <h2 className="text-2xl font-semibold">Đăng nhập Partner</h2>
        <p className="text-sm text-muted-foreground">
          Nhập email hoặc số điện thoại để nhận mã OTP
        </p>

        <form
          onSubmit={handlePartnerSendOTP}
          className="grid gap-4 w-full max-w-md"
        >
          {/* Contact Type Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setPartnerContactType("EMAIL")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
                partnerContactType === "EMAIL"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail size={16} />
              Email
            </button>
            <button
              type="button"
              onClick={() => setPartnerContactType("PHONE")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
                partnerContactType === "PHONE"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone size={16} />
              Số điện thoại
            </button>
          </div>

          <label className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {partnerContactType === "EMAIL" ? "Email" : "Số điện thoại"}
            </span>
            <Input
              value={partnerContact}
              onChange={(e) => setPartnerContact(e.target.value)}
              type={partnerContactType === "EMAIL" ? "email" : "tel"}
              placeholder={
                partnerContactType === "EMAIL"
                  ? "partner@example.com"
                  : "0912345678"
              }
              className="mt-2"
              required
            />
          </label>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={loading || !partnerContact}
            className="rounded-2xl bg-primary hover:opacity-90"
          >
            {loading ? "Đang gửi..." : "Gửi mã OTP"}
          </Button>
        </form>
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-brand-600 via-background to-brand-200 relative overflow-hidden w-full">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <g fill="url(#g1)" opacity="0.06">
          <path d="M0 400 C200 300 400 500 600 420 C800 340 1000 480 1200 420 L1200 800 L0 800 Z" />
          <path d="M0 500 C250 420 450 620 700 540 C950 460 1100 640 1200 580 L1200 800 L0 800 Z" />
        </g>
      </svg>

      <div className="relative z-10 w-full max-w-6xl mx-6 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <Card className="bg-card p-8 md:p-12">
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <img src={Logo} alt="Logo" className="h-16 w-auto" />
              <div>
                <div className="text-2xl font-bold">{t("brand.title")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("brand.subtitle")}
                </div>
              </div>
            </div>

            {/* Login Mode Selector */}
            {!isWaitingFor2FA && partnerStep === "INPUT" && (
              <Tabs
                value={loginMode}
                onValueChange={(v) => handleModeChange(v as LoginMode)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="ADMIN"
                    className="flex items-center gap-2"
                  >
                    <Shield size={16} />
                    Admin
                  </TabsTrigger>
                  <TabsTrigger
                    value="PARTNER"
                    className="flex items-center gap-2"
                  >
                    <User size={16} />
                    Partner
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* Login Forms */}
            {loginMode === "ADMIN" ? renderAdminLogin() : renderPartnerLogin()}
          </CardContent>
        </Card>

        <div className="relative flex items-center justify-center p-8 md:p-12 bg-linear-to-br from-primary to-brand-400 text-white">
          <Card className="bg-transparent shadow-none">
            <CardContent className="max-w-sm text-white text-center">
              <div className="mb-6">
                <img
                  src={Logo}
                  alt="Logo"
                  className="h-32 w-auto mx-auto drop-shadow-lg"
                />
              </div>

              <h3 className="text-xl font-semibold mb-2">{t("right.title")}</h3>
              <p className="mb-4 text-sm opacity-90">{t("right.subtitle")}</p>

              <div className="w-full rounded-xl bg-card/10 p-4 backdrop-blur-sm relative">
                <img
                  src={LOGIN_IMAGE}
                  alt="Locker illustration"
                  className="w-full h-auto rounded-4xl opacity-80"
                />
                <img
                  src={LOCKER_IMAGE}
                  alt="locker overlay"
                  className="pointer-events-none absolute -bottom-4 -left-5 w-30 md:w-40 opacity-80 rounded-2xl"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
