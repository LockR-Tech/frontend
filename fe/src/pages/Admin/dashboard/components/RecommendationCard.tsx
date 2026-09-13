import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-200 group"
      onClick={() => onClick(recommendation.id)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Icon size={22} className="text-blue-600" />
          </div>
          <ArrowRight
            size={18}
            className="text-muted-foreground/70 group-hover:text-blue-600 transition-colors"
          />
        </div>
        <h3 className="font-semibold text-foreground mb-1.5 leading-tight">
          {recommendation.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {recommendation.description}
        </p>
      </CardContent>
    </Card>
  );
}
