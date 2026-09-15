import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ size?: number }>;
  };
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  const Icon = action?.icon || Plus;

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5 mb-6", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>

      {action && (
        <Button
          size="sm"
          onClick={action.onClick}
          className="h-9 px-3.5 bg-primary text-primary-foreground hover:opacity-90 shadow-xs font-medium shrink-0"
        >
          <Icon size={16} />
          <span className="ml-1.5">{action.label}</span>
        </Button>
      )}
    </div>
  );
}
