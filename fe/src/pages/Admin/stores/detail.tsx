import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Save,
  X,
  Package,
  Camera,
  MapPin,
  TrendingUp,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
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
import { useStoreDetail } from "./hooks/useStoreDetail";
import { apiPut } from "~/utils/api";
import { BoxStatus } from "~/types/admin/enums";
import { LockerCard } from "./components/LockerCard";
import { AddLockerModal } from "./components/AddLockerModal";

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function StoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { store, lockers, isLoading, refetch } = useStoreDetail(storeId);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    openTime: "",
    closeTime: "",
    manager: "",
    managerPhone: "",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddLocker, setShowAddLocker] = useState(false);

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || "",
        address: store.address || "",
        phone: store.phone || "",
        email: store.email || "",
        openTime: store.openTime || "",
        closeTime: store.closeTime || "",
        manager: store.manager || "",
        managerPhone: store.managerPhone || "",
      });
      setIsDirty(false);
    }
  }, [store]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleCancel = () => {
    if (store) {
      setFormData({
        name: store.name || "",
        address: store.address || "",
        phone: store.phone || "",
        email: store.email || "",
        openTime: store.openTime || "",
        closeTime: store.closeTime || "",
        manager: store.manager || "",
        managerPhone: store.managerPhone || "",
      });
      setIsDirty(false);
    }
  };

  const handleSave = async () => {
    if (!storeId) return;
    setIsSaving(true);
    try {
      await apiPut(`/api/admin/stores/${storeId}`, formData);
      setIsDirty(false);
      setShowConfirm(false);
    } catch (error) {
      alert(
        "Lỗi khi lưu: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
        <h3 className="mt-4 text-lg font-medium">Không tìm thấy cửa hàng</h3>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  const lockersList = Array.isArray(lockers) ? lockers : [];
  const totalBoxes = lockersList.reduce(
    (sum, l) => sum + (l.totalBoxes ?? l.boxes?.length ?? 0),
    0,
  );
  const availableBoxes = lockersList.reduce(
    (sum, l) =>
      sum +
      (l.availableBoxes ??
        l.boxes?.filter((b) => b.status === BoxStatus.AVAILABLE).length ??
        0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Confirm Save Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận lưu thay đổi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn lưu các thay đổi của cửa hàng này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Đang lưu..." : "Lưu"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{store.name}</h1>
            <p className="text-sm text-muted-foreground">ID: {store.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Hủy
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </>
          )}
          <Badge
            variant="outline"
            className={
              store.active
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-muted/30 text-muted-foreground border-border/50"
            }
          >
            {store.active ? "Đang hoạt động" : "Đóng cửa"}
          </Badge>
        </div>
      </div>

      {/* Main Info Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row gap-0">
          {/* Image Panel */}
          <div className="relative md:w-72 shrink-0 bg-muted/50 min-h-56 md:min-h-0">
            <img
              src={store.imageUrl}
              alt={store.name}
              className="w-full h-full object-cover absolute inset-0"
              onError={(e) => {
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600";
              }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
            <button className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white text-foreground/80 text-xs font-medium px-3 py-1.5 rounded-lg shadow transition-all">
              <Camera className="h-3.5 w-3.5" />
              Đổi ảnh
            </button>
            <div className="absolute top-3 left-3">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  store.active
                    ? "bg-green-500 text-white"
                    : "bg-muted/300 text-white"
                }`}
              >
                {store.active ? "● Đang hoạt động" : "● Đóng cửa"}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex-1 p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Tên cửa hàng
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Nhập tên cửa hàng"
                  className="font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Địa chỉ
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Nhập địa chỉ"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Điện thoại
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="0909..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="store@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Giờ mở cửa
                </label>
                <Input
                  type="time"
                  value={formData.openTime}
                  onChange={(e) =>
                    handleInputChange("openTime", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Giờ đóng cửa
                </label>
                <Input
                  type="time"
                  value={formData.closeTime}
                  onChange={(e) =>
                    handleInputChange("closeTime", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground/70 font-mono border-t">
              <span className="text-muted-foreground/70">Lat:</span>
              <span className="text-muted-foreground font-semibold">
                {store.latitude}
              </span>
              <span className="text-muted-foreground/70 ml-3">Lng:</span>
              <span className="text-muted-foreground font-semibold">
                {store.longitude}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Bottom Row: Manager | Stats | History */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          {/* Manager */}
          <div className="p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Quản lý cửa hàng
            </p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Họ tên</label>
              <Input
                value={formData.manager}
                onChange={(e) => handleInputChange("manager", e.target.value)}
                placeholder="Tên quản lý"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Điện thoại
              </label>
              <Input
                value={formData.managerPhone}
                onChange={(e) =>
                  handleInputChange("managerPhone", e.target.value)
                }
                placeholder="Số điện thoại"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <TrendingUp className="h-3.5 w-3.5" /> Thống kê
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {store.lockerCount ?? lockersList.length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Tổng tủ</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{totalBoxes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tổng box</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {availableBoxes}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Box trống</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {store.orderCount ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Đơn hàng</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Tỉ lệ sử dụng</span>
                <span className="font-medium">
                  {totalBoxes > 0
                    ? Math.round(
                        ((totalBoxes - availableBoxes) / totalBoxes) * 100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${totalBoxes > 0 ? ((totalBoxes - availableBoxes) / totalBoxes) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* History */}
          <div className="p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Calendar className="h-3.5 w-3.5" /> Lịch sử
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground/70">Ngày tạo</p>
                <p className="text-sm font-semibold text-foreground/80 mt-0.5">
                  {formatDate(store.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground/70">Cập nhật cuối</p>
                <p className="text-sm font-semibold text-foreground/80 mt-0.5">
                  {formatDate(store.updatedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground/70">Mã cửa hàng</p>
                <p className="text-sm font-mono font-semibold text-foreground/80 mt-0.5">
                  #{store.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lockers Section */}
      <Card>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
            <Package className="h-4 w-4" />
            Danh sách tủ đồ
            <Badge variant="secondary" className="ml-1">
              {lockersList.length}
            </Badge>
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => refetch?.()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Làm mới
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowAddLocker(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Thêm tủ
            </Button>
          </div>
        </div>
        <div className="p-4">
          {lockersList.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground/70">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có tủ đồ nào trong cửa hàng này</p>
              <Button
                size="sm"
                className="mt-3 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowAddLocker(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Thêm tủ đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {lockersList.map((locker) => (
                <LockerCard
                  key={locker.id}
                  locker={locker}
                  onRefresh={() => refetch?.()}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {showAddLocker && storeId && (
        <AddLockerModal
          storeId={storeId}
          onClose={() => setShowAddLocker(false)}
          onCreated={() => refetch?.()}
        />
      )}
    </div>
  );
}
