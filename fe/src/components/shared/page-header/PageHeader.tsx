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
    <div className={cn("flex items-start justify-between mb-6", className)}>
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      {action && (
        <Button
          onClick={action.onClick}
          className="bg-primary hover:opacity-90 text-primary-foreground"
        >
          <Icon size={18} />
          <span className="ml-2">{action.label}</span>
        </Button>
      )}
    </div>
  );
}
