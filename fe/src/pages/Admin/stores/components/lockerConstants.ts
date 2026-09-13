import { BoxStatus, LockerStatus } from "~/types/admin/enums";

export const BOX_CFG: Record<
  string,
  { label: string; bg: string; border: string; text: string }
> = {
  [BoxStatus.AVAILABLE]: {
    label: "Trống",
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-700",
  },
  [BoxStatus.OCCUPIED]: {
    label: "Có đồ",
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-700",
  },
  [BoxStatus.RESERVED]: {
    label: "Đã đặt",
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
  },
  [BoxStatus.MAINTENANCE]: {
    label: "Bảo trì",
    bg: "bg-gray-100",
    border: "border-gray-300",
    text: "text-gray-500",
  },
};

export const LOCKER_STATUS_CFG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  [LockerStatus.ACTIVE]: {
    label: "Hoạt động",
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  [LockerStatus.INACTIVE]: {
    label: "Tắt",
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 border-gray-200",
  },
  [LockerStatus.MAINTENANCE]: {
    label: "Bảo trì",
    dot: "bg-yellow-400",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  [LockerStatus.DISCONNECTED]: {
    label: "Mất kết nối",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
};
