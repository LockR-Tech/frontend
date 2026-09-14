import { BoxStatus, LockerStatus } from "~/types/admin/enums";

export const BOX_CFG: Record<
  string,
  { label: string; bg: string; border: string; text: string }
> = {
  [BoxStatus.AVAILABLE]: {
    label: "Trống",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  [BoxStatus.OCCUPIED]: {
    label: "Có đồ",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
  },
  [BoxStatus.RESERVED]: {
    label: "Đã đặt",
    bg: "bg-secondary",
    border: "border-border",
    text: "text-foreground",
  },
  [BoxStatus.MAINTENANCE]: {
    label: "Bảo trì",
    bg: "bg-muted/40",
    border: "border-border",
    text: "text-muted-foreground",
  },
};

export const LOCKER_STATUS_CFG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  [LockerStatus.ACTIVE]: {
    label: "Hoạt động",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  [LockerStatus.INACTIVE]: {
    label: "Tắt",
    dot: "bg-muted-foreground/40",
    badge: "bg-secondary text-muted-foreground border-border",
  },
  [LockerStatus.MAINTENANCE]: {
    label: "Bảo trì",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  [LockerStatus.DISCONNECTED]: {
    label: "Mất kết nối",
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
  },
};
