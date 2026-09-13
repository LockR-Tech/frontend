import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import {
  MoreHorizontal,
  Eye,
  Archive,
  Trash2,
  RefreshCw,
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  MonitorSmartphone,
  CheckCheck,
  Clock,
  BookOpen,
} from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  NotificationStatus,
  NotificationChannel,
  NotificationType,
} from "~/types/admin/enums";
import type { AdminNotificationResponse } from "~/types/admin/notification";

interface NotificationTableProps {
  notifications: AdminNotificationResponse[];
  isLoading: boolean;
  onDelete?: (id: number) => void;
  onUpdateStatus?: (id: number, status: NotificationStatus) => void;
  onResend?: (id: number) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<AdminNotificationResponse>();

const getStatusBadge = (
  status: NotificationStatus,
  t: (key: string) => string,
) => {
  const variants: Record<
    NotificationStatus,
    { bg: string; text: string; icon: React.ElementType; labelKey: string }
  > = {
    [NotificationStatus.UNREAD]: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      icon: Clock,
      labelKey: "admin.notifications.status.unread",
    },
    [NotificationStatus.READ]: {
      bg: "bg-green-50",
      text: "text-green-700",
      icon: CheckCheck,
      labelKey: "admin.notifications.status.read",
    },
    [NotificationStatus.ARCHIVED]: {
      bg: "bg-muted/30",
      text: "text-muted-foreground",
      icon: Archive,
      labelKey: "admin.notifications.status.archived",
    },
  };
  const variant = variants[status] ?? variants[NotificationStatus.UNREAD];
  const Icon = variant.icon;
  return (
    <Badge
      className={`${variant.bg} ${variant.text} border-0 font-medium text-xs`}
    >
      <Icon className="mr-1 h-3 w-3" />
      {t(variant.labelKey)}
    </Badge>
  );
};

const getChannelBadge = (channel: NotificationChannel | undefined) => {
  if (!channel) {
    return (
      <Badge className="bg-blue-50 text-blue-700 border-0 font-medium text-xs">
        <MonitorSmartphone className="mr-1 h-3 w-3" />
        In-App
      </Badge>
    );
  }
  const variants: Record<
    NotificationChannel,
    { bg: string; text: string; icon: React.ElementType; label: string }
  > = {
    [NotificationChannel.IN_APP]: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: MonitorSmartphone,
      label: "In-App",
    },
    [NotificationChannel.EMAIL]: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      icon: Mail,
      label: "Email",
    },
    [NotificationChannel.SMS]: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      icon: MessageSquare,
      label: "SMS",
    },
    [NotificationChannel.PUSH]: {
      bg: "bg-red-50",
      text: "text-red-700",
      icon: Smartphone,
      label: "Push",
    },
  };
  const variant = variants[channel];
  if (!variant) {
    return <Badge className="bg-muted/30 text-muted-foreground border-0 text-xs">{channel}</Badge>;
  }
  const Icon = variant.icon;
  return (
    <Badge
      className={`${variant.bg} ${variant.text} border-0 font-medium text-xs`}
    >
      <Icon className="mr-1 h-3 w-3" />
      {variant.label}
    </Badge>
  );
};

const getTypeBadge = (type: NotificationType, t: (key: string) => string) => {
  const orderTypes = [
    NotificationType.ORDER_CREATED,
    NotificationType.ORDER_CONFIRMED,
    NotificationType.ORDER_READY,
    NotificationType.ORDER_COMPLETED,
    NotificationType.ORDER_CANCELLED,
  ];
  const paymentTypes = [
    NotificationType.PAYMENT_SUCCESSFUL,
    NotificationType.PAYMENT_FAILED,
  ];
  const loyaltyTypes = [
    NotificationType.LOYALTY_POINTS_EARNED,
    NotificationType.LOYALTY_REWARD_UNLOCKED,
  ];

  let bg = "bg-muted/30",
    text = "text-muted-foreground";
  if (orderTypes.includes(type as (typeof orderTypes)[number])) {
    bg = "bg-blue-50";
    text = "text-blue-700";
  } else if (paymentTypes.includes(type as (typeof paymentTypes)[number])) {
    bg = "bg-green-50";
    text = "text-green-700";
  } else if (loyaltyTypes.includes(type as (typeof loyaltyTypes)[number])) {
    bg = "bg-amber-50";
    text = "text-amber-700";
  } else if (type === NotificationType.PROMOTION) {
    bg = "bg-pink-50";
    text = "text-pink-700";
  } else if (type === NotificationType.SYSTEM_ALERT) {
    bg = "bg-red-50";
    text = "text-red-700";
  }

  const labelMap: Record<NotificationType, string> = {
    [NotificationType.ORDER_CREATED]: t(
      "admin.notifications.type.orderCreated",
    ),
    [NotificationType.ORDER_CONFIRMED]: t(
      "admin.notifications.type.orderConfirmed",
    ),
    [NotificationType.ORDER_READY]: t("admin.notifications.type.orderReady"),
    [NotificationType.ORDER_COMPLETED]: t(
      "admin.notifications.type.orderCompleted",
    ),
    [NotificationType.ORDER_CANCELLED]: t(
      "admin.notifications.type.orderCancelled",
    ),
    [NotificationType.PAYMENT_SUCCESSFUL]: t(
      "admin.notifications.type.paymentSuccessful",
    ),
    [NotificationType.PAYMENT_FAILED]: t(
      "admin.notifications.type.paymentFailed",
    ),
    [NotificationType.PROMOTION]: t("admin.notifications.type.promotion"),
    [NotificationType.SYSTEM_ALERT]: t("admin.notifications.type.systemAlert"),
    [NotificationType.LOYALTY_POINTS_EARNED]: t(
      "admin.notifications.type.loyaltyPointsEarned",
    ),
    [NotificationType.LOYALTY_REWARD_UNLOCKED]: t(
      "admin.notifications.type.loyaltyRewardUnlocked",
    ),
  };

  return (
    <Badge className={`${bg} ${text} border-0 font-medium text-xs`}>
      {labelMap[type] ?? type}
    </Badge>
  );
};

export function NotificationTable({
  notifications,
  isLoading,
  onDelete,
  onUpdateStatus,
  onResend,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: NotificationTableProps) {
  const { t } = useTranslation();
  const columns = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => (
        <span className="text-xs font-mono text-muted-foreground">
          #{info.getValue()}
        </span>
      ),
      size: 60,
    }),

    columnHelper.display({
      id: "recipient",
      header: t("admin.notifications.columns.recipient"),
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {row.recipientName ?? `#${row.recipientId ?? "—"}`}
            </p>
            {row.recipientEmail && (
              <p className="text-xs text-muted-foreground/70 truncate">
                {row.recipientEmail}
              </p>
            )}
          </div>
        );
      },
    }),

    columnHelper.accessor("title", {
      header: t("admin.notifications.columns.title"),
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="max-w-50">
            <p className="font-medium text-sm text-foreground truncate">
              {info.getValue()}
            </p>
            <p className="text-xs text-muted-foreground/70 truncate">{row.message}</p>
          </div>
        );
      },
    }),

    columnHelper.accessor("type", {
      header: t("admin.notifications.columns.type"),
      cell: (info) => getTypeBadge(info.getValue(), t),
    }),

    columnHelper.accessor("channel", {
      header: t("admin.notifications.columns.channel"),
      cell: (info) => getChannelBadge(info.getValue()),
    }),

    columnHelper.accessor("status", {
      header: t("admin.notifications.columns.status"),
      cell: (info) => getStatusBadge(info.getValue(), t),
    }),

    columnHelper.accessor("createdAt", {
      header: t("admin.notifications.columns.createdAt"),
      cell: (info) => {
        const date = new Date(info.getValue());
        return (
          <div className="text-xs text-muted-foreground">
            <p>{date.toLocaleDateString("vi-VN")}</p>
            <p>
              {date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const row = info.row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {row.status === NotificationStatus.UNREAD && onUpdateStatus && (
                <DropdownMenuItem
                  onClick={() =>
                    onUpdateStatus(row.id, NotificationStatus.READ)
                  }
                  className="text-xs"
                >
                  <BookOpen size={13} className="mr-2" />
                  {t("admin.notifications.actions.markRead")}
                </DropdownMenuItem>
              )}
              {row.status !== NotificationStatus.ARCHIVED && onUpdateStatus && (
                <DropdownMenuItem
                  onClick={() =>
                    onUpdateStatus(row.id, NotificationStatus.ARCHIVED)
                  }
                  className="text-xs"
                >
                  <Archive size={13} className="mr-2" />
                  {t("admin.notifications.actions.archive")}
                </DropdownMenuItem>
              )}
              {onResend && (
                <DropdownMenuItem
                  onClick={() => onResend(row.id)}
                  className="text-xs"
                >
                  <RefreshCw size={13} className="mr-2" />
                  {t("admin.notifications.actions.resend")}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(row.id)}
                    className="text-xs text-red-600 focus:text-red-600"
                  >
                    <Trash2 size={13} className="mr-2" />
                    Xóa
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={notifications}
      isLoading={isLoading}
      emptyMessage={t("admin.notifications.emptyMessage")}
      serverPagination={{
        pageIndex: page,
        pageSize,
        pageCount: totalPages,
        totalRows: totalElements,
        onPageChange,
        onPageSizeChange,
      }}
    />
  );
}
