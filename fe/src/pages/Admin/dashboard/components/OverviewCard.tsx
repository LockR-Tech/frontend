import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface OverviewCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  sublabel?: string;
  deltaAmount?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  color?: string; // Kept for backward compatibility but styled neutrally
  className?: string;
}

export function OverviewCard({
  label,
  value,
  icon: Icon,
  sublabel,
  deltaAmount,
  trend,
  className,
}: OverviewCardProps) {
  return (
    <Card className={cn("card-hover border border-border bg-card", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 truncate">
              {label}
            </p>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              {value}
            </div>

            {deltaAmount && (
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span>{deltaAmount}</span>
              </div>
            )}

            {(sublabel || trend) && (
              <div className="flex items-center gap-2 mt-2">
                {trend && (
                  <span
                    className={cn(
                      "inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded",
                      trend.isPositive
                        ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40"
                        : "text-muted-foreground bg-secondary",
                    )}
                  >
                    {trend.value}
                  </span>
                )}
                {sublabel && (
                  <span className="text-xs text-muted-foreground truncate">
                    {sublabel}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-lg bg-secondary text-foreground shrink-0 border border-border/60">
            <Icon size={18} className="text-foreground/80" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
