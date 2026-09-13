import { PageHeader } from "~/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ClipboardList } from "lucide-react";

import { ReportsTab } from "./components/ReportsTab";

export default function FeedbackPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý phản hồi & báo cáo"
        description="Xử lý báo cáo sự cố từ khách hàng"
      />

      <Tabs defaultValue="reports">
        <TabsList className="mb-2">
          <TabsTrigger value="reports" className="gap-2">
            <ClipboardList size={14} />
            Báo cáo sự cố
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
