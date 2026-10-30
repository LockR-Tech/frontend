import type { DroneOrderTracking } from "~/stores/apis/admin/droneOrders";

// Cách ghi các trường của đơn drone, dùng chung cho trang hành trình drone và trang chi tiết đơn
// để hai nơi (và app khách) đọc cùng một chữ.

// Giá trị là khoá i18n; dịch lúc render.
export const CANCEL_REASON_LABELS: Record<number, string> = {
  1: "admin.droneOrders.cancelReason.badWeather",
  2: "admin.droneOrders.cancelReason.droneFault",
  3: "admin.droneOrders.cancelReason.landingPadUnavailable",
  4: "admin.droneOrders.cancelReason.operational",
  5: "admin.droneOrders.cancelReason.other",
};

export const PARCEL_CATEGORY_LABELS: Record<string, string> = {
  DOCUMENT: "admin.droneOrders.parcelCategory.document",
  FOOD: "admin.droneOrders.parcelCategory.food",
  CLOTHING: "admin.droneOrders.parcelCategory.clothing",
  ELECTRONICS: "admin.droneOrders.parcelCategory.electronics",
  COSMETICS: "admin.droneOrders.parcelCategory.cosmetics",
  OTHER: "admin.droneOrders.parcelCategory.other",
};

export function parcelSize(order: DroneOrderTracking): string | null {
  const { parcelLengthCm: l, parcelWidthCm: w, parcelHeightCm: h } = order;
  return l && w && h ? `${l} × ${w} × ${h} cm` : null;
}

export function routeDistance(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined) return null;
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function grams(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return `${value.toLocaleString("vi-VN")} g`;
}
