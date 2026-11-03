import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { ChangeDirection } from "~/lib/report-format";

interface OverviewCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  sublabel?: string;
  /** Mức thay đổi so với kỳ trước (đã định dạng) và hướng để chọn màu/mũi tên. */
  delta?: {
    text: string;
    direction: ChangeDirection;
  };
  className?: string;
}

export function OverviewCard({
  label,
  value,
  icon: Icon,
  sublabel,
  delta,
  className,
}: OverviewCardProps) {
  const DeltaIcon =
    delta?.direction === "up"
      ? ArrowUpRight
      : delta?.direction === "down"
        ? ArrowDownRight
        : Minus;

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

            {delta && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-1 text-xs font-semibold",
                  delta.direction === "up" && "text-emerald-600 dark:text-emerald-400",
                  delta.direction === "down" && "text-rose-600 dark:text-rose-400",
                  (delta.direction === "flat" || delta.direction === "unknown") &&
                    "text-muted-foreground",
                )}
              >
                <DeltaIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{delta.text}</span>
              </div>
            )}

            {sublabel && (
              <p className="text-xs text-muted-foreground mt-1.5 truncate" title={sublabel}>
                {sublabel}
              </p>
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
