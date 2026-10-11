import { useState } from "react";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { ImageUploadButton } from "~/components/shared/media";
import { getMediaErrorMessage, pickImageUrl } from "~/lib/media";
import {
  useDeletePromotionImageMutation,
  useUpdatePromotionImageMutation,
} from "~/stores/apis/admin/promotions";
import type { MediaUpload } from "~/stores/apis/media";
import type { AdminPromotion } from "~/stores/apis/admin/promotions";

/// Ảnh khuyến mãi trong form sửa: đổi/xoá gọi thẳng PUT/DELETE /api/admin/promotions/{id}/image
/// (độc lập với nút Lưu của form).
export function PromotionImageField({ promotion }: { promotion: AdminPromotion }) {
  const { t } = useTranslation();
  // Kết quả PUT/DELETE gần nhất cho khuyến mãi đang sửa (promotion prop là bản chụp lúc mở form)
  const [override, setOverride] = useState<{ id: number; url: string | null } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [updateImage] = useUpdatePromotionImageMutation();
  const [deleteImage, { isLoading: removing }] = useDeletePromotionImageMutation();

  const imageUrl =
    override?.id === promotion.id ? override.url ?? undefined : pickImageUrl(promotion);

  const handleUploaded = async (media: MediaUpload) => {
    const res = await updateImage({ id: promotion.id, media }).unwrap();
    setOverride({ id: promotion.id, url: pickImageUrl(res?.data) ?? null });
    toast.success(t("admin.promotions.modal.imageUpdated"));
  };

  const handleRemove = async () => {
    try {
      await deleteImage(promotion.id).unwrap();
      setOverride({ id: promotion.id, url: null });
      toast.success(t("admin.promotions.modal.imageRemoved"));
    } catch (err) {
      toast.error(t("admin.promotions.modal.imageRemoveFailed"), {
        description: getMediaErrorMessage(err),
      });
    } finally {
      setConfirmRemove(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{t("admin.promotions.modal.image")}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="aspect-video w-40 max-w-full rounded-md border border-border/60 bg-muted/40 overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={t("admin.promotions.modal.imageAlt", { code: promotion.code })}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon size={20} className="text-muted-foreground/50" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <ImageUploadButton
            purpose="PROMOTION_IMAGE"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            errorTitle={t("admin.promotions.modal.imageUpdateFailed")}
            onUploaded={handleUploaded}
          >
            {imageUrl
              ? t("admin.promotions.modal.imageChange")
              : t("admin.promotions.modal.imageAdd")}
          </ImageUploadButton>
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setConfirmRemove(true)}
              disabled={removing}
            >
              <Trash2 size={13} />
              {t("admin.promotions.modal.imageRemove")}
            </Button>
          )}
          <p className="text-xs text-muted-foreground/70">
            {t("admin.promotions.modal.imageHint")}
          </p>
        </div>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.promotions.modal.imageRemoveTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.promotions.modal.imageRemoveDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{t("button.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={removing}
              onClick={(e) => {
                e.preventDefault();
                void handleRemove();
              }}
            >
              {t("admin.promotions.modal.imageRemove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
