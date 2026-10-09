import type { CellResponse } from "~/stores/apis/admin/lockerOps";

/**
 * Helper chuẩn hoá và đồng bộ sơ đồ tủ vật lý, phân loại ô và trạng thái cửa/hệ thống
 * giữa Admin Web và Mobile App (đồng bộ 100% với LockerLayoutHelper.dart).
 */

export interface EnrichedCell extends CellResponse {
  isXl: boolean;
  isDrone: boolean;
  isDoorOpen: boolean;
  typeLabel: string;
  statusLabel: string;
}

/**
 * Kiểm tra ô vali lớn XL (Ô #1, Cột 0, hoặc loại XL)
 */
export function isXlCell(cell: {
  cellType?: string | null;
  boxNumber?: number | null;
  colIndex?: number | null;
}): boolean {
  const cellType = cell.cellType?.toUpperCase();
  const boxNum = cell.boxNumber;
  const col = cell.colIndex;
  return cellType === "XL" || boxNum === 1 || col === 0;
}

/**
 * Kiểm tra ô Drone nóc tủ (Ô #2, Ô #3, hoặc loại DRONE)
 */
export function isDroneCell(cell: {
  cellType?: string | null;
  boxNumber?: number | null;
  colIndex?: number | null;
  isDrone?: boolean;
}): boolean {
  if (isXlCell(cell)) return false;
  const cellType = cell.cellType?.toUpperCase();
  const boxNum = cell.boxNumber;
  return (
    cell.isDrone === true ||
    cellType === "DRONE" ||
    ((!cellType || cellType === "") && (boxNum === 2 || boxNum === 3))
  );
}

/**
 * Kiểm tra trạng thái mở cửa (doorOpen === true hoặc hwState === 'OPEN')
 */
export function isDoorOpen(cell: {
  doorOpen?: boolean;
  hwState?: string | null;
}): boolean {
  return (
    cell.doorOpen === true ||
    cell.hwState?.toUpperCase() === "OPEN"
  );
}

/**
 * Lấy nhãn loại ô chuẩn hóa
 */
export function getCellTypeLabel(cell: {
  cellType?: string | null;
  boxNumber?: number | null;
  colIndex?: number | null;
  isDrone?: boolean;
}): string {
  if (isDroneCell(cell)) return "Drone (Nóc tủ)";
  if (isXlCell(cell)) return "Vali (XL - Cột 1)";
  return "Tiêu chuẩn (Vừa)";
}

/**
 * Lấy nhãn trạng thái ô chuẩn hóa (đồng bộ Mobile)
 */
export function getCellStatusLabel(cell: {
  status?: string | null;
  cellType?: string | null;
  boxNumber?: number | null;
  colIndex?: number | null;
  isDrone?: boolean;
}): string {
  const st = (cell.status ?? "AVAILABLE").toUpperCase();
  const drone = isDroneCell(cell);
  switch (st) {
    case "AVAILABLE":
      return drone ? "Nhận Drone" : "Sẵn sàng";
    case "OCCUPIED":
    case "IN_USE":
      return "Đang dùng";
    case "RESERVED":
      return "Đã đặt";
    case "FAULT":
      return "Hỏng";
    case "CLEANING":
      return "Bảo trì";
    case "OUT_OF_SERVICE":
      return "Tạm ngưng";
    default:
      return st;
  }
}

/**
 * Màu sắc chấm trạng thái
 */
export function getStatusDotColor(status?: string | null): string {
  switch (status?.toUpperCase()) {
    case "AVAILABLE":
      return "bg-cyan-500";
    case "OCCUPIED":
    case "IN_USE":
      return "bg-slate-500";
    case "RESERVED":
      return "bg-amber-500";
    case "FAULT":
      return "bg-rose-500";
    case "CLEANING":
      return "bg-blue-500";
    case "OUT_OF_SERVICE":
    default:
      return "bg-slate-400";
  }
}

/**
 * Chuẩn hoá danh sách ô tủ
 */
export function enrichCells(rawCells: CellResponse[]): EnrichedCell[] {
  if (!rawCells || !Array.isArray(rawCells)) return [];

  const enriched = rawCells.map((c) => {
    const xl = isXlCell(c);
    const drone = isDroneCell(c);
    const door = isDoorOpen(c);
    const typeLabel = getCellTypeLabel(c);
    const statusLabel = getCellStatusLabel(c);

    return {
      ...c,
      cellType: xl ? "XL" : drone ? "DRONE" : (c.cellType || "STANDARD"),
      isXl: xl,
      isDrone: drone,
      isDoorOpen: door,
      typeLabel,
      statusLabel,
    };
  });

  // Sắp xếp theo boxNumber tăng dần mặc định
  return enriched.sort((a, b) => (a.boxNumber ?? 0) - (b.boxNumber ?? 0));
}
