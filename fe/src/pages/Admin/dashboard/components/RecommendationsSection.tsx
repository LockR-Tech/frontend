import type { Recommendation } from "~/types/dashboard.types";
import { RecommendationCard } from "./RecommendationCard";

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  onRecommendationClick: (id: string) => void;
}

export function RecommendationsSection({
  recommendations,
  onRecommendationClick,
}: RecommendationsSectionProps) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Đề xuất cho bạn
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {recommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onClick={onRecommendationClick}
          />
        ))}
      </div>
    </div>
  );
}
