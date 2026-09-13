import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { JobResult } from "../hooks/useScheduler";

interface JobResultsProps {
  results: JobResult[];
}

export function JobResults({ results }: JobResultsProps) {
  const { t } = useTranslation();

  if (results.length === 0) {
    return (
      <Card className="border border-border/50 bg-muted/30">
        <CardContent className="p-8 text-center text-muted-foreground">
          <Clock size={32} className="mx-auto mb-2 text-muted-foreground/70" />
          <p>{t("admin.scheduler.noResults")}</p>
          <p className="text-sm text-muted-foreground/70">{t("admin.scheduler.noResultsDesc")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{t("admin.scheduler.historyTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                result.success ? "bg-green-500/10" : "bg-red-500/10"
              }`}
            >
              {result.success ? (
                <CheckCircle size={18} className="text-green-600 mt-0.5" />
              ) : (
                <XCircle size={18} className="text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.jobName}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp.toLocaleTimeString("vi-VN")}
                  </span>
                </div>
                <p className={`text-sm ${result.success ? "text-green-700" : "text-red-700"}`}>
                  {result.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
