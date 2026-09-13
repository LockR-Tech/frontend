import { Card, CardContent, CardHeader, CardTitle, Button } from "~/components/ui";
import { Play, Clock, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface JobCardProps {
  title: string;
  description: string;
  frequency: string;
  icon: React.ReactNode;
  onTrigger: () => void;
  isLoading: boolean;
  lastRun?: string;
}

export function JobCard({
  title,
  description,
  frequency,
  icon,
  onTrigger,
  isLoading,
  lastRun,
}: JobCardProps) {
  const { t } = useTranslation();
  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} />
          <span>{t("admin.scheduler.frequencyLabel")} {frequency}</span>
        </div>

        {lastRun && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle size={14} />
            <span>{t("admin.scheduler.lastRunLabel")} {lastRun}</span>
          </div>
        )}

        <Button
          onClick={onTrigger}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          <Play size={16} className="mr-2" />
          {isLoading ? t("admin.scheduler.runningNow") : t("admin.scheduler.runNow")}
        </Button>
      </CardContent>
    </Card>
  );
}
