import { BoxStatus, LockerStatus } from "~/types/admin/enums";

export const BOX_CFG: Record<
  string,
  { labelKey: string; bg: string; border: string; text: string }
> = {
  [BoxStatus.AVAILABLE]: {
    labelKey: "admin.stores.boxStatus.available",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  [BoxStatus.OCCUPIED]: {
    labelKey: "admin.stores.boxStatus.occupied",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
  },
  [BoxStatus.RESERVED]: {
    labelKey: "admin.stores.boxStatus.reserved",
    bg: "bg-secondary",
    border: "border-border",
    text: "text-foreground",
  },
  [BoxStatus.MAINTENANCE]: {
    labelKey: "admin.stores.boxStatus.maintenance",
    bg: "bg-muted/40",
    border: "border-border",
    text: "text-muted-foreground",
  },
};

export const LOCKER_STATUS_CFG: Record<
  string,
  { labelKey: string; dot: string; badge: string }
> = {
  [LockerStatus.ACTIVE]: {
    labelKey: "admin.stores.lockerStatus.active",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  [LockerStatus.INACTIVE]: {
    labelKey: "admin.stores.lockerStatus.inactive",
    dot: "bg-muted-foreground/40",
    badge: "bg-secondary text-muted-foreground border-border",
  },
  [LockerStatus.MAINTENANCE]: {
    labelKey: "admin.stores.lockerStatus.maintenance",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  [LockerStatus.DISCONNECTED]: {
    labelKey: "admin.stores.lockerStatus.disconnected",
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
  },
};
