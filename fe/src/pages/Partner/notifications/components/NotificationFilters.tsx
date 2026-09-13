import { Button } from "~/components/ui";

interface NotificationFiltersProps {
  filter: "all" | "unread";
  onFilterChange: (filter: "all" | "unread") => void;
  unreadCount: number;
  onMarkAllAsRead: () => void;
}

export function NotificationFilters({
  filter,
  onFilterChange,
  unreadCount,
  onMarkAllAsRead,
}: NotificationFiltersProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => onFilterChange("all")}
        >
          Tất cả
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          onClick={() => onFilterChange("unread")}
        >
          Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
        </Button>
      </div>
      <Button variant="outline" onClick={onMarkAllAsRead}>
        Đánh dấu tất cả đã đọc
      </Button>
    </div>
  );
}
