import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  className?: string;
  totalRowsOverride?: number;
}

export function DataTablePagination<TData>({
  table,
  className,
  totalRowsOverride,
}: DataTablePaginationProps<TData>) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const totalRows = totalRowsOverride ?? table.getFilteredRowModel().rows.length;

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];

    if (pageCount <= 7) {
      for (let i = 0; i < pageCount; i++) pages.push(i);
    } else {
      pages.push(0);

      if (pageIndex > 2) pages.push("ellipsis");

      for (
        let i = Math.max(1, pageIndex - 1);
        i <= Math.min(pageCount - 2, pageIndex + 1);
        i++
      ) {
        pages.push(i);
      }

      if (pageIndex < pageCount - 3) pages.push("ellipsis");

      pages.push(pageCount - 1);
    }

    return pages;
  };

  if (totalRows === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-4",
        className
      )}
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Hiển thị</span>
        <Select
          value={table.getState().pagination.pageSize.toString()}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="h-8 w-[70px] bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">
            {pageIndex * table.getState().pagination.pageSize + 1}
          </span>
          {" - "}
          <span className="font-medium text-foreground">
            {Math.min(
              (pageIndex + 1) * table.getState().pagination.pageSize,
              totalRows
            )}
          </span>
          {" của "}
          <span className="font-medium text-foreground">{totalRows}</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          className="h-8 w-8 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronsLeft size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="h-8 w-8 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft size={16} />
        </Button>

        <div className="flex items-center gap-1 mx-2">
          {getVisiblePages().map((page, idx) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground/60">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => table.setPageIndex(page)}
                className={cn(
                  "w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200",
                  pageIndex === page
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                )}
              >
                {page + 1}
              </button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="h-8 w-8 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          className="h-8 w-8 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronsRight size={16} />
        </Button>
      </div>
    </div>
  );
}
