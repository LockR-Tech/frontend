import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "~/components/ui/checkbox";

/**
 * Chọn dòng theo tích. Lựa chọn giữ qua các trang; ô tích ở đầu cột chọn/bỏ cả trang đang xem.
 * `canSelect` = false thì dòng đó không có ô tích (vd. tài khoản ADMIN).
 */
export function useRowSelection<T extends { id: number }>(pageRows: T[], canSelect?: (row: T) => boolean) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const clear = useCallback(() => setSelectedIds([]), []);
  const remove = useCallback(
    (ids: number[]) => setSelectedIds((prev) => prev.filter((id) => !ids.includes(id))),
    [],
  );

  const selectColumn = useMemo<ColumnDef<T, unknown>>(() => {
    const selectable = pageRows.filter((row) => !canSelect || canSelect(row));
    const allSelected = selectable.length > 0 && selectable.every((row) => selectedIds.includes(row.id));
    const someSelected = !allSelected && selectable.some((row) => selectedIds.includes(row.id));
    return {
      id: "select",
      enableSorting: false,
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          disabled={selectable.length === 0}
          onCheckedChange={(checked) => {
            const pageIds = selectable.map((row) => row.id);
            setSelectedIds((prev) =>
              checked
                ? Array.from(new Set([...prev, ...pageIds]))
                : prev.filter((id) => !pageIds.includes(id)),
            );
          }}
          aria-label={t("common.batchDelete.selectPage")}
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) =>
        !canSelect || canSelect(row.original) ? (
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={(checked) =>
              setSelectedIds((prev) =>
                checked ? [...prev, row.original.id] : prev.filter((id) => id !== row.original.id),
              )
            }
            aria-label={t("common.batchDelete.selectRow")}
            className="translate-y-[2px]"
          />
        ) : null,
    };
  }, [pageRows, canSelect, selectedIds, t]);

  return { selectedIds, clear, remove, selectColumn };
}
