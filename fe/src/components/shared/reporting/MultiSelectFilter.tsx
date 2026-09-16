import { Check, ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: MultiSelectOption[];
  /** Mảng rỗng = không lọc (backend hiểu là lấy tất cả). */
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

/**
 * Bộ lọc nhiều giá trị cho các bộ lọc `status` / `type` / `method` của API báo cáo.
 * Backend nhận `status=STORING,EXPIRED`, khớp không phân biệt hoa thường, giá trị lạ
 * chỉ đơn giản là không khớp gì.
 */
export function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
  className,
}: MultiSelectFilterProps) {
  const selected = new Set(value);

  const toggle = (option: string) => {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    // Giữ đúng thứ tự khai báo để URL ổn định giữa các lần chọn.
    onChange(options.filter((o) => next.has(o.value)).map((o) => o.value));
  };

  const summary =
    value.length === 0
      ? "Tất cả"
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : `${value.length} mục`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-between gap-2 font-normal min-w-[150px]",
            value.length > 0 && "border-primary/50",
            className,
          )}
        >
          <span className="text-xs text-muted-foreground shrink-0">{label}</span>
          <span className="text-sm truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const checked = selected.has(option.value);
          return (
            <DropdownMenuItem
              key={option.value}
              // Giữ menu mở để chọn nhiều mục liên tiếp.
              onSelect={(event) => {
                event.preventDefault();
                toggle(option.value);
              }}
              className="cursor-pointer gap-2"
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border shrink-0",
                  checked
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-input",
                )}
              >
                {checked && <Check className="h-3 w-3" />}
              </span>
              <span className="truncate">{option.label}</span>
            </DropdownMenuItem>
          );
        })}
        {value.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onChange([]);
              }}
              className="cursor-pointer text-muted-foreground"
            >
              Bỏ chọn tất cả
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
