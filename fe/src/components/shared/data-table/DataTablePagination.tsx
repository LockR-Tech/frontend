import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import { Trans, useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export interface StandalonePaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export function StandalonePagination({
  pageIndex,
  pageSize,
  pageCount,
  totalRows,
  onPageChange,
  onPageSizeChange,
  className,
}: StandalonePaginationProps) {
  const { t } = useTranslation();

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

  const pageSizeOptions = Array.from(
    new Set([10, 20, 25, 50, 100, pageSize]),
  ).sort((a, b) => a - b);

  if (totalRows === 0 && pageIndex === 0) return null;

  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-4",
        className
      )}
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{t("table.showing")}</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[70px] bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {totalRows > 0 ? (
          <span className="text-muted-foreground">
            <Trans
              i18nKey="table.rangeOfTotal"
              values={{
                from,
                to,
                total: totalRows,
              }}
              components={{ b: <span className="font-medium text-foreground" /> }}
            />
          </span>
        ) : (
          <span className="text-muted-foreground">
            <Trans
              i18nKey="table.emptyPage"
              values={{ page: pageIndex + 1, total: totalRows }}
              components={{ b: <span className="font-medium text-foreground" /> }}
            />
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(0)}
          disabled={pageIndex <= 0}
          className="h-8 w-8 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronsLeft size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          disabled={pageIndex <= 0}
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
                onClick={() => onPageChange(page)}
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
          onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))}
          disabled={pageIndex >= pageCount - 1}
          className="h-8 w-8 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(Math.max(0, pageCount - 1))}
          disabled={pageIndex >= pageCount - 1}
          className="h-8 w-8 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronsRight size={16} />
        </Button>
      </div>
    </div>
  );
}

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
  const pageSize = table.getState().pagination.pageSize;

  return (
    <StandalonePagination
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={pageCount}
      totalRows={totalRows}
      onPageChange={(p) => table.setPageIndex(p)}
      onPageSizeChange={(s) => table.setPageSize(s)}
      className={className}
    />
  );
}
