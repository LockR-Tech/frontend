import React, { useMemo } from "react";
import { Monitor, Lock, Plus, Plane, Luggage, Box as BoxIcon, AlertTriangle, Sparkles, CheckCircle2, Wand2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { CellResponse } from "~/stores/apis/admin/lockerOps";
import { isDroneCell, isXlCell } from "~/lib/lockerLayoutHelper";

interface LockerAddBoxPreviewProps {
  cells: CellResponse[];
  mode: "single" | "batch";
  // Single mode props
  newBoxNumber: number | "";
  newRowIndex: number;
  newColIndex: number;
  // Batch mode props
  batchNumbers: number[];
  batchStartRow: number;
  batchStartCol: number;
  batchColsPerRow: number;
  // Common props
  newCellType: string;
  newSize: string;
  onSelectSlot: (row: number, col: number) => void;
}

export const LockerAddBoxPreview: React.FC<LockerAddBoxPreviewProps> = ({
  cells,
  mode,
  newBoxNumber,
  newRowIndex,
  newColIndex,
  batchNumbers,
  batchStartRow,
  batchStartCol,
  batchColsPerRow,
  newCellType,
  newSize,
  onSelectSlot,
}) => {
  // Bản đồ các ô hiện có trong trạm
  const cellMap = useMemo(() => {
    const map = new Map<string, CellResponse>();
    for (const c of cells) {
      const col = c.colIndex != null && c.colIndex > 0 ? c.colIndex : 1;
      const row = c.rowIndex ?? 1;
      map.set(`${row}:${col}`, c);
      if (isXlCell(c)) {
        map.set(`${row + 1}:${col}`, c);
      }
    }
    return map;
  }, [cells]);

  // Tính toán vị trí các ô sắp tạo trong chế độ Hàng loạt (Batch)
  const batchSlots = useMemo(() => {
    if (mode !== "batch" || !batchNumbers.length) return [];
    const list: { boxNumber: number; row: number; col: number; index: number }[] = [];
    const startRow = Math.max(1, Number(batchStartRow) || 1);
    const startCol = Math.max(1, Number(batchStartCol) || 1);
    const colsPerRow = Math.max(1, Number(batchColsPerRow) || 3);
    const rowStep = newCellType === "XL" || newSize === "XL" ? 2 : 1;

    let curRow = startRow;
    let curCol = startCol;

    for (let i = 0; i < batchNumbers.length; i++) {
      // Hàng 1 Cột 1 là Màn hình Kiosk cố định => Tự động nhảy sang Cột 2
      if (curRow === 1 && curCol === 1) {
        curCol = 2;
      }
      list.push({
        boxNumber: batchNumbers[i],
        row: curRow,
        col: curCol,
        index: i + 1,
      });

      curCol++;
      if (curCol >= startCol + colsPerRow) {
        curCol = startCol === 1 && curRow + rowStep === 1 ? 2 : startCol;
        curRow += rowStep;
      }
    }
    return list;
  }, [mode, batchNumbers, batchStartRow, batchStartCol, batchColsPerRow, newCellType, newSize]);

  const batchMap = useMemo(() => {
    const map = new Map<string, { boxNumber: number; index: number }>();
    batchSlots.forEach((item) => {
      map.set(`${item.row}:${item.col}`, item);
    });
    return map;
  }, [batchSlots]);

  // Xác định số hàng và số cột tối đa cần vẽ trên bảng Word-style preview
  const maxExistingRow = useMemo(() => {
    if (!cells.length) return 3;
    return Math.max(3, ...cells.map((c) => (c.rowIndex ?? 1) + (isXlCell(c) ? 1 : 0)));
  }, [cells]);

  const maxExistingCol = useMemo(() => {
    if (!cells.length) return 3;
    return Math.max(3, ...cells.map((c) => (c.colIndex != null && c.colIndex > 0 ? c.colIndex : 1)));
  }, [cells]);

  const targetRow = mode === "single" ? Number(newRowIndex) || 1 : Math.max(1, ...batchSlots.map((b) => b.row), 1);
  const targetCol = mode === "single" ? Number(newColIndex) || 1 : Math.max(1, ...batchSlots.map((b) => b.col), 1);

  const displayCols = Math.max(3, maxExistingCol, targetCol, mode === "batch" ? batchStartCol + batchColsPerRow - 1 : 1);
  const displayRows = Math.max(3, maxExistingRow, targetRow);

  // Thuật toán tìm ô trống đầu tiên (tránh để lại lỗ hổng/khoảng trống)
  const firstEmptySlot = useMemo(() => {
    // Quét theo thứ tự đọc:
    // Hàng 1: Cột 2, 3, ... (Cột 1 là Màn hình Kiosk)
    // Hàng 2+: Cột 1, 2, 3, ...
    for (let r = 1; r <= displayRows + 2; r++) {
      const startC = r === 1 ? 2 : 1;
      for (let c = startC; c <= displayCols; c++) {
        if (!cellMap.has(`${r}:${c}`)) {
          return { row: r, col: c };
        }
      }
    }
    return { row: displayRows + 1, col: 1 };
  }, [displayRows, displayCols, cellMap]);

  // Kiểm tra cảnh báo trùng vị trí
  const singleCollision = useMemo(() => {
    if (mode !== "single") return null;
    const r = Number(newRowIndex);
    const c = Number(newColIndex);
    if (r === 1 && c === 1) {
      return { type: "SCREEN", message: "Vị trí Hàng 1, Cột 1 là Màn hình Kiosk cố định!" };
    }
    const existing = cellMap.get(`${r}:${c}`);
    if (existing) {
      return { type: "BOX", message: `Vị trí Hàng ${r}, Cột ${c} đã có Ô #${existing.boxNumber}!` };
    }
    return null;
  }, [mode, newRowIndex, newColIndex, cellMap]);

  const batchCollisions = useMemo(() => {
    if (mode !== "batch") return [];
    const list: string[] = [];
    batchSlots.forEach((slot) => {
      if (slot.row === 1 && slot.col === 1) {
        list.push(`Ô #${slot.boxNumber} trùng Màn hình Kiosk`);
      } else {
        const existing = cellMap.get(`${slot.row}:${slot.col}`);
        if (existing) {
          list.push(`Ô #${slot.boxNumber} trùng với Ô #${existing.boxNumber}`);
        }
      }
    });
    return list;
  }, [mode, batchSlots, cellMap]);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div>
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            Mô phỏng sơ đồ Kiosk (Word Table)
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Màn hình Kiosk cố định ở (Hàng 1, Cột 1). Nhấn ô trống bất kỳ để chọn nhanh.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectSlot(firstEmptySlot.row, firstEmptySlot.col)}
          className="h-7 text-[11px] bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary font-medium"
        >
          <Wand2 className="w-3.5 h-3.5 mr-1 text-primary" />
          Chọn ô trống kế tiếp (H{firstEmptySlot.row}, C{firstEmptySlot.col})
        </Button>
      </div>

      {/* Collision Alerts */}
      {singleCollision && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{singleCollision.message}</span>
        </div>
      )}

      {batchCollisions.length > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Phát hiện {batchCollisions.length} ô bị trùng vị trí: {batchCollisions.slice(0, 3).join(", ")}
            {batchCollisions.length > 3 ? "..." : ""}
          </span>
        </div>
      )}

      {/* Word-like Table Preview Matrix */}
      <div className="overflow-x-auto border border-border/80 rounded-xl bg-background/60 shadow-xs max-h-[380px] overflow-y-auto">
        <table className="w-full border-collapse text-xs select-none">
          {/* Header Row: Cột 1, Cột 2, ... */}
          <thead>
            <tr className="bg-muted/60 border-b border-border/70 text-muted-foreground text-[11px]">
              <th className="p-2 w-16 text-center font-semibold border-r border-border/70 bg-muted/80">
                Hàng \ Cột
              </th>
              {Array.from({ length: displayCols }, (_, cIdx) => {
                const colNum = cIdx + 1;
                return (
                  <th key={colNum} className="p-2 text-center font-semibold border-r border-border/60 min-w-[110px]">
                    Cột {colNum}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: displayRows }, (_, rIdx) => {
              const rowNum = rIdx + 1;
              return (
                <tr key={rowNum} className="border-b border-border/60">
                  {/* Left Column Header: Hàng 1, Hàng 2, ... */}
                  <td className="p-2 text-center font-semibold text-muted-foreground bg-muted/40 border-r border-border/70 text-[11px]">
                    Hàng {rowNum}
                  </td>

                  {/* Matrix Cells */}
                  {Array.from({ length: displayCols }, (_, cIdx) => {
                    const colNum = cIdx + 1;
                    const key = `${rowNum}:${colNum}`;

                    // 1. Màn hình Kiosk 7" cố định ở Hàng 1, Cột 1
                    if (rowNum === 1 && colNum === 1) {
                      const isOverlapped =
                        (mode === "single" && Number(newRowIndex) === 1 && Number(newColIndex) === 1) ||
                        (mode === "batch" && batchMap.has("1:1"));

                      return (
                        <td
                          key={colNum}
                          className={`p-2 border-r border-border/60 align-middle ${
                            isOverlapped ? "ring-2 ring-rose-500 bg-rose-950/20" : ""
                          }`}
                        >
                          <div className="relative rounded-lg p-2.5 bg-slate-900 border border-slate-700 text-slate-100 flex flex-col items-center justify-center text-center gap-1 shadow-inner min-h-[82px]">
                            <div className="flex items-center gap-1.5">
                              <Monitor className="w-4 h-4 text-sky-400" />
                              <span className="font-bold text-xs tracking-tight text-white">Màn hình 7"</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge className="bg-sky-950 text-sky-300 border border-sky-600/40 text-[9px] px-1 py-0 h-3.5 font-mono">
                                1024×600
                              </Badge>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-slate-600 text-slate-300 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Cố định
                              </Badge>
                            </div>
                            <span className="text-[9px] text-slate-400">Không thể đổi</span>
                          </div>
                        </td>
                      );
                    }

                    // 2. Ô hiện có trong hệ thống
                    const existingBox = cellMap.get(key);
                    const isSingleTarget = mode === "single" && Number(newRowIndex) === rowNum && Number(newColIndex) === colNum;
                    const batchItem = mode === "batch" ? batchMap.get(key) : null;

                    if (existingBox) {
                      const isDrone = isDroneCell(existingBox);
                      const isXl = isXlCell(existingBox);
                      const hasCollision = isSingleTarget || Boolean(batchItem);

                      return (
                        <td
                          key={colNum}
                          className={`p-2 border-r border-border/60 align-middle ${
                            hasCollision ? "ring-2 ring-rose-500 bg-rose-500/10" : ""
                          }`}
                        >
                          <div
                            className={`rounded-lg p-2 border flex flex-col justify-between items-center text-center gap-1 min-h-[82px] transition-all ${
                              hasCollision
                                ? "border-rose-500 bg-rose-500/10 shadow-xs"
                                : isDrone
                                ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
                                : isXl
                                ? "bg-cyan-50/60 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800"
                                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-extrabold text-sm text-foreground">
                                #{existingBox.boxNumber}
                              </span>
                              <Badge
                                variant="secondary"
                                className={`text-[9px] px-1 py-0 h-3.5 font-semibold ${
                                  isDrone
                                    ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                                    : isXl
                                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {isDrone ? (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Plane className="w-2.5 h-2.5" /> Drone
                                  </span>
                                ) : isXl ? (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Luggage className="w-2.5 h-2.5" /> XL
                                  </span>
                                ) : (
                                  <span>{existingBox.size || "M"}</span>
                                )}
                              </Badge>
                            </div>

                            {hasCollision ? (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 animate-bounce">
                                ⚠️ Trùng vị trí!
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {isDrone ? "Tiếp nhận Drone" : isXl ? "Khoang Vali XL" : "Tiêu chuẩn"}
                              </span>
                            )}

                            <span className="text-[9px] text-muted-foreground/80 font-mono">
                              H{rowNum} · C{colNum}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    // 3. Ô mới sắp tạo (Single mode)
                    if (isSingleTarget) {
                      return (
                        <td key={colNum} className="p-2 border-r border-border/60 align-middle">
                          <div className="rounded-lg p-2 border-2 border-primary bg-primary/15 ring-2 ring-primary/30 flex flex-col justify-between items-center text-center gap-1 min-h-[82px] shadow-sm animate-pulse">
                            <div className="flex items-center justify-between w-full">
                              <span className="font-extrabold text-sm text-primary flex items-center gap-0.5">
                                <Sparkles className="w-3 h-3 text-primary" />
                                #{newBoxNumber || "?"}
                              </span>
                              <Badge className="bg-primary text-primary-foreground text-[9px] px-1 py-0 h-3.5 font-bold">
                                {newCellType} ({newSize})
                              </Badge>
                            </div>

                            <Badge variant="outline" className="text-[10px] border-primary text-primary font-bold px-1.5 py-0 h-4">
                              ✨ Ô sắp tạo
                            </Badge>

                            <span className="text-[9px] text-primary/80 font-mono font-semibold">
                              H{rowNum} · C{colNum}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    // 4. Ô mới sắp tạo (Batch mode)
                    if (batchItem) {
                      return (
                        <td key={colNum} className="p-2 border-r border-border/60 align-middle">
                          <div className="rounded-lg p-2 border-2 border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30 flex flex-col justify-between items-center text-center gap-1 min-h-[82px] shadow-xs animate-pulse">
                            <div className="flex items-center justify-between w-full">
                              <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                                #{batchItem.boxNumber}
                              </span>
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-3.5 font-bold">
                                {newCellType}
                              </Badge>
                            </div>

                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                              Ô mới ({batchItem.index}/{batchNumbers.length})
                            </span>

                            <span className="text-[9px] text-emerald-600/80 font-mono font-semibold">
                              H{rowNum} · C{colNum}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    // 5. Ô TRỐNG (Clickable để chọn vị trí ngay lập tức)
                    return (
                      <td key={colNum} className="p-2 border-r border-border/60 align-middle">
                        <button
                          type="button"
                          onClick={() => onSelectSlot(rowNum, colNum)}
                          className="w-full h-full rounded-lg p-2 border-2 border-dashed border-border/70 hover:border-primary hover:bg-primary/10 transition-all flex flex-col justify-center items-center text-center gap-1 min-h-[82px] group cursor-pointer"
                          title={`Nhấn để đặt ô tủ tại Hàng ${rowNum}, Cột ${colNum}`}
                        >
                          <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:scale-125 transition-all" />
                          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                            Trống (H{rowNum}, C{colNum})
                          </span>
                          <span className="text-[9px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Bấm để chọn
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-700" /> Màn hình 7" (Cố định H1, C1)
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-700" /> Ô hiện có
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            <span className="w-2.5 h-2.5 rounded bg-primary" /> Ô mới xem trước
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded border border-dashed border-slate-400" /> Ô trống (Bấm để chọn)
          </span>
        </div>

        <span className="text-[10px] text-muted-foreground">
          Hiện có: <strong>{cells.length}</strong> ô tủ
        </span>
      </div>
    </div>
  );
};
