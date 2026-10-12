import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  Clock,
  ArrowRight,
  ShieldCheck,
  History,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useGetAdminRefundsQuery } from "~/stores/apis/admin/payments";
import { formatNumber } from "~/lib/report-format";
import { RefundStats } from "./components/RefundStats";
import { RefundTable } from "./components/RefundTable";
import { RefundRulesGuide } from "./components/RefundRulesGuide";

export default function RefundsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"pending" | "history" | "rules">("pending");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Truy vấn số lượng theo trạng thái để hiển thị trên KPI cards
  const { data: pendingData, isLoading: isPendingLoading } = useGetAdminRefundsQuery({
    status: ["PENDING"],
    size: 1,
  });
  const { data: completedData, isLoading: isCompletedLoading } = useGetAdminRefundsQuery({
    status: ["COMPLETED"],
    size: 1,
  });
  const { data: rejectedData, isLoading: isRejectedLoading } = useGetAdminRefundsQuery({
    status: ["REJECTED"],
    size: 1,
  });
  const { data: totalData, isLoading: isTotalLoading } = useGetAdminRefundsQuery({
    size: 1,
  });

  const pendingCount = pendingData?.data?.totalElements ?? 0;
  const completedCount = completedData?.data?.totalElements ?? 0;
  const rejectedCount = rejectedData?.data?.totalElements ?? 0;
  const totalCount = totalData?.data?.totalElements ?? 0;

  const isStatsLoading =
    isPendingLoading || isCompletedLoading || isRejectedLoading || isTotalLoading;

  const handleKpiStatusClick = (status: string) => {
    setStatusFilter(status);
    if (status === "PENDING") {
      setActiveTab("pending");
    } else {
      setActiveTab("history");
    }
  };

  const handleTabChange = (val: string) => {
    const tab = val as "pending" | "history" | "rules";
    setActiveTab(tab);
    if (tab === "pending") {
      setStatusFilter("PENDING");
    } else if (tab === "history") {
      if (statusFilter === "PENDING") {
        setStatusFilter("ALL");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={t("admin.refunds.title", "Quản lý hoàn tiền")}
          description={t(
            "admin.refunds.description",
            "Theo dõi, xét duyệt và thực hiện chuyển khoản hoàn tiền cho khách hàng",
          )}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setIsRulesModalOpen(true)}
          >
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span>Quy tắc hoàn tiền</span>
          </Button>

          <Link to="/admin/payments">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              {t("admin.refunds.viewPayments", "Quản lý thanh toán")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Banner thông báo nếu có yêu cầu chờ duyệt */}
      {pendingCount > 0 && activeTab !== "pending" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {t("admin.refunds.pendingAlert", { count: pendingCount })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "admin.refunds.stats.pendingSub",
                  "Chờ admin duyệt & chuyển khoản",
                )}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/40 hover:bg-amber-500/20 text-xs shrink-0 font-medium bg-background/50"
            onClick={() => {
              setActiveTab("pending");
              setStatusFilter("PENDING");
            }}
          >
            {t("admin.refunds.pendingAlertAction", "Xử lý ngay")}
          </Button>
        </div>
      )}

      {/* Các thẻ KPI thống kê nhanh */}
      <RefundStats
        pendingCount={pendingCount}
        completedCount={completedCount}
        rejectedCount={rejectedCount}
        totalCount={totalCount}
        isLoading={isStatsLoading}
        activeStatus={statusFilter}
        onStatusClick={handleKpiStatusClick}
      />

      {/* Bộ chọn Tab chính */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="pending" className="text-xs font-semibold gap-1.5 px-4 py-2">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Yêu cầu chờ xử lý</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="history" className="text-xs font-semibold gap-1.5 px-4 py-2">
            <History className="w-3.5 h-3.5 text-primary" />
            <span>Lịch sử hoàn tiền</span>
            <span className="ml-1 text-[11px] text-muted-foreground font-normal">
              ({formatNumber(completedCount + rejectedCount)})
            </span>
          </TabsTrigger>

          <TabsTrigger value="rules" className="text-xs font-semibold gap-1.5 px-4 py-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Quy tắc & Hướng dẫn đối chiếu</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Yêu cầu chờ xử lý */}
        <TabsContent value="pending" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Danh sách yêu cầu hoàn tiền đang chờ duyệt
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Quét mã QR ngân hàng hoặc chuyển khoản thủ công, sau đó tải ảnh biên lai và xác nhận
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary gap-1"
                  onClick={() => setIsRulesModalOpen(true)}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Đối chiếu quy tắc
                </Button>
              </div>

              <RefundTable
                statusFilter="PENDING"
                onStatusFilterChange={setStatusFilter}
                pendingCount={pendingCount}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Lịch sử hoàn tiền */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 pb-3 border-b">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Lịch sử hoàn tiền toàn hệ thống
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tra cứu lại các giao dịch đã hoàn tiền thành công hoặc bị từ chối, kèm mã giao dịch và ảnh minh chứng
                </p>
              </div>

              <RefundTable
                statusFilter={statusFilter === "PENDING" ? "ALL" : statusFilter}
                onStatusFilterChange={setStatusFilter}
                pendingCount={pendingCount}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Quy tắc hoàn tiền đối chiếu */}
        <TabsContent value="rules" className="space-y-4">
          <RefundRulesGuide />
        </TabsContent>
      </Tabs>

      {/* Modal xem nhanh Quy tắc hoàn tiền */}
      <Dialog open={isRulesModalOpen} onOpenChange={setIsRulesModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Quy tắc đối chiếu hoàn tiền cho các tình huống
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <RefundRulesGuide />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
