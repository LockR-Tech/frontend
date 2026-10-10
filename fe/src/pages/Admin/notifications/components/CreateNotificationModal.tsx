import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
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
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useSendNotificationMutation } from "@/stores/apis/admin/notifications";
import { useGetAllUsersQuery } from "@/stores/apis/admin/users";
import { extractList } from "~/lib/extract-list";
import { COMPOSE_TYPE_OPTIONS, notificationErrorMessage } from "../notification-meta";

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FORM = {
  type: COMPOSE_TYPE_OPTIONS[0].value as string,
  recipientId: "",
  title: "",
  message: "",
  relatedOrderId: "",
};

export function CreateNotificationModal({
  isOpen,
  onClose,
}: CreateNotificationModalProps) {
  const { t } = useTranslation();
  const [sendNotification, { isLoading }] = useSendNotificationMutation();
  const [formData, setFormData] = useState(DEFAULT_FORM);

  // Hiện tên người nhận để admin kiểm tra đúng ID trước khi gửi.
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 }, { skip: !isOpen });
  const recipientName = useMemo(() => {
    const id = Number(formData.recipientId);
    if (!id) return null;
    const user = extractList<{ id: number; fullName?: string; email?: string }>(
      usersData?.data,
    ).find((u) => u.id === id);
    return user ? user.fullName || user.email || `#${user.id}` : undefined;
  }, [formData.recipientId, usersData]);

  const handleClose = () => {
    setFormData(DEFAULT_FORM);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userId = parseInt(formData.recipientId, 10);
    if (isNaN(userId) || userId <= 0) {
      toast.error(t("admin.notifications.create.invalidRecipient"));
      return;
    }

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error(t("admin.notifications.create.requiredFields"));
      return;
    }

    const orderId = formData.relatedOrderId ? parseInt(formData.relatedOrderId, 10) : NaN;
    try {
      // POST /api/admin/notifications/send — body NotificationRequest {userId, title, message, type, referenceId?, referenceType?}
      await sendNotification({
        userId,
        type: formData.type,
        title: formData.title.trim(),
        message: formData.message.trim(),
        ...(orderId > 0 ? { referenceId: orderId, referenceType: "ORDER" } : {}),
      }).unwrap();

      toast.success(t("admin.notifications.create.successMsg"));
      handleClose();
    } catch (err) {
      toast.error(t("admin.notifications.create.errorMsg"), {
        description: notificationErrorMessage(err, "") || undefined,
      });
    }
  };

  const typeHint = COMPOSE_TYPE_OPTIONS.find((o) => o.value === formData.type)?.hint;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell size={18} className="text-muted-foreground" />
            {t("admin.notifications.create.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("admin.notifications.create.notifType")}</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPOSE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeHint && <p className="text-xs text-muted-foreground/70">{typeHint}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.notifications.create.recipient")} *</Label>
              <Input
                type="number"
                min="1"
                value={formData.recipientId}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, recipientId: e.target.value }))
                }
                placeholder={t(
                  "admin.notifications.create.recipientPlaceholder",
                )}
                required
              />
              {recipientName !== null && (
                <p
                  className={`text-xs ${recipientName ? "text-muted-foreground" : "text-amber-600"}`}
                >
                  {recipientName ? `Người nhận: ${recipientName}` : "Không tìm thấy người dùng này"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.notifications.create.relatedOrder")}</Label>
              <Input
                type="number"
                min="1"
                value={formData.relatedOrderId}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, relatedOrderId: e.target.value }))
                }
                placeholder={t(
                  "admin.notifications.create.relatedOrderPlaceholder",
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.notifications.create.subject")} *</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData((f) => ({ ...f, title: e.target.value }))
              }
              placeholder={t("admin.notifications.create.subjectPlaceholder")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.notifications.create.content")} *</Label>
            <Textarea
              value={formData.message}
              onChange={(e) =>
                setFormData((f) => ({ ...f, message: e.target.value }))
              }
              placeholder={t("admin.notifications.create.contentPlaceholder")}
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t("button.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5">
              <Bell size={14} />
              {isLoading
                ? t("admin.notifications.create.sending")
                : t("admin.notifications.create.sendBtn")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
