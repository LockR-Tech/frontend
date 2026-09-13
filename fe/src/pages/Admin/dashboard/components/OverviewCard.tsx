import { Card, CardContent } from "~/components/ui/card";

const colorMap = {
  blue:    { icon: "text-primary",          bg: "bg-primary/10" },
  indigo:  { icon: "text-violet-500",       bg: "bg-violet-500/10" },
  emerald: { icon: "text-emerald-500",      bg: "bg-emerald-500/10" },
  green:   { icon: "text-emerald-500",      bg: "bg-emerald-500/10" },
  amber:   { icon: "text-amber-500",        bg: "bg-amber-500/10" },
  red:     { icon: "text-red-500",          bg: "bg-red-500/10" },
  purple:  { icon: "text-violet-500",       bg: "bg-violet-500/10" },
  gray:    { icon: "text-muted-foreground", bg: "bg-muted" },
} as const;

interface OverviewCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  sublabel?: string;
  color?: keyof typeof colorMap;
}

export function OverviewCard({
  label,
  value,
  icon: Icon,
  sublabel,
  color = "blue",
}: OverviewCardProps) {
  const c = colorMap[color];
  return (
    <Card className="border border-border/50 shadow-sm bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider mb-2 text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
            {sublabel && (
              <p className="text-xs mt-1 text-muted-foreground">{sublabel}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${c.bg} shrink-0`}>
            <Icon size={22} className={c.icon} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
