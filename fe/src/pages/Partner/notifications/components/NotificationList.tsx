import { Card, CardContent, Button, Badge } from "~/components/ui";
import { Bell, Check } from "lucide-react";
import type { Notification } from "../hooks/useNotifications";

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
}

export function NotificationList({ notifications, onMarkAsRead }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Không có thông báo nào
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card key={notification.id} className={notification.isRead ? "opacity-60" : ""}>
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <Bell className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{notification.title}</h3>
              <p className="text-muted-foreground text-sm">{notification.message}</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                {new Date(notification.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            {!notification.isRead && (
              <Button size="sm" variant="ghost" onClick={() => onMarkAsRead(notification.id)}>
                <Check size={16} />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
