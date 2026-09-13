import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { DataTablePagination } from "./DataTablePagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

interface ServerPaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  serverPagination?: ServerPaginationProps;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
  className,
  emptyMessage = "Không có dữ liệu",
  isLoading = false,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(serverPagination
      ? {
          manualPagination: true,
          pageCount: serverPagination.pageCount,
          getPaginationRowModel: getPaginationRowModel(),
          onPaginationChange: (updater) => {
            const current = {
              pageIndex: serverPagination.pageIndex,
              pageSize: serverPagination.pageSize,
            };
            const next =
              typeof updater === "function" ? updater(current) : updater;
            if (next.pageSize !== current.pageSize) {
              serverPagination.onPageSizeChange(next.pageSize);
            } else if (next.pageIndex !== current.pageIndex) {
              serverPagination.onPageChange(next.pageIndex);
            }
          },
          state: {
            sorting,
            pagination: {
              pageIndex: serverPagination.pageIndex,
              pageSize: serverPagination.pageSize,
            },
          },
        }
      : {
          getPaginationRowModel: getPaginationRowModel(),
          state: { sorting },
          initialState: { pagination: { pageSize } },
        }),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
  });

  if (isLoading) {
    return (
      <div className="w-full rounded-xl border border-border bg-card p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/30 border-t-primary" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full rounded-xl border border-border bg-card p-12">
        <div className="flex flex-col items-center justify-center text-muted-foreground/60">
          <svg
            className="w-16 h-16 mb-4 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium text-muted-foreground">{emptyMessage}</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Dữ liệu sẽ hiển thị tại đây
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-muted/80 border-b border-border hover:bg-muted/80"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-muted-foreground font-semibold text-xs uppercase tracking-wider py-3 px-4 first:pl-6 last:pr-6"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center gap-1",
                          header.column.getCanSort() &&
                            "cursor-pointer select-none hover:text-foreground"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getIsSorted() === "asc" && (
                          <ChevronUp size={14} className="text-primary" />
                        )}
                        {header.column.getIsSorted() === "desc" && (
                          <ChevronDown size={14} className="text-primary" />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "border-b border-border/50 transition-colors duration-200",
                    "hover:bg-primary/5",
                    index % 2 === 0 ? "bg-card" : "bg-muted/30"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-2.5 px-4 text-sm text-card-foreground first:pl-6 last:pr-6"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        table={table}
        totalRowsOverride={serverPagination?.totalRows}
      />
    </div>
  );
}
