import { useState, useEffect } from "react";
import { Store, MapPin, Phone, Clock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  useCreateStoreMutation,
  useUpdateStoreMutation,
} from "@/stores/apis/admin/stores";
import type { AdminStoreResponse } from "~/types/admin/store";

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store?: AdminStoreResponse | null;
  mode: "create" | "edit";
}

export function StoreModal({ isOpen, onClose, store, mode }: StoreModalProps) {
  const { t } = useTranslation();
  const [createStore, { isLoading: isCreating }] = useCreateStoreMutation();
  const [updateStore, { isLoading: isUpdating }] = useUpdateStoreMutation();
  const isSaving = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    description: "",
    openTime: "",
    closeTime: "",
  });

  useEffect(() => {
    if (store && mode === "edit") {
      setFormData({
        name: store.name || "",
        address: store.address || "",
        phone: store.phone || "",
        description: store.description || "",
        openTime: store.openTime || "",
        closeTime: store.closeTime || "",
      });
    } else {
      setFormData({
        name: "",
        address: "",
        phone: "",
        description: "",
        openTime: "07:00",
        closeTime: "21:00",
      });
    }
  }, [store, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        await createStore(formData).unwrap();
        toast.success(t("admin.stores.modal.createSuccess"));
      } else if (store) {
        await updateStore({ id: store.id, data: formData }).unwrap();
        toast.success(t("admin.stores.modal.editSuccess"));
      }
      onClose();
    } catch {
      toast.error(
        mode === "create"
          ? t("admin.stores.modal.createFailed")
          : t("admin.stores.modal.editFailed"),
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store size={20} className="text-blue-600" />
            {mode === "create" ? t("admin.stores.modal.createTitle") : t("admin.stores.modal.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("admin.stores.modal.name")} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t("admin.stores.modal.namePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin size={14} />
              {t("admin.stores.modal.address")} *
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder={t("admin.stores.modal.addressPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone size={14} />
              {t("admin.stores.modal.phone")} *
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder={t("admin.stores.modal.phonePlaceholder")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openTime" className="flex items-center gap-2">
                <Clock size={14} />
                {t("admin.stores.modal.openTime")}
              </Label>
              <Input
                id="openTime"
                type="time"
                value={formData.openTime}
                onChange={(e) =>
                  setFormData({ ...formData, openTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeTime" className="flex items-center gap-2">
                <Clock size={14} />
                {t("admin.stores.modal.closeTime")}
              </Label>
              <Input
                id="closeTime"
                type="time"
                value={formData.closeTime}
                onChange={(e) =>
                  setFormData({ ...formData, closeTime: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("admin.stores.modal.description")}</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t("admin.stores.modal.descriptionPlaceholder")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              {t("button.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving
                ? t("admin.stores.modal.saving")
                : mode === "create"
                  ? t("admin.stores.modal.createBtn")
                  : t("admin.stores.modal.saveBtn")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
