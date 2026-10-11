import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FileText, FlaskConical, MessagesSquare, PowerOff, Settings2, TriangleAlert } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TooltipProvider } from "~/components/ui/tooltip";
import { useGetAssistantStatusQuery } from "~/stores/apis/admin/knowledge";
import { ConversationsTab } from "./ConversationsTab";
import { DocumentsTab } from "./DocumentsTab";
import { EvalTab } from "./EvalTab";
import type { EvalRun } from "./knowledge-utils";
import { Trans, useTranslation } from "react-i18next";

// `labelKey` là message key, dịch lúc render.
const TABS = [
  { value: "documents", labelKey: "admin.knowledge.tabs.documents", icon: FileText },
  { value: "conversations", labelKey: "admin.knowledge.tabs.conversations", icon: MessagesSquare },
  { value: "eval", labelKey: "admin.knowledge.tabs.eval", icon: FlaskConical },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function isTabValue(value: string | null): value is TabValue {
  return TABS.some((tab) => tab.value === value);
}

const SETTINGS_PATH = "/admin/settings?tab=assistant";

/**
 * Kho tri thức của trợ lý hỏi đáp RAG: tài liệu làm căn cứ trả lời, hội thoại của người dùng
 * để kiểm tra chất lượng, và bộ đánh giá truy xuất. Quy tắc (bật/tắt, ngưỡng, top-k…) chỉnh ở
 * trang Cấu hình nghiệp vụ, scope `assistant`.
 */
export default function KnowledgePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabValue = isTabValue(tabParam) ? tabParam : "documents";

  // Giữ kết quả đánh giá ở cấp trang để chuyển tab không mất (chạy lại tốn phí).
  const [lastRun, setLastRun] = useState<EvalRun | null>(null);

  // Endpoint chung của trợ lý; lỗi (chưa triển khai…) thì chỉ ẩn cảnh báo.
  const { data: statusData } = useGetAssistantStatusQuery();
  const status = statusData?.data;

  const handleTabChange = (value: string) => {
    if (!isTabValue(value)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", value);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5 pb-6">
        <PageHeader
          title={t("admin.knowledge.page.title")}
          description={t("admin.knowledge.page.description")}
          className="mb-0"
          action={{
            label: t("admin.knowledge.page.assistantSettings"),
            onClick: () => navigate(SETTINGS_PATH),
            icon: Settings2,
          }}
        />

        {status?.configured === false && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-900">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle className="text-sm">{t("admin.knowledge.alerts.missingKeysTitle")}</AlertTitle>
            <AlertDescription className="text-xs">
              {status.embeddingConfigured === false && (
                <>
                  <Trans i18nKey="admin.knowledge.alerts.missingEmbedding" components={{ code: <code /> }} />{" "}
                </>
              )}
              {status.chatConfigured === false && (
                <>
                  <Trans i18nKey="admin.knowledge.alerts.missingChat" components={{ code: <code /> }} />{" "}
                </>
              )}
              {status.embeddingConfigured === undefined && status.chatConfigured === undefined && (
                <>{t("admin.knowledge.alerts.missingUnknown")} </>
              )}
              {t("admin.knowledge.alerts.autoResume")}
            </AlertDescription>
          </Alert>
        )}
        {status?.enabled === false && (
          <Alert className="bg-muted/30">
            <PowerOff className="h-4 w-4" />
            <AlertTitle className="text-sm">{t("admin.knowledge.alerts.disabledTitle")}</AlertTitle>
            <AlertDescription className="text-xs">
              <Trans
                i18nKey="admin.knowledge.alerts.disabled"
                components={{
                  link: <Link to={SETTINGS_PATH} className="font-medium text-primary hover:underline" />,
                }}
              />
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <TabsList className="h-auto w-max gap-1 rounded-xl border border-border/50 bg-muted/60 p-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm"
                  >
                    <Icon className="h-4 w-4" />
                    {t(tab.labelKey)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="documents" className="mt-0">
            <DocumentsTab assistantStatus={status} />
          </TabsContent>
          <TabsContent value="conversations" className="mt-0">
            <ConversationsTab />
          </TabsContent>
          <TabsContent value="eval" className="mt-0">
            <EvalTab lastRun={lastRun} onRun={setLastRun} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
