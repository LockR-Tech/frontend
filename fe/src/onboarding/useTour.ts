import { createContext, useContext } from "react";

export interface TourApi {
  /** Mở danh sách hướng dẫn (nút "Hướng dẫn", Tuỳ chọn) — luôn mở được, kể cả đã bỏ qua vĩnh viễn. */
  openGuide: () => void;
  /** Chạy ngay các nhóm theo mã (trang HDSD: "Xem trên màn hình"). */
  startGroups: (ids: string[]) => void;
  ready: boolean;
}

export const TourContext = createContext<TourApi>({ openGuide: () => {}, startGroups: () => {}, ready: false });
export const useTour = () => useContext(TourContext);
