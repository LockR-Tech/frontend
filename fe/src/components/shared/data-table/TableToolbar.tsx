import { Plus, RefreshCw, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface TableToolbarProps {
  /** Nút tạo mới */
  createButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ size?: number }>;
    disabled?: boolean;
  };
  /** Nút reload data */
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Nút clear filter */
  onClearFilters?: () => void;
  canClearFilters?: boolean;
  /** Class name */
  className?: string;
}

export function TableToolbar({
  createButton,
  onRefresh,
  isRefreshing,
  onClearFilters,
  canClearFilters,
  className,
}: TableToolbarProps) {
  const CreateIcon = createButton?.icon || Plus;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Clear Filters Button */}
      {onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          disabled={!canClearFilters}
          className="h-9 text-xs border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <X size={14} className="mr-1.5" />
          Xóa lọc
        </Button>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-9 text-xs border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <RefreshCw size={14} className={cn("mr-1.5", isRefreshing && "animate-spin")} />
          Tải lại
        </Button>
      )}

      {/* Create Button */}
      {createButton && (
        <Button
          size="sm"
          onClick={createButton.onClick}
          disabled={createButton.disabled}
          className="h-9 px-3.5 bg-primary text-primary-foreground hover:opacity-90 shadow-xs text-xs font-medium"
        >
          <CreateIcon size={14} className="mr-1.5" />
          {createButton.label}
        </Button>
      )}
    </div>
  );
}
