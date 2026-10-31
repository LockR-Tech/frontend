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
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Box as BoxIcon,
  Plane,
  Luggage,
  Trash2,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import {
  useUpdateBoxMutation,
  useDeleteBoxMutation,
  type CellResponse,
} from "~/stores/apis/admin/lockerOps";
import { isXlCell, isDroneCell, normalizeBoxSize } from "~/lib/lockerLayoutHelper";

// Ô đang có đơn hoặc đang báo hỏng: trạng thái do luồng đơn hàng / phiếu sự cố quản lý, không sửa tay ở đây
const LOCKED_STATUS_HINT: Record<string, { labelKey: string; hintKey: string }> = {
  OCCUPIED: { labelKey: "admin.lockers.cell.holdingItems", hintKey: "admin.lockers.editBox.hint.occupied" },
  IN_USE: { labelKey: "admin.lockers.cell.holdingItems", hintKey: "admin.lockers.editBox.hint.occupied" },
  RESERVED: { labelKey: "admin.lockers.cell.reserved", hintKey: "admin.lockers.editBox.hint.reserved" },
  FAULT: { labelKey: "admin.lockers.cell.faulty", hintKey: "admin.lockers.editBox.hint.fault" },
};

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
  const { t } = useTranslation();

  const [boxNumber, setBoxNumber] = useState<number | "">("");
  const [cellType, setCellType] = useState<string>("STANDARD");
  const [size, setSize] = useState<string>("MEDIUM");
  const [rowIndex, setRowIndex] = useState<number>(1);
  const [colIndex, setColIndex] = useState<number>(1);
  const [status, setStatus] = useState<string>("AVAILABLE");
  const [description, setDescription] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    if (cell) {
      setBoxNumber(cell.boxNumber ?? "");
      setCellType(
        cell.cellType ||
          (isXlCell(cell) ? "XL" : isDroneCell(cell) ? "DRONE" : "STANDARD")
      );
      // Backend lưu SMALL/MEDIUM/LARGE/XL; dữ liệu cũ có thể là S/M/L
      setSize(normalizeBoxSize(cell.size));
      setRowIndex(cell.rowIndex ?? 1);
      setColIndex(cell.colIndex ?? 1);
      setStatus(cell.status || "AVAILABLE");
      setDescription("");
      setShowDeleteConfirm(false);
    }
  }, [cell, open]);

  if (!cell) return null;

  const isOccupied = cell.status === "OCCUPIED" || cell.status === "RESERVED" || cell.status === "IN_USE";
  const lockedStatus = LOCKED_STATUS_HINT[cell.status] ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxNumber) {
      toast.error(t("admin.lockers.boxNumberRequired"));
      return;
    }

    try {
      await updateBox({
        boxId: cell.id,
        boxNumber: Number(boxNumber),
        cellType,
        size: normalizeBoxSize(size),
        rowIndex: Number(rowIndex),
        colIndex: Number(colIndex),
        // Không gửi trạng thái khi ô đang có đơn / đang hỏng, hoặc khi admin không đổi
        status: lockedStatus || status === cell.status ? undefined : status,
        description: description.trim() || undefined,
      }).unwrap();

      toast.success(t("admin.lockers.editBox.updated", { number: boxNumber }));
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || t("admin.lockers.editBox.updateFailed"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBox({ boxId: cell.id, reason: deleteReason.trim() }).unwrap();
      toast.success(t("admin.lockers.editBox.deleted", { number: cell.boxNumber }));
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || t("admin.lockers.editBox.deleteFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {showDeleteConfirm ? (
          <div className="space-y-4 py-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" /> {t("admin.lockers.layout.action.deleteTitle", { number: cell.boxNumber })}
              </DialogTitle>
              <DialogDescription>
                {t("admin.lockers.editBox.deleteDesc", { number: cell.boxNumber, id: cell.id })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="deleteBoxReason" className="text-xs font-semibold">
                {t("common.deleteReason.label")} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="deleteBoxReason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder={t("common.deleteReason.placeholder")}
                maxLength={500}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                {t("common.cancelAction")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || deleteReason.trim() === ""}
              >
                {isDeleting ? t("admin.lockers.editBox.deleting") : t("admin.lockers.editBox.confirmDelete")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Sliders className="w-5 h-5 text-primary" />
                {t("admin.lockers.editBox.title", { number: cell.boxNumber })}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("admin.lockers.editBox.description", { locker: lockerName ? `"${lockerName}"` : "" })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              {/* Chọn công năng / loại ô */}
              <div className="space-y-1.5">
                <Label htmlFor="editCellType" className="font-semibold text-xs flex items-center justify-between">
                  <span>{t("admin.lockers.editBox.cellType")}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">{t("admin.lockers.editBox.cellTypeHint")}</span>
                </Label>
                <Select value={cellType} onValueChange={setCellType}>
                  <SelectTrigger id="editCellType" className="h-9 text-xs">
                    <SelectValue placeholder={t("admin.lockers.editBox.cellTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="STANDARD">
                      <div className="flex items-center gap-2 py-0.5">
                        <BoxIcon className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-semibold">{t("admin.lockers.editBox.typeStandard")}</span>
                          <p className="text-[10px] text-muted-foreground">{t("admin.lockers.editBox.typeStandardHint")}</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="DRONE">
                      <div className="flex items-center gap-2 py-0.5">
                        <Plane className="w-4 h-4 text-sky-600" />
                        <div>
                          <span className="font-semibold text-sky-700 dark:text-sky-300">{t("admin.lockers.editBox.typeDrone")}</span>
                          <p className="text-[10px] text-muted-foreground">{t("admin.lockers.editBox.typeDroneHint")}</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="XL">
                      <div className="flex items-center gap-2 py-0.5">
                        <Luggage className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300">{t("admin.lockers.boxType.xl")}</span>
                          <p className="text-[10px] text-muted-foreground">{t("admin.lockers.editBox.typeXlHint")}</p>
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
                    {t("admin.lockers.editBox.boxNumber")}
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
                    {t("admin.lockers.editBox.size")}
                  </Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger id="editSize" className="h-9 text-xs">
                      <SelectValue placeholder={t("admin.lockers.editBox.sizePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="SMALL">{t("admin.lockers.boxSize.small")}</SelectItem>
                      <SelectItem value="MEDIUM">{t("admin.lockers.boxSize.mediumDefault")}</SelectItem>
                      <SelectItem value="LARGE">{t("admin.lockers.boxSize.large")}</SelectItem>
                      <SelectItem value="XL">{t("admin.lockers.boxSize.xl")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vị trí hàng & cột */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editRowIndex" className="font-semibold text-xs">
                    {t("admin.lockers.editBox.row")}
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
                  <p className="text-[10px] text-muted-foreground">{t("admin.lockers.editBox.rowHint")}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editColIndex" className="font-semibold text-xs">
                    {t("admin.lockers.editBox.col")}
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
                  <p className="text-[10px] text-muted-foreground">{t("admin.lockers.editBox.colHint")}</p>
                </div>
              </div>

              {/* Trạng thái hoạt động */}
              <div className="space-y-1.5">
                <Label htmlFor="editStatus" className="font-semibold text-xs">
                  {t("admin.lockers.editBox.status")}
                </Label>
                {lockedStatus ? (
                  <>
                    <Input
                      id="editStatus"
                      value={`${t(lockedStatus.labelKey)} (${cell.status})`}
                      readOnly
                      disabled
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">{t(lockedStatus.hintKey)}</p>
                  </>
                ) : (
                  <>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger id="editStatus" className="h-9 text-xs">
                        <SelectValue placeholder={t("admin.lockers.editBox.statusPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="AVAILABLE">{t("admin.lockers.editBox.statusAvailable")}</SelectItem>
                        <SelectItem value="OUT_OF_SERVICE">{t("admin.lockers.editBox.statusOutOfService")}</SelectItem>
                        <SelectItem value="CLEANING">{t("admin.lockers.editBox.statusCleaning")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      {t("admin.lockers.editBox.faultHint")}
                    </p>
                  </>
                )}
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <Label htmlFor="editDescription" className="font-semibold text-xs">
                  {t("admin.lockers.editBox.note")}
                </Label>
                <Input
                  id="editDescription"
                  placeholder={t("admin.lockers.editBox.notePlaceholder")}
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
                title={isOccupied ? t("admin.lockers.editBox.cannotDelete") : t("admin.lockers.editBox.deleteTooltip")}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> {t("admin.lockers.editBox.delete")}
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
                  {t("button.cancel")}
                </Button>
                <Button type="submit" size="sm" className="text-xs" disabled={isUpdating}>
                  {isUpdating ? t("common.saving") : t("common.saveChanges")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
