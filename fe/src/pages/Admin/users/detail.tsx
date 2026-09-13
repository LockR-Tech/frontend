import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { useUpdateUserMutation } from "~/stores/apis/admin";
import { UserLoyaltySection } from "./components/UserLoyaltySection";

const getRoleBadge = (role: string) => {
  const styles: Record<string, string> = {
    ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
    SUPER_ADMIN: "bg-red-50 text-red-700 border-red-200",
    STAFF: "bg-blue-50 text-blue-700 border-blue-200",
    USER: "bg-muted/30 text-foreground/80 border-border/50",
    PARTNER: "bg-orange-50 text-orange-700 border-orange-200",
    MODERATOR: "bg-teal-50 text-teal-700 border-teal-200",
  };
  return (
    <Badge
      variant="outline"
      className={`${styles[role] || styles.USER} font-medium text-xs`}
    >
      {role}
    </Badge>
  );
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useUserDetail(userId);
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
    setShowConfirm(false);
    setIsSaving(true);
    try {
      await updateUser({ id: Number(userId), data: formData }).unwrap();
      setIsDirty(false);
      navigate("/admin/users");
    } catch (error) {
      console.error("❌ [User] Save failed:", error);
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
                className="gap-2 bg-blue-600 hover:bg-blue-700"
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
                  ? "bg-green-50 text-green-700"
                  : "bg-muted/30 text-foreground/80"
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
                <Avatar className="h-24 w-24 border-2 border-white shadow-md flex-shrink-0">
                  <AvatarImage src={user.imageUrl} alt={formData.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
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
                    <Badge variant="outline">{user.provider}</Badge>
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
                    {user.emailVerified ? (
                      <span className="text-green-600">Đã xác minh</span>
                    ) : (
                      <span className="text-muted-foreground">Chưa xác minh</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity & Stats */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingBag className="h-5 w-5" />
                  Đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{user.orderCount || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">Tổng số đơn hàng</p>
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
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(user.totalSpent || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Tổng giá trị đơn hàng
                </p>
              </CardContent>
            </Card>
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
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      user.enabled ? "bg-green-500" : "bg-muted-foreground/50"
                    }`}
                  ></span>
                  <span className="font-medium">
                    {user.enabled ? "Hoạt động" : "Đã khóa"}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">ID người dùng</p>
                <p className="font-mono text-sm font-medium mt-2 bg-muted/30 p-2 rounded">
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
                  {formatDate(user.createdAt)}
                </p>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Cập nhật cuối cùng</span>
                </div>
                <p className="font-medium text-sm mt-2">
                  {formatDate(user.updatedAt)}
                </p>
              </div>
              {user.lastLogin && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Lần đăng nhập cuối</span>
                  </div>
                  <p className="font-medium text-sm mt-2">
                    {formatDate(user.lastLogin)}
                  </p>
                </div>
              )}
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Đang lưu..." : "Xác nhận lưu"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
