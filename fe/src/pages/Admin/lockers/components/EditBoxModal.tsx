import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import {
  Box as BoxIcon,
  Plane,
  Luggage,
  Sparkles,
  Trash2,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import {
  useUpdateBoxMutation,
  useDeleteBoxMutation,
  type CellResponse,
} from "~/stores/apis/admin/lockerOps";
import { isXlCell, isDroneCell } from "~/lib/lockerLayoutHelper";

interface EditBoxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cell: CellResponse | null;
  lockerName?: string;
  onSuccess: () => void;
}

export function EditBoxModal({
  open,
  onOpenChange,
  cell,
  lockerName,
  onSuccess,
}: EditBoxModalProps) {
  const [updateBox, { isLoading: isUpdating }] = useUpdateBoxMutation();
  const [deleteBox, { isLoading: isDeleting }] = useDeleteBoxMutation();

  const [boxNumber, setBoxNumber] = useState<number | "">("");
  const [cellType, setCellType] = useState<string>("STANDARD");
  const [size, setSize] = useState<string>("M");
  const [rowIndex, setRowIndex] = useState<number>(1);
  const [colIndex, setColIndex] = useState<number>(1);
  const [status, setStatus] = useState<string>("AVAILABLE");
  const [description, setDescription] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (cell) {
      setBoxNumber(cell.boxNumber ?? "");
      setCellType(
        cell.cellType ||
          (isXlCell(cell) ? "XL" : isDroneCell(cell) ? "DRONE" : "STANDARD")
      );
      setSize(cell.size || "M");
      setRowIndex(cell.rowIndex ?? 1);
      setColIndex(cell.colIndex ?? 1);
      setStatus(cell.status || "AVAILABLE");
      setDescription("");
      setShowDeleteConfirm(false);
    }
  }, [cell, open]);

  if (!cell) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxNumber) {
      toast.error("Vui lòng nhập số ô tủ!");
      return;
    }

      const normalizeBoxSize = (s: string) => {
        switch (s?.toUpperCase()) {
          case "S": return "SMALL";
          case "M": return "MEDIUM";
          case "L": return "LARGE";
          case "XL": return "XL";
          default: return s || "MEDIUM";
        }
      };

      await updateBox({
        boxId: cell.id,
        boxNumber: Number(boxNumber),
        cellType,
        size: normalizeBoxSize(size),
        rowIndex: Number(rowIndex),
        colIndex: Number(colIndex),
        status,
        description: description.trim() || undefined,
      }).unwrap();

      toast.success(`Đã cập nhật công năng ô #${boxNumber} thành công!`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Không thể cập nhật thông tin ô tủ");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBox(cell.id).unwrap();
      toast.success(`Đã xóa ô #${cell.boxNumber} khỏi tủ`);
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Không thể xóa ô tủ");
    }
  };

  const isOccupied = cell.status === "OCCUPIED" || cell.status === "RESERVED" || cell.status === "IN_USE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {showDeleteConfirm ? (
          <div className="space-y-4 py-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" /> Xác nhận xóa ô #{cell.boxNumber}?
              </DialogTitle>
              <DialogDescription>
                Hành động này sẽ xóa vĩnh viễn ô #{cell.boxNumber} (ID: {cell.id}) khỏi sơ đồ tủ. Thao tác này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Sliders className="w-5 h-5 text-primary" />
                Chỉnh sửa công năng ô #{cell.boxNumber}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cấu hình công năng (ô thường, ô drone, ô vali), kích cỡ và bố cục vị trí trong tủ {lockerName ? `"${lockerName}"` : ""}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              {/* Chọn công năng / loại ô */}
              <div className="space-y-1.5">
                <Label htmlFor="editCellType" className="font-semibold text-xs flex items-center justify-between">
                  <span>Công năng ô tủ (Loại ô)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Quyết định luồng dịch vụ</span>
                </Label>
                <Select value={cellType} onValueChange={setCellType}>
                  <SelectTrigger id="editCellType" className="h-9 text-xs">
                    <SelectValue placeholder="Chọn loại công năng" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="STANDARD">
                      <div className="flex items-center gap-2 py-0.5">
                        <BoxIcon className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-semibold">Ô tiêu chuẩn (STANDARD)</span>
                          <p className="text-[10px] text-muted-foreground">Đa dịch vụ: Gửi đồ, giữ đồ, giặt ủi, giao nhận C2C</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="DRONE">
                      <div className="flex items-center gap-2 py-0.5">
                        <Plane className="w-4 h-4 text-sky-600" />
                        <div>
                          <span className="font-semibold text-sky-700 dark:text-sky-300">Ô tiếp nhận Drone (DRONE)</span>
                          <p className="text-[10px] text-muted-foreground">Nhận hàng tự động thả từ Drone qua nắp trượt ArUco</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="XL">
                      <div className="flex items-center gap-2 py-0.5">
                        <Luggage className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300">Khoang vali lớn (XL)</span>
                          <p className="text-[10px] text-muted-foreground">Khoang hành lý chiều cao 2 tầng, dành riêng gửi vali</p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Số ô & Kích cỡ */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editBoxNumber" className="font-semibold text-xs">
                    Số thứ tự ô (#)
                  </Label>
                  <Input
                    id="editBoxNumber"
                    type="number"
                    min={1}
                    value={boxNumber}
                    onChange={(e) => setBoxNumber(e.target.value ? Number(e.target.value) : "")}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editSize" className="font-semibold text-xs">
                    Kích cỡ khoang
                  </Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger id="editSize" className="h-9 text-xs">
                      <SelectValue placeholder="Chọn cỡ" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="S">Nhỏ (S)</SelectItem>
                      <SelectItem value="M">Trung bình (M - Chuẩn)</SelectItem>
                      <SelectItem value="L">Lớn (L)</SelectItem>
                      <SelectItem value="XL">Đặc biệt lớn (XL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vị trí hàng & cột */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editRowIndex" className="font-semibold text-xs">
                    Vị trí hàng (Row)
                  </Label>
                  <Input
                    id="editRowIndex"
                    type="number"
                    min={1}
                    max={10}
                    value={rowIndex}
                    onChange={(e) => setRowIndex(Number(e.target.value))}
                    className="h-9 text-xs"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">Hàng 1 thường là hàng Drone nóc tủ</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editColIndex" className="font-semibold text-xs">
                    Vị trí cột (Col)
                  </Label>
                  <Input
                    id="editColIndex"
                    type="number"
                    min={0}
                    max={10}
                    value={colIndex}
                    onChange={(e) => setColIndex(Number(e.target.value))}
                    className="h-9 text-xs"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">Cột 0 dành cho khoang XL dọc bên trái</p>
                </div>
              </div>

              {/* Trạng thái hoạt động */}
              <div className="space-y-1.5">
                <Label htmlFor="editStatus" className="font-semibold text-xs">
                  Trạng thái ô tủ
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="editStatus" className="h-9 text-xs">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="AVAILABLE">Sẵn sàng (AVAILABLE)</SelectItem>
                    <SelectItem value="OUT_OF_SERVICE">Tạm ngưng dùng (OUT_OF_SERVICE)</SelectItem>
                    <SelectItem value="CLEANING">Đang vệ sinh (CLEANING)</SelectItem>
                    <SelectItem value="FAULT">Báo hỏng (FAULT)</SelectItem>
                    {isOccupied && (
                      <SelectItem value={cell.status} disabled>
                        {cell.status} (Đang có đơn hàng)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <Label htmlFor="editDescription" className="font-semibold text-xs">
                  Ghi chú kỹ thuật (tùy chọn)
                </Label>
                <Input
                  id="editDescription"
                  placeholder="Ghi chú về công năng, chốt điện hoặc phần cứng..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isOccupied || isUpdating}
                title={isOccupied ? "Không thể xóa ô đang chứa hàng" : "Xóa ô khỏi tủ"}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa ô
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => onOpenChange(false)}
                  disabled={isUpdating}
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" className="text-xs" disabled={isUpdating}>
                  {isUpdating ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
