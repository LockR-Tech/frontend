import { createContext, useContext } from "react";

export interface TourApi {
  /** Mở danh sách hướng dẫn (nút "Hướng dẫn", Tuỳ chọn) — luôn mở được, kể cả đã bỏ qua vĩnh viễn. */
  openGuide: () => void;
  ready: boolean;
}

export const TourContext = createContext<TourApi>({ openGuide: () => {}, ready: false });
export const useTour = () => useContext(TourContext);
