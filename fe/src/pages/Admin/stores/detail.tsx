import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Phone,
  AlertCircle,
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
  Power,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
import { storeErrorMessage } from "./hooks/useStores";
import { apiGet } from "~/utils/api";
import { ImageUploadButton } from "~/components/shared/media";
import { getMediaErrorMessage, pickImageUrl } from "~/lib/media";
import { formatDateTime } from "~/lib/datetime";
import {
  isStoreActive,
  useDeleteStoreImageMutation,
  useUpdateStoreImageMutation,
  useUpdateStoreMutation,
  useUpdateStoreStatusMutation,
  type StoreRecord,
} from "~/stores/apis/admin/stores";
import type { MediaUpload } from "~/stores/apis/media";
import { LockerCard } from "./components/LockerCard";
import { AddLockerModal } from "./components/AddLockerModal";

// Chỉ các trường store-service thật sự lưu (StoreRequest).
const toForm = (store: StoreRecord) => ({
  name: store.name || "",
  address: store.address || "",
  contactPhone: store.contactPhone || "",
  description: store.description || "",
  latitude: store.latitude != null ? String(store.latitude) : "",
  longitude: store.longitude != null ? String(store.longitude) : "",
});

export default function StoreDetailPage() {
  const { t } = useTranslation();
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { store, lockers, isLoading, refetch, revenueStats, revenueError } =
    useStoreDetail(storeId);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactPhone: "",
    description: "",
    latitude: "",
    longitude: "",
  });
  const [updateStore] = useUpdateStoreMutation();
  const [updateStoreStatus, { isLoading: isTogglingStatus }] = useUpdateStoreStatusMutation();
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddLocker, setShowAddLocker] = useState(false);
  // Ảnh cập nhật tại chỗ ngay sau PUT/DELETE …/image, trước khi dữ liệu tải lại
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
    toast.success(t("admin.stores.detail.imageUpdated"));
  };

  const handleRemoveStoreImage = async () => {
    if (!storeId) return;
    try {
      await deleteStoreImage(Number(storeId)).unwrap();
      setImageOverride(null);
      setImageBroken(false);
      toast.success(t("admin.stores.detail.imageRemoved"));
    } catch (err) {
      toast.error(t("admin.stores.detail.imageRemoveFailed"), { description: getMediaErrorMessage(err) });
    } finally {
      setShowRemoveImage(false);
    }
  };

  // RTK tự tải lại địa điểm sau khi đổi ảnh/trạng thái — đang sửa dở thì không ghi đè form.
  const dirtyRef = useRef(false);
  dirtyRef.current = isDirty;
  useEffect(() => {
    if (store) {
      if (!dirtyRef.current) setFormData(toForm(store));
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
      setFormData(toForm(store));
      setIsDirty(false);
    }
  };

  const handleSave = async () => {
    if (!store) return;
    if (!formData.name.trim()) {
      setShowConfirm(false);
      toast.error(t("admin.stores.detail.nameRequired"));
      return;
    }
    setIsSaving(true);
    try {
      const lat = formData.latitude ? parseFloat(formData.latitude) : NaN;
      const lng = formData.longitude ? parseFloat(formData.longitude) : NaN;
      // Trường null/bỏ trống được giữ nguyên → xoá chữ thì gửi "". Không gửi
      // active/status: trạng thái đổi bằng nút riêng (PUT …/status).
      await updateStore({
        id: store.id,
        data: {
          name: formData.name.trim(),
          address: formData.address.trim(),
          contactPhone: formData.contactPhone.trim(),
          description: formData.description.trim(),
          latitude: Number.isFinite(lat) ? lat : undefined,
          longitude: Number.isFinite(lng) ? lng : undefined,
        },
      }).unwrap();
      setIsDirty(false);
      setShowConfirm(false);
      toast.success(t("admin.stores.detail.updated"));
    } catch (error) {
      setShowConfirm(false);
      toast.error(t("admin.stores.detail.saveFailed"), {
        description: storeErrorMessage(error, t("common.pleaseRetry")),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!store) return;
    const nextStatus = isStoreActive(store) ? "INACTIVE" : "ACTIVE";
    try {
      await updateStoreStatus({ id: store.id, data: { status: nextStatus } }).unwrap();
      toast.success(
        nextStatus === "ACTIVE"
          ? t("admin.stores.detail.activated")
          : t("admin.stores.detail.deactivated"),
      );
      setShowStatusConfirm(false);
    } catch (error) {
      toast.error(t("admin.stores.detail.statusFailed"), {
        description: storeErrorMessage(error, t("common.pleaseRetry")),
      });
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
        <h3 className="mt-4 text-lg font-medium">{t("admin.stores.detail.notFound")}</h3>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("button.back")}
        </Button>
      </div>
    );
  }

  const lockersList = Array.isArray(lockers) ? lockers : [];
  // LockerResponse có sẵn totalBoxes/availableBoxes (không gửi danh sách ô).
  const totalBoxes = lockersList.reduce((sum, l) => sum + (l.totalBoxes ?? 0), 0);
  const availableBoxes = lockersList.reduce((sum, l) => sum + (l.availableBoxes ?? 0), 0);
  const active = isStoreActive(store);

  return (
    <div className="space-y-6">
      {/* Confirm Save Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.stores.detail.confirmSaveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.stores.detail.confirmSaveDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>{t("button.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              {isSaving ? t("common.saving") : t("button.save")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Status Dialog */}
      <AlertDialog
        open={showStatusConfirm}
        onOpenChange={(open) => !isTogglingStatus && setShowStatusConfirm(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {active
                ? t("admin.stores.detail.deactivateTitle")
                : t("admin.stores.detail.reactivateTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {active
                ? t("admin.stores.detail.toInactive")
                : t("admin.stores.detail.toActive")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isTogglingStatus}>{t("button.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleToggleStatus();
              }}
              disabled={isTogglingStatus}
              className={active ? "bg-rose-600 text-white hover:bg-rose-700" : undefined}
            >
              {isTogglingStatus
                ? t("admin.stores.detail.updating")
                : active
                  ? t("admin.stores.detail.deactivate")
                  : t("dropdown.activate")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Remove Image Dialog */}
      <AlertDialog open={showRemoveImage} onOpenChange={setShowRemoveImage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.stores.detail.removeImageTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.stores.detail.removeImageDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isRemovingImage}>{t("button.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRemoveStoreImage();
              }}
              disabled={isRemovingImage}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isRemovingImage ? t("admin.stores.detail.removing") : t("common.removePhoto")}
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
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("admin.stores.detail.storeCode", { id: store.id })}
            </p>
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
                {t("button.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={isSaving}
                className="bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {isSaving ? t("common.saving") : t("common.saveChanges")}
              </Button>
            </>
          )}
          <Badge
            variant="outline"
            className={
              active
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-secondary text-muted-foreground border-border"
            }
          >
            {active ? t("admin.stores.detail.active") : t("admin.stores.detail.inactive")}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatusConfirm(true)}
            disabled={isTogglingStatus}
          >
            {isTogglingStatus ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="mr-1.5 h-3.5 w-3.5" />
            )}
            {active ? t("admin.stores.detail.deactivate") : t("dropdown.activate")}
          </Button>
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
                alt={t("admin.stores.detail.imageAlt", { name: store.name })}
                className="w-full h-full object-cover absolute inset-0"
                onError={() => setImageBroken(true)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/70">
                <ImageIcon className="h-10 w-10" aria-hidden />
                <span className="text-xs">
                  {storeImage
                    ? t("admin.stores.detail.imageLoadFailed")
                    : t("admin.stores.detail.noImage")}
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
                  aria-label={t("admin.stores.detail.removeImageAria")}
                  className="flex items-center gap-1.5 bg-background/90 hover:bg-background text-rose-700 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border/40 shadow-xs backdrop-blur-xs transition-all disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("common.removePhoto")}
                </button>
              )}
              <ImageUploadButton
                purpose="STORE_IMAGE"
                variant="outline"
                size="sm"
                className="h-auto gap-1.5 bg-background/90 hover:bg-background text-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg border-border/40 shadow-xs backdrop-blur-xs"
                errorTitle={t("admin.stores.detail.changeImageFailed")}
                onUploaded={handleStoreImageUploaded}
              >
                {t("common.changePhoto")}
              </ImageUploadButton>
            </div>
            <div className="absolute top-3 left-3">
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border backdrop-blur-xs ${
                  active
                    ? "bg-emerald-500/90 text-white border-emerald-400/40"
                    : "bg-background/90 text-foreground border-border/40"
                }`}
              >
                {active ? t("admin.stores.detail.active") : t("admin.stores.detail.inactive")}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex-1 p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {t("admin.stores.modal.name")}
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder={t("admin.stores.detail.namePlaceholder")}
                  className="font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {t("common.address")}
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder={t("admin.stores.detail.addressPlaceholder")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {t("common.phoneShort")}
                </label>
                <Input
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                  placeholder="0909..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {t("common.description")}
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder={t("admin.stores.detail.descriptionPlaceholder")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  {t("admin.stores.form.latitude")}
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    handleInputChange("latitude", e.target.value)
                  }
                  placeholder={t("admin.stores.form.latPlaceholder")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  {t("admin.stores.form.longitude")}
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    handleInputChange("longitude", e.target.value)
                  }
                  placeholder={t("admin.stores.form.lngPlaceholder")}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Bottom Row: Stats | History */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {/* Stats */}
          <div className="p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <TrendingUp className="h-3.5 w-3.5" /> {t("admin.stores.detail.stats")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/60 border border-border/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {lockersList.length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("admin.stores.detail.totalKiosks")}</p>
              </div>
              <div className="bg-secondary/60 border border-border/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{totalBoxes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("admin.stores.detail.totalBoxes")}</p>
              </div>
              <div className="bg-secondary/60 border border-border/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {availableBoxes}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("admin.stores.detail.freeBoxes")}</p>
              </div>
              <div className="bg-secondary/60 border border-border/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {revenueStats ? revenueStats.orderCount.toLocaleString("vi-VN") : "—"}
                </p>
                <p
                  className="text-xs text-muted-foreground mt-0.5"
                  title={revenueError?.message ?? t("admin.stores.detail.ordersHint")}
                >
                  {t("admin.stores.detail.orders12m")}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{t("admin.stores.detail.usageRate")}</span>
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
              <Calendar className="h-3.5 w-3.5" /> {t("admin.stores.detail.history")}
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground/70">{t("common.createdAt")}</p>
                <p className="text-sm font-semibold text-foreground/80 mt-0.5">
                  {formatDateTime(store.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground/70">{t("admin.stores.detail.lastUpdated")}</p>
                <p className="text-sm font-semibold text-foreground/80 mt-0.5">
                  {formatDateTime(store.updatedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground/70">{t("admin.stores.detail.storeCodeLabel")}</p>
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
            {t("admin.stores.detail.kioskList")}
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
              {t("button.refresh")}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowAddLocker(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("admin.stores.detail.addKiosk")}
            </Button>
          </div>
        </div>
        <div className="p-4">
          {lockersList.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("admin.stores.detail.noKiosks")}</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setShowAddLocker(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t("admin.stores.detail.addFirstKiosk")}
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
