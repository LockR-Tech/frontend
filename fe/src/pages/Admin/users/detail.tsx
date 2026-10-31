import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Cake,
  Coins,
  FileCheck2,
  KeyRound,
  LogIn,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Save,
  ShieldCheck,
  Wallet,
  Wrench,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Input } from "~/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { useUserDetail } from "./hooks/useUserDetail";
import {
  useDeleteUserAvatarMutation,
  useGetUserLoyaltySummaryQuery,
  useGetUserWalletQuery,
  useUpdateUserAvatarMutation,
  useUpdateUserMutation,
} from "~/stores/apis/admin";
import { UserActivityTabs } from "./components/UserActivityTabs";
import { WalletModal } from "./components/WalletModal";
import { ImageUploadButton } from "~/components/shared/media";
import { ReportStatCard } from "~/components/shared/reporting";
import { getRoleLabel } from "~/constants";
import { getMediaErrorMessage, pickImageUrl } from "~/lib/media";
import { formatDate, formatDateTime } from "~/lib/datetime";
import { formatCurrency, formatDayLabel, formatNumber } from "~/lib/report-format";
import { toReportError } from "~/lib/report-error";
import { apiGet } from "~/utils/api";
import type { MediaUpload } from "~/stores/apis/media";

const getRoleBadge = (role: string) => {
  return (
    <Badge
      variant="outline"
      className="bg-secondary text-foreground border-border font-medium text-xs px-2.5 py-0.5 rounded-md"
    >
      {getRoleLabel(role)}
    </Badge>
  );
};

/** user-service ghép fullName = firstName + " " + lastName → tách ở khoảng trắng đầu tiên. */
const splitFullName = (fullName: string) => {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const idx = trimmed.indexOf(" ");
  return idx < 0
    ? { firstName: trimmed, lastName: "" }
    : { firstName: trimmed.slice(0, idx), lastName: trimmed.slice(idx + 1) };
};

const TECHNICIAN_ROLES = ["DRONE_TECHNICIAN", "LOCKER_TECHNICIAN"];

function AccountRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}

export default function UserDetailPage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, isLoading, revenue } = useUserDetail(userId);
  const revenueError = toReportError(revenue.error);
  const numUserId = userId ? Number(userId) : 0;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [updateUser] = useUpdateUserMutation();
  const wallet = useGetUserWalletQuery(numUserId, { skip: !numUserId });
  const loyalty = useGetUserLoyaltySummaryQuery(numUserId, { skip: !numUserId });
  // Ảnh đại diện cập nhật tại chỗ sau PUT/DELETE …/avatar (không reload để giữ dữ liệu form)
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);
  const [showRemoveAvatar, setShowRemoveAvatar] = useState(false);
  const [updateUserAvatar] = useUpdateUserAvatarMutation();
  const [deleteUserAvatar, { isLoading: isRemovingAvatar }] = useDeleteUserAvatarMutation();

  const avatarUrl =
    avatarOverride !== undefined ? avatarOverride || undefined : pickImageUrl(user);

  const handleAvatarUploaded = async (media: MediaUpload) => {
    const res = await updateUserAvatar({ id: numUserId, media }).unwrap();
    let url = pickImageUrl(res?.data);
    if (!url) {
      // UserSummary có thể không kèm URL ảnh ⇒ đọc lại chi tiết người dùng
      const fresh = await apiGet<{ data: unknown }>(`/api/admin/users/${numUserId}`);
      url = pickImageUrl(fresh?.data);
    }
    setAvatarOverride(url ?? null);
    toast.success(t("admin.users.detail.avatarUpdated"));
  };

  const handleRemoveAvatar = async () => {
    try {
      await deleteUserAvatar(numUserId).unwrap();
      setAvatarOverride(null);
      toast.success(t("admin.users.detail.avatarRemoved"));
    } catch (err) {
      toast.error(t("admin.users.detail.avatarRemoveFailed"), { description: getMediaErrorMessage(err) });
    } finally {
      setShowRemoveAvatar(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
      });
      setIsDirty(false);
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.name.trim()) {
      setShowConfirm(false);
      toast.error(t("admin.users.detail.nameRequired"));
      return;
    }
    setShowConfirm(false);
    setIsSaving(true);
    try {
      // PUT /api/admin/users/{id} nhận UserProfileRequest: trường null được giữ nguyên,
      // riêng `status` thiếu thì bị đặt lại ACTIVE → luôn gửi trạng thái hiện tại.
      const body: Record<string, string> = { status: user.status ?? "ACTIVE" };
      if (formData.name.trim() !== (user.name || "").trim()) {
        Object.assign(body, splitFullName(formData.name));
      }
      if (formData.email.trim() !== (user.email || "")) body.email = formData.email.trim();
      if (formData.phoneNumber.trim() !== (user.phoneNumber || "")) {
        body.phoneNumber = formData.phoneNumber.trim();
      }
      await updateUser({ id: Number(userId), data: body }).unwrap();
      toast.success(t("admin.users.updateSuccess"));
      setIsDirty(false);
      navigate("/admin/users");
    } catch (error) {
      const e = error as { data?: { message?: unknown }; message?: unknown } | undefined;
      const detail =
        typeof e?.data?.message === "string" && e.data.message.trim()
          ? e.data.message
          : typeof e?.message === "string"
            ? e.message
            : undefined;
      toast.error(t("admin.users.updateFailed"), {
        description: detail,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
      });
      setIsDirty(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
        <h3 className="mt-4 text-lg font-medium">{t("admin.users.detail.notFound")}</h3>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("button.back")}
        </Button>
      </div>
    );
  }

  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("admin.users.detail.title")}</h1>
            <p className="text-sm text-muted-foreground">ID: {user?.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="gap-2"
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
                {t("button.cancel")}
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? t("common.saving") : t("common.saveChanges")}
              </Button>
            </>
          )}
          {!isDirty && user.roles.some((role) => TECHNICIAN_ROLES.includes(role)) && (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to={`/admin/technicians/${user.id}`}>
                <Wrench className="h-4 w-4" />
                {t("admin.users.detail.technicianProfile")}
              </Link>
            </Button>
          )}
          {!isDirty && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowWallet(true)}>
              <Wallet className="h-4 w-4" />
              {t("admin.users.table.wallet")}
            </Button>
          )}
          {!isDirty && user && (
            <Badge
              variant="outline"
              className={
                user.enabled
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-secondary text-muted-foreground border-border"
              }
            >
              {user.enabled ? t("admin.users.detail.enabled") : t("admin.users.detail.locked")}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-2 space-y-6">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("admin.users.detail.personalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <Avatar className="h-24 w-24 border-2 border-border shadow-xs">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={t("admin.users.detail.avatarAlt", { name: formData.name })} />}
                    <AvatarFallback className="bg-secondary text-foreground text-lg font-bold border border-border">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-stretch gap-1 w-28">
                    <ImageUploadButton
                      purpose="AVATAR"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      errorTitle={t("admin.users.detail.avatarChangeFailed")}
                      onUploaded={handleAvatarUploaded}
                    >
                      {t("common.changePhoto")}
                    </ImageUploadButton>
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                        onClick={() => setShowRemoveAvatar(true)}
                        disabled={isRemovingAvatar}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("common.removePhoto")}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                      {t("admin.users.detail.nameLabel")}
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className="text-lg font-bold"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {user.roles.map((role) => (
                      <span key={role}>{getRoleBadge(role)}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email
                  </label>
                  <Input
                    value={formData.email}
                    onChange={(e) =>
                      handleInputChange("email", e.target.value)
                    }
                    type="email"
                    className="font-medium"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("admin.users.detail.provider")}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.provider ?? "—"}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    <Phone className="inline h-4 w-4 mr-1" />
                    {t("common.phone")}
                  </label>
                  <Input
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    type="tel"
                    placeholder={t("admin.users.detail.phonePlaceholder")}
                    className="font-medium"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    <Cake className="inline h-4 w-4 mr-1" />
                    {t("admin.users.detail.birthday")}
                  </p>
                  <p className="font-medium text-sm">
                    {user.birthday ? formatDate(user.birthday) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t("admin.users.detail.emailVerified")}
                  </p>
                  <p className="font-medium">
                    {user.emailVerified == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : user.emailVerified ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">{t("admin.users.detail.verified")}</span>
                    ) : (
                      <span className="text-muted-foreground">{t("admin.users.detail.notVerified")}</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("admin.users.detail.accountInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AccountRow icon={ShieldCheck} label={t("common.status")}>
                {user.enabled ? t("admin.users.status.active") : t("admin.users.detail.locked")}
              </AccountRow>
              <AccountRow icon={User} label={t("admin.users.detail.userId")}>
                <span className="font-mono">{user.id}</span>
              </AccountRow>
              <AccountRow icon={KeyRound} label={t("admin.users.detail.password")}>
                {user.hasPassword == null
                  ? "—"
                  : t(user.hasPassword ? "admin.users.detail.passwordSet" : "admin.users.detail.passwordNotSet")}
              </AccountRow>
              <AccountRow icon={LogIn} label={t("admin.users.detail.lastLogin")}>
                {formatDateTime(user.lastLoginAt)}
              </AccountRow>
              <AccountRow icon={Calendar} label={t("common.createdAt")}>
                {formatDateTime(user.createdAt)}
              </AccountRow>
              <AccountRow icon={Calendar} label={t("admin.users.detail.lastUpdated")}>
                {formatDateTime(user.updatedAt)}
              </AccountRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck2 className="h-4 w-4" />
                {t("admin.users.detail.termsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge
                variant="outline"
                className={
                  user.termsAccepted
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }
              >
                {t(user.termsAccepted ? "admin.users.detail.termsAccepted" : "admin.users.detail.termsNotAccepted")}
              </Badge>
              {user.termsAccepted ? (
                <>
                  <AccountRow icon={Calendar} label={t("admin.users.detail.termsAcceptedAt")}>
                    {formatDateTime(user.termsAcceptedAt)}
                  </AccountRow>
                  <AccountRow icon={FileCheck2} label={t("admin.users.detail.termsVersion")}>
                    {user.termsVersion ?? "—"}
                  </AccountRow>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("admin.users.detail.termsNotAcceptedHint")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Số đơn/chi tiêu lấy từ /api/admin/revenue/customers/{userId}, 12 tháng gần nhất */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <ReportStatCard
          label={t("admin.users.detail.orders")}
          value={revenueError ? "—" : formatNumber(revenue.data?.orderCount)}
          hint={t("admin.users.detail.ordersRange", {
            from: formatDayLabel(revenue.range.from),
            to: formatDayLabel(revenue.range.to),
          })}
          icon={ShoppingBag}
          isLoading={revenue.isLoading}
        />
        <ReportStatCard
          label={t("admin.users.detail.totalSpent")}
          value={revenueError ? "—" : formatCurrency(revenue.data?.totalSpent)}
          hint={t("admin.users.detail.totalSpentHint")}
          icon={DollarSign}
          isLoading={revenue.isLoading}
        />
        <ReportStatCard
          label={t("admin.users.detail.walletBalance")}
          value={wallet.isError ? "—" : formatCurrency(wallet.data?.data?.balance)}
          hint={t("admin.users.detail.walletBalanceHint")}
          icon={Wallet}
          isLoading={wallet.isLoading}
        />
        <ReportStatCard
          label={t("admin.users.detail.loyaltyPoints")}
          value={loyalty.isError ? "—" : formatNumber(loyalty.data?.data?.points)}
          hint={t("admin.users.detail.loyaltyPointsHint")}
          icon={Coins}
          isLoading={loyalty.isLoading}
        />
        {revenueError && (
          <p className="col-span-full text-xs text-destructive">
            {t("admin.users.detail.revenueLoadFailed", { message: revenueError.message })}
          </p>
        )}
      </div>

      <UserActivityTabs userId={numUserId} />

      <WalletModal
        open={showWallet}
        onClose={() => setShowWallet(false)}
        userId={numUserId}
        userName={user.name || user.email}
      />

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.detail.confirmSaveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.users.detail.confirmSaveDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="action-buttons flex gap-3">
            <AlertDialogCancel>{t("button.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              {isSaving ? t("common.saving") : t("admin.users.detail.confirmSave")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Remove Avatar Dialog */}
      <AlertDialog open={showRemoveAvatar} onOpenChange={setShowRemoveAvatar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.detail.removeAvatarTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.users.detail.removeAvatarDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isRemovingAvatar}>{t("button.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRemoveAvatar();
              }}
              disabled={isRemovingAvatar}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isRemovingAvatar ? t("admin.users.detail.removing") : t("common.removePhoto")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
