import { Card, CardContent } from "~/components/ui/card";
import {
  ArrowRight,
  Building2,
  LineChart,
  Gift,
  Megaphone,
  Layers,
} from "lucide-react";
import type { Recommendation } from "~/types/dashboard.types";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onClick: (id: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
  "manage-tenant": Building2,
  "view-analysis": LineChart,
  "loyalty": Gift,
  "campaign": Megaphone,
  "build-model": Layers,
};

export function RecommendationCard({
  recommendation,
  onClick,
}: RecommendationCardProps) {
  const Icon = iconMap[recommendation.id] || Building2;

  return (
    <Card
      className="card-hover cursor-pointer border border-border bg-card group"
      onClick={() => onClick(recommendation.id)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-secondary rounded-lg border border-border/60 text-foreground">
            <Icon size={18} />
          </div>
          <ArrowRight
            size={16}
            className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
          />
        </div>
        <h3 className="font-semibold text-sm text-foreground mb-1.5 leading-tight group-hover:text-primary transition-colors">
          {recommendation.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {recommendation.description}
        </p>
      </CardContent>
    </Card>
  );
}
