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
  Image as ImageIcon,
  MapPin,
  TrendingUp,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { apiGet, apiPut } from "~/utils/api";
import { ImageUploadButton } from "~/components/shared/media";
import { getMediaErrorMessage, pickImageUrl } from "~/lib/media";
import {
  useDeleteStoreImageMutation,
  useUpdateStoreImageMutation,
} from "~/stores/apis/admin/stores";
import type { MediaUpload } from "~/stores/apis/media";
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
  // Ảnh cập nhật tại chỗ sau PUT/DELETE …/image (không refetch để khỏi mất dữ liệu form đang sửa)
  const [imageOverride, setImageOverride] = useState<string | null | undefined>(undefined);
  const [imageBroken, setImageBroken] = useState(false);
  const [showRemoveImage, setShowRemoveImage] = useState(false);
  const [updateStoreImage] = useUpdateStoreImageMutation();
  const [deleteStoreImage, { isLoading: isRemovingImage }] = useDeleteStoreImageMutation();

  const storeImage =
    imageOverride !== undefined ? imageOverride || undefined : pickImageUrl(store);

  const handleStoreImageUploaded = async (media: MediaUpload) => {
    if (!storeId) return;
    const res = await updateStoreImage({ id: Number(storeId), media }).unwrap();
    const url = pickImageUrl(res?.data);
    if (url) {
      setImageOverride(url);
    } else {
      // Phản hồi thiếu URL ⇒ đọc lại riêng thông tin cửa hàng
      const fresh = await apiGet<{ data: unknown }>(`/api/admin/stores/${storeId}`);
      setImageOverride(pickImageUrl(fresh?.data) ?? null);
    }
    setImageBroken(false);
    toast.success("Đã cập nhật ảnh địa điểm");
  };

  const handleRemoveStoreImage = async () => {
    if (!storeId) return;
    try {
      await deleteStoreImage(Number(storeId)).unwrap();
      setImageOverride(null);
      setImageBroken(false);
      toast.success("Đã xoá ảnh địa điểm");
    } catch (err) {
      toast.error("Không xoá được ảnh", { description: getMediaErrorMessage(err) });
    } finally {
      setShowRemoveImage(false);
    }
  };

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
      setImageOverride(undefined);
      setImageBroken(false);
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
        <h3 className="mt-4 text-lg font-medium">Không tìm thấy địa điểm</h3>
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
              Bạn có chắc chắn muốn lưu các thay đổi của địa điểm này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              {isSaving ? "Đang lưu..." : "Lưu"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Remove Image Dialog */}
      <AlertDialog open={showRemoveImage} onOpenChange={setShowRemoveImage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá ảnh địa điểm?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh hiện tại sẽ bị gỡ khỏi địa điểm và xoá khỏi kho lưu trữ ảnh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isRemovingImage}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRemoveStoreImage();
              }}
              disabled={isRemovingImage}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isRemovingImage ? "Đang xoá..." : "Xoá ảnh"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{store.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Mã địa điểm: #{store.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={isSaving}
                className="bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </>
          )}
          <Badge
            variant="outline"
            className={
              store.active
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-secondary text-muted-foreground border-border"
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
            {storeImage && !imageBroken ? (
              <img
                src={storeImage}
                alt={`Ảnh địa điểm ${store.name}`}
                className="w-full h-full object-cover absolute inset-0"
                onError={() => setImageBroken(true)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/70">
                <ImageIcon className="h-10 w-10" aria-hidden />
                <span className="text-xs">
                  {storeImage ? "Không tải được ảnh" : "Chưa có ảnh địa điểm"}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              {storeImage && (
                <button
                  type="button"
                  onClick={() => setShowRemoveImage(true)}
                  disabled={isRemovingImage}
                  aria-label="Xoá ảnh địa điểm"
                  className="flex items-center gap-1.5 bg-background/90 hover:bg-background text-rose-700 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border/40 shadow-xs backdrop-blur-xs transition-all disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xoá ảnh
                </button>
              )}
              <ImageUploadButton
                purpose="STORE_IMAGE"
                variant="outline"
                size="sm"
                className="h-auto gap-1.5 bg-background/90 hover:bg-background text-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg border-border/40 shadow-xs backdrop-blur-xs"
                errorTitle="Không đổi được ảnh địa điểm"
                onUploaded={handleStoreImageUploaded}
              >
                Đổi ảnh
              </ImageUploadButton>
            </div>
            <div className="absolute top-3 left-3">
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border backdrop-blur-xs ${
                  store.active
                    ? "bg-emerald-500/90 text-white border-emerald-400/40"
                    : "bg-background/90 text-foreground border-border/40"
                }`}
              >
                {store.active ? "Đang hoạt động" : "Đóng cửa"}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex-1 p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Tên địa điểm
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Nhập tên địa điểm"
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
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {/* Manager */}
          <div className="p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Quản lý địa điểm
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
              <div className="bg-secondary/60 border border-border/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {store.lockerCount ?? lockersList.length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Tổng Kiosk</p>
              </div>
              <div className="bg-secondary/60 border border-border/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{totalBoxes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tổng box</p>
              </div>
              <div className="bg-secondary/60 border border-border/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {availableBoxes}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Box trống</p>
              </div>
              <div className="bg-secondary/60 border border-border/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {store.orderCount ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Đơn hàng</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Tỉ lệ sử dụng</span>
                <span className="font-semibold text-foreground">
                  {totalBoxes > 0
                    ? Math.round(
                        ((totalBoxes - availableBoxes) / totalBoxes) * 100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
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
                <p className="text-xs text-muted-foreground/70">Mã địa điểm</p>
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
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/60">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Package className="h-4 w-4 text-muted-foreground" />
            Danh sách Kiosk
            <Badge variant="secondary" className="ml-1 text-xs">
              {lockersList.length}
            </Badge>
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => refetch?.()}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Làm mới
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowAddLocker(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Thêm Kiosk
            </Button>
          </div>
        </div>
        <div className="p-4">
          {lockersList.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có Kiosk nào tại địa điểm này</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setShowAddLocker(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Thêm Kiosk đầu tiên
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
