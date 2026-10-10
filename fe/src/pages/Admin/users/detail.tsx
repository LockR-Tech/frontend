import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Save,
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
  useUpdateUserAvatarMutation,
  useUpdateUserMutation,
} from "~/stores/apis/admin";
import { UserLoyaltySection } from "./components/UserLoyaltySection";
import { ImageUploadButton } from "~/components/shared/media";
import { getRoleLabel } from "~/constants";
import { getMediaErrorMessage, pickImageUrl } from "~/lib/media";
import { formatDateTime } from "~/lib/datetime";
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
  const [updateUser] = useUpdateUserMutation();
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
    toast.success("Đã cập nhật ảnh đại diện");
  };

  const handleRemoveAvatar = async () => {
    try {
      await deleteUserAvatar(numUserId).unwrap();
      setAvatarOverride(null);
      toast.success("Đã xoá ảnh đại diện");
    } catch (err) {
      toast.error("Không xoá được ảnh đại diện", { description: getMediaErrorMessage(err) });
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
      toast.error("Tên người dùng không được để trống");
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
      toast.success(t("admin.users.updateSuccess", "Cập nhật thông tin người dùng thành công"));
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
      toast.error(t("admin.users.updateFailed", "Cập nhật người dùng thất bại"), {
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
        <h3 className="mt-4 text-lg font-medium">Không tìm thấy người dùng</h3>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
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
            <h1 className="text-2xl font-bold">Chi tiết người dùng</h1>
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
                Hủy
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </>
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
              {user.enabled ? "Đang hoạt động" : "Đã khóa"}
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
                Thông tin cá nhân
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <Avatar className="h-24 w-24 border-2 border-border shadow-xs">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={`Ảnh đại diện ${formData.name}`} />}
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
                      errorTitle="Không đổi được ảnh đại diện"
                      onUploaded={handleAvatarUploaded}
                    >
                      Đổi ảnh
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
                        Xoá ảnh
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                      Tên người dùng
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
                  <p className="text-sm text-muted-foreground mb-1">Nhà cung cấp</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.provider ?? "—"}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Số điện thoại
                  </label>
                  <Input
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    type="tel"
                    placeholder="Chưa có"
                    className="font-medium"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Email đã xác minh
                  </p>
                  <p className="font-medium">
                    {user.emailVerified == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : user.emailVerified ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">Đã xác minh</span>
                    ) : (
                      <span className="text-muted-foreground">Chưa xác minh</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity & Stats — /api/admin/revenue/customers/{userId}, 12 tháng gần nhất */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingBag className="h-5 w-5" />
                  Đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {revenue.isLoading
                    ? "…"
                    : revenueError
                      ? "—"
                      : formatNumber(revenue.data?.orderCount)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Đơn tạo từ {formatDayLabel(revenue.range.from)} đến {formatDayLabel(revenue.range.to)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-5 w-5" />
                  Tổng chi tiêu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {revenue.isLoading
                    ? "…"
                    : revenueError
                      ? "—"
                      : formatCurrency(revenue.data?.totalSpent)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Tiền thực thu trong cùng khoảng
                </p>
              </CardContent>
            </Card>
            {revenueError && (
              <p className="col-span-2 text-xs text-destructive -mt-3">
                Không tải được số liệu đơn/chi tiêu: {revenueError.message}
              </p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Trạng thái</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      user.enabled ? "bg-emerald-500" : "bg-muted-foreground/50"
                    }`}
                  ></span>
                  <span className="font-medium text-sm">
                    {user.enabled ? "Hoạt động" : "Đã khóa"}
                  </span>
                </div>
              </div>
              <div className="border-t border-border/60 pt-4">
                <p className="text-sm text-muted-foreground">ID người dùng</p>
                <p className="font-mono text-sm font-medium mt-2 bg-secondary p-2 rounded-md border border-border/50">
                  {user.id}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Ngày tạo</span>
                </div>
                <p className="font-medium text-sm mt-2">
                  {formatDateTime(user.createdAt)}
                </p>
              </div>
              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Cập nhật cuối cùng</span>
                </div>
                <p className="font-medium text-sm mt-2">
                  {formatDateTime(user.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loyalty Section */}
      <UserLoyaltySection userId={numUserId} />

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận lưu thay đổi</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn lưu những thay đổi này không? Không thể
              hoàn tác hành động này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="action-buttons flex gap-3">
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              {isSaving ? "Đang lưu..." : "Xác nhận lưu"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Remove Avatar Dialog */}
      <AlertDialog open={showRemoveAvatar} onOpenChange={setShowRemoveAvatar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá ảnh đại diện?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh đại diện hiện tại của người dùng sẽ bị gỡ và xoá khỏi kho lưu trữ ảnh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isRemovingAvatar}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRemoveAvatar();
              }}
              disabled={isRemovingAvatar}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isRemovingAvatar ? "Đang xoá..." : "Xoá ảnh"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
