import { PageHeader } from "~/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ClipboardList, MessageSquare, BarChart3 } from "lucide-react";

import { ReportsTab } from "./components/ReportsTab";
import { FeedbackTab } from "./components/FeedbackTab";
import { AnalyticsTab } from "./components/AnalyticsTab";

export default function FeedbackPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý phản hồi & báo cáo"
        description="Theo dõi đánh giá chất lượng dịch vụ và xử lý khiếu nại khách hàng"
      />

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="bg-secondary/60 border border-border/60 p-1">
          <TabsTrigger value="reports" className="gap-2 text-xs">
            <ClipboardList size={14} />
            Báo cáo sự cố
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2 text-xs">
            <MessageSquare size={14} />
            Đánh giá dịch vụ
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 text-xs">
            <BarChart3 size={14} />
            Chỉ số & Thống kê
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
