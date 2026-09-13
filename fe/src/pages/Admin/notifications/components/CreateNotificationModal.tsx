import { useState } from "react";
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
import { useCreateNotificationMutation } from "@/stores/apis/admin/notifications";
import { NotificationType, NotificationChannel } from "~/types/admin/enums";

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTIFICATION_TYPE_OPTIONS: {
  value: NotificationType;
  labelKey: string;
}[] = [
  {
    value: NotificationType.ORDER_CREATED,
    labelKey: "admin.notifications.type.orderCreated",
  },
  {
    value: NotificationType.ORDER_CONFIRMED,
    labelKey: "admin.notifications.type.orderConfirmed",
  },
  {
    value: NotificationType.ORDER_READY,
    labelKey: "admin.notifications.type.orderReady",
  },
  {
    value: NotificationType.ORDER_COMPLETED,
    labelKey: "admin.notifications.type.orderCompleted",
  },
  {
    value: NotificationType.ORDER_CANCELLED,
    labelKey: "admin.notifications.type.orderCancelled",
  },
  {
    value: NotificationType.PAYMENT_SUCCESSFUL,
    labelKey: "admin.notifications.type.paymentSuccessful",
  },
  {
    value: NotificationType.PAYMENT_FAILED,
    labelKey: "admin.notifications.type.paymentFailed",
  },
  {
    value: NotificationType.PROMOTION,
    labelKey: "admin.notifications.type.promotion",
  },
  {
    value: NotificationType.SYSTEM_ALERT,
    labelKey: "admin.notifications.type.systemAlert",
  },
  {
    value: NotificationType.LOYALTY_POINTS_EARNED,
    labelKey: "admin.notifications.type.loyaltyPointsEarned",
  },
  {
    value: NotificationType.LOYALTY_REWARD_UNLOCKED,
    labelKey: "admin.notifications.type.loyaltyRewardUnlocked",
  },
];

const CHANNEL_OPTIONS: { value: NotificationChannel; labelKey: string }[] = [
  {
    value: NotificationChannel.IN_APP,
    labelKey: "admin.notifications.channel.inApp",
  },
  {
    value: NotificationChannel.EMAIL,
    labelKey: "admin.notifications.channel.email",
  },
  {
    value: NotificationChannel.PUSH,
    labelKey: "admin.notifications.channel.push",
  },
  {
    value: NotificationChannel.SMS,
    labelKey: "admin.notifications.channel.sms",
  },
];

const DEFAULT_FORM: {
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: string;
  title: string;
  message: string;
  relatedOrderId: string;
} = {
  type: NotificationType.SYSTEM_ALERT,
  channel: NotificationChannel.IN_APP,
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
  const [createNotification, { isLoading }] = useCreateNotificationMutation();
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const handleClose = () => {
    setFormData(DEFAULT_FORM);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const recipientId = parseInt(formData.recipientId, 10);
    if (isNaN(recipientId) || recipientId <= 0) {
      toast.error(t("admin.notifications.create.invalidRecipient"));
      return;
    }

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error(t("admin.notifications.create.requiredFields"));
      return;
    }

    try {
      await createNotification({
        type: formData.type,
        channel: formData.channel,
        recipientId,
        title: formData.title,
        message: formData.message,
        relatedOrderId: formData.relatedOrderId
          ? parseInt(formData.relatedOrderId, 10) || undefined
          : undefined,
      }).unwrap();

      toast.success(t("admin.notifications.create.successMsg"));
      handleClose();
    } catch {
      toast.error(t("admin.notifications.create.errorMsg"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell size={18} className="text-blue-600" />
            {t("admin.notifications.create.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.notifications.create.notifType")}</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, type: v as NotificationType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("admin.notifications.create.channel")}</Label>
              <Select
                value={formData.channel}
                onValueChange={(v) =>
                  setFormData((f) => ({
                    ...f,
                    channel: v as NotificationChannel,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
