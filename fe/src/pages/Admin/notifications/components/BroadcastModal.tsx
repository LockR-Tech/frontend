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
import { COMPOSE_TYPE_OPTIONS, notificationErrorMessage } from "../notification-meta";

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FORM = {
  type: COMPOSE_TYPE_OPTIONS[0].value as string,
  title: "",
  message: "",
  targetAllUsers: true,
  recipientIdsText: "",
};

/** "12, 15 18" → [12, 15, 18] (bỏ trùng, bỏ giá trị không hợp lệ). */
const parseIds = (text: string) =>
  [...new Set(text.split(/[\s,;]+/).map((s) => Number(s.trim())))].filter(
    (n) => Number.isInteger(n) && n > 0,
  );

export function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
  const { t } = useTranslation();
  const [broadcastNotification, { isLoading }] = useBroadcastNotificationMutation();
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const handleClose = () => {
    setFormData(DEFAULT_FORM);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error(t("admin.notifications.broadcast.requiredFields"));
      return;
    }

    const userIds = formData.targetAllUsers ? undefined : parseIds(formData.recipientIdsText);
    if (userIds && userIds.length === 0) {
      toast.error("Nhập ít nhất một ID người nhận hợp lệ");
      return;
    }

    try {
      // Backend không hỗ trợ kênh/hẹn giờ: chỉ gửi ngay qua app (in-app + push).
      const result = await broadcastNotification({
        type: formData.type,
        title: formData.title.trim(),
        message: formData.message.trim(),
        ...(userIds ? { userIds } : {}),
      }).unwrap();

      // Phản hồi là danh sách thông báo đã tạo — mỗi phần tử là một người nhận.
      const sent = Array.isArray(result.data) ? result.data.length : 0;
      toast.success(
        t("admin.notifications.broadcast.successMsg").replace("{count}", String(sent)),
      );
      handleClose();
    } catch (err) {
      toast.error(t("admin.notifications.broadcast.errorMsg"), {
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
            <Megaphone size={18} className="text-muted-foreground" />
            {t("admin.notifications.broadcast.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                {COMPOSE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeHint && <p className="text-xs text-muted-foreground/70">{typeHint}</p>}
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
            <p className="text-xs text-muted-foreground/70">
              Thông báo được gửi ngay; số người nhận thực tế hiển thị sau khi gửi.
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
