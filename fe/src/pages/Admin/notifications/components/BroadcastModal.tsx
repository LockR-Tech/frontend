import { useState } from "react";
import { Megaphone, Users, User } from "lucide-react";
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
import { useBroadcastNotificationMutation } from "@/stores/apis/admin/notifications";
import { NotificationType, NotificationChannel } from "~/types/admin/enums";

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTIFICATION_TYPE_OPTIONS = [
  {
    value: NotificationType.PROMOTION,
    labelKey: "admin.notifications.type.promotion",
  },
  {
    value: NotificationType.SYSTEM_ALERT,
    labelKey: "admin.notifications.type.systemAlert",
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
    value: NotificationType.LOYALTY_REWARD_UNLOCKED,
    labelKey: "admin.notifications.type.loyaltyRewardUnlocked",
  },
];

const CHANNEL_OPTIONS = [
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

export function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
  const { t } = useTranslation();
  const [broadcastNotification, { isLoading }] =
    useBroadcastNotificationMutation();

  const [formData, setFormData] = useState({
    type: NotificationType.PROMOTION as string,
    channel: NotificationChannel.IN_APP as string,
    title: "",
    message: "",
    targetAllUsers: true,
    recipientIdsText: "",
    scheduledFor: "",
  });

  const reset = () => {
    setFormData({
      type: NotificationType.PROMOTION,
      channel: NotificationChannel.IN_APP,
      title: "",
      message: "",
      targetAllUsers: true,
      recipientIdsText: "",
      scheduledFor: "",
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error(t("admin.notifications.broadcast.requiredFields"));
      return;
    }

    const recipientIds = formData.targetAllUsers
      ? undefined
      : formData.recipientIdsText
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));

    try {
      const result = await broadcastNotification({
        type: formData.type as (typeof NotificationType)[keyof typeof NotificationType],
        channel:
          formData.channel as (typeof NotificationChannel)[keyof typeof NotificationChannel],
        title: formData.title,
        message: formData.message,
        targetAllUsers: formData.targetAllUsers,
        recipientIds,
        scheduledFor: formData.scheduledFor || undefined,
      }).unwrap();

      const sent = result.data?.totalNotificationsSent ?? 0;
      toast.success(
        t("admin.notifications.broadcast.successMsg").replace(
          "{count}",
          String(sent),
        ),
      );
      handleClose();
    } catch {
      toast.error(t("admin.notifications.broadcast.errorMsg"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone size={18} className="text-blue-600" />
            {t("admin.notifications.broadcast.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.notifications.broadcast.notifType")}</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData((f) => ({ ...f, type: v }))}
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
              <Label>{t("admin.notifications.broadcast.channel")}</Label>
              <Select
                value={formData.channel}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, channel: v }))
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

          <div className="space-y-1.5">
            <Label>{t("admin.notifications.broadcast.subject")} *</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData((f) => ({ ...f, title: e.target.value }))
              }
              placeholder={t(
                "admin.notifications.broadcast.subjectPlaceholder",
              )}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.notifications.broadcast.content")} *</Label>
            <Textarea
              value={formData.message}
              onChange={(e) =>
                setFormData((f) => ({ ...f, message: e.target.value }))
              }
              placeholder={t(
                "admin.notifications.broadcast.contentPlaceholder",
              )}
              rows={3}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.notifications.broadcast.target")}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={formData.targetAllUsers ? "default" : "outline"}
                onClick={() =>
                  setFormData((f) => ({ ...f, targetAllUsers: true }))
                }
                className="gap-1.5"
              >
                <Users size={13} />
                {t("admin.notifications.broadcast.allUsers")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!formData.targetAllUsers ? "default" : "outline"}
                onClick={() =>
                  setFormData((f) => ({ ...f, targetAllUsers: false }))
                }
                className="gap-1.5"
              >
                <User size={13} />
                {t("admin.notifications.broadcast.specific")}
              </Button>
            </div>
            {!formData.targetAllUsers && (
              <Input
                className="mt-2"
                value={formData.recipientIdsText}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    recipientIdsText: e.target.value,
                  }))
                }
                placeholder={t(
                  "admin.notifications.broadcast.recipientIdsPlaceholder",
                )}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.notifications.broadcast.scheduledFor")}</Label>
            <Input
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) =>
                setFormData((f) => ({ ...f, scheduledFor: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground/70">
              {t("admin.notifications.broadcast.scheduledHint")}
            </p>
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
              <Megaphone size={14} />
              {isLoading
                ? t("admin.notifications.broadcast.sending")
                : t("admin.notifications.broadcast.sendBtn")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
