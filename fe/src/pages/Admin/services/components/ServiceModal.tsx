import { useState, useEffect } from "react";
import { DollarSign, Clock, Package } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from "@/stores/apis/admin/services";
import type { AdminServiceResponse } from "~/types/admin/service";

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: AdminServiceResponse | null;
  mode: "create" | "edit";
}

export function ServiceModal({
  isOpen,
  onClose,
  service,
  mode,
}: ServiceModalProps) {
  const [createService, { isLoading: isCreating }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation();
  const isSaving = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    unit: "kg",
    estimatedMinutes: "1440",
  });

  useEffect(() => {
    if (service && mode === "edit") {
      setFormData({
        name: service.name || "",
        description: service.description || "",
        price: service.price?.toString() || "",
        unit: service.unit || "kg",
        estimatedMinutes: service.estimatedMinutes?.toString() || "1440",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: "",
        unit: "kg",
        estimatedMinutes: "1440",
      });
    }
  }, [service, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      price: Number(formData.price),
      unit: formData.unit || undefined,
      estimatedMinutes: formData.estimatedMinutes
        ? Number(formData.estimatedMinutes)
        : undefined,
    };
    try {
      if (mode === "create") {
        await createService(payload).unwrap();
        toast.success("Đã tạo dịch vụ thành công!");
      } else if (service) {
        await updateService({ id: service.id, data: payload }).unwrap();
        toast.success("Đã cập nhật dịch vụ thành công!");
      }
      onClose();
    } catch {
      toast.error(
        mode === "create"
          ? "Không thể tạo dịch vụ"
          : "Không thể cập nhật dịch vụ",
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            {mode === "create" ? "Thêm dịch vụ mới" : "Chỉnh sửa dịch vụ"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên dịch vụ *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ví dụ: Giặt ủi thường"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Mô tả chi tiết về dịch vụ"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="flex items-center gap-2">
                <DollarSign size={14} />
                Giá cơ bản *
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="25000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Đơn vị</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="kg, cái, bộ..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="estimatedMinutes"
              className="flex items-center gap-2"
            >
              <Clock size={14} />
              Thời gian ước tính (phút)
            </Label>
            <Input
              id="estimatedMinutes"
              type="number"
              value={formData.estimatedMinutes}
              onChange={(e) =>
                setFormData({ ...formData, estimatedMinutes: e.target.value })
              }
              placeholder="1440"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving
                ? "Đang lưu..."
                : mode === "create"
                  ? "Tạo dịch vụ"
                  : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
