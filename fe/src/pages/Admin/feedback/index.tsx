import { PageHeader } from "~/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ClipboardList, MessageSquare, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ReportsTab } from "./components/ReportsTab";
import { FeedbackTab } from "./components/FeedbackTab";
import { AnalyticsTab } from "./components/AnalyticsTab";

export default function FeedbackPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.feedback.page.title")}
        description={t("admin.feedback.page.description")}
      />

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList data-tour="feedback-tabs" className="bg-secondary/60 border border-border/60 p-1">
          <TabsTrigger data-tour="feedback-tab-reports" value="reports" className="gap-2 text-xs">
            <ClipboardList size={14} />
            {t("admin.feedback.tabs.reports")}
          </TabsTrigger>
          <TabsTrigger data-tour="feedback-tab-feedback" value="feedback" className="gap-2 text-xs">
            <MessageSquare size={14} />
            {t("admin.feedback.tabs.feedback")}
          </TabsTrigger>
          <TabsTrigger data-tour="feedback-tab-analytics" value="analytics" className="gap-2 text-xs">
            <BarChart3 size={14} />
            {t("admin.feedback.tabs.analytics")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
