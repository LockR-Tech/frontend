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
          className="h-9"
        >
          <X size={16} className="mr-1.5" />
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
          className="h-9"
        >
          <RefreshCw size={16} className={cn("mr-1.5", isRefreshing && "animate-spin")} />
          Tải lại
        </Button>
      )}

      {/* Create Button */}
      {createButton && (
        <Button
          size="sm"
          onClick={createButton.onClick}
          disabled={createButton.disabled}
          className="h-9 bg-primary hover:opacity-90"
        >
          <CreateIcon size={16} className="mr-1.5" />
          {createButton.label}
        </Button>
      )}
    </div>
  );
}
