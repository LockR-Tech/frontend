import { AlertTriangle, RotateCcw, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "~/components/shared/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  DateRangeFilter,
  ReportErrorState,
} from "~/components/shared/reporting";
import { formatCurrency } from "~/lib/report-format";
import { ServiceCard, RuleGroup } from "./components/ServiceCard";
import { SERVICE_CATALOG, SHARED_RULE_GROUP } from "./service-catalog";
import { useServices } from "./hooks/useServices";

/// Quản lý ba dịch vụ đang bán: gửi hàng, thuê ô theo giờ, giao bằng drone.
///
/// Dịch vụ không phải bản ghi trong cơ sở dữ liệu — mỗi dịch vụ là một loại đơn, giá
/// và quy tắc nằm ở `system_settings` của order-service. Nên trang này sửa quy tắc và
/// xem hiệu quả, chứ không thêm/xoá dịch vụ.
export default function ServicesPage() {
  const { t } = useTranslation();
  const {
    range,
    setRange,
    settingByKey,
    valueOf,
    errorOf,
    setDraft,
    isSettingsLoading,
    settingsError,
    revenueByType,
    overtimeRevenue,
    totalRevenue,
    isRevenueFetching,
    revenueError,
    dirtyCount,
    hasInvalid,
    isSaving,
    save,
    resetDrafts,
    refetch,
  } = useServices();

  // Quy tắc dùng chung — để riêng cho khỏi lặp ba lần ở ba thẻ dịch vụ.
  const sharedRulesCard = (
    <Card className="border border-border bg-card" data-tour="services-shared">
      <CardContent className="p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground leading-tight">
            {t("admin.services.sharedRules")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {t("admin.services.sharedRulesHint")}
          </p>
        </div>
        <RuleGroup
          group={SHARED_RULE_GROUP}
          settingByKey={settingByKey}
          valueOf={valueOf}
          errorOf={errorOf}
          onChange={setDraft}
          disabled={isSaving}
        />

        {/* Phí quá hạn được backend tách khỏi doanh thu loại đơn để không đếm hai lần. */}
        {overtimeRevenue && (
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("admin.services.overtimeCollected")}
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {formatCurrency(overtimeRevenue.revenue)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("admin.services.overtimeHint")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={t("admin.services.title")}
        description={t("admin.services.description")}
      />

      {settingsError && (
        <ReportErrorState
          error={settingsError}
          onRetry={refetch}
          title={t("admin.services.rulesLoadFailed")}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3" data-tour="services-range">
        <DateRangeFilter value={range} onChange={setRange} />
        <p className="text-[11px] text-muted-foreground shrink-0">
          {t("admin.services.totalRevenue", { amount: formatCurrency(totalRevenue) })}
        </p>
      </div>

      {revenueError && (
        <ReportErrorState
          error={revenueError}
          onRetry={refetch}
          title={t("admin.services.revenueLoadFailed")}
        />
      )}

      {/* Hai cột độc lập (không dùng một lưới chung) để thẻ ngắn không để lại khoảng trống dưới nó:
          cột trái Gửi hàng + Thuê ô, cột phải Giao drone + Quy tắc chung. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        {[SERVICE_CATALOG.slice(0, 2), SERVICE_CATALOG.slice(2)].map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-5 min-w-0">
            {column.map((service) => (
              <ServiceCard
                key={service.type}
                tourAnchors={service.type === SERVICE_CATALOG[0].type}
                service={service}
                settingByKey={settingByKey}
                valueOf={valueOf}
                errorOf={errorOf}
                onChange={setDraft}
                revenue={revenueByType.get(service.type)}
                isSettingsLoading={isSettingsLoading}
                isRevenueFetching={isRevenueFetching}
                disabled={isSaving}
              />
            ))}
            {columnIndex === 1 && sharedRulesCard}
          </div>
        ))}
      </div>


      {/* Thanh lưu, chỉ hiện khi có thay đổi chưa lưu. */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur px-6 py-3" data-tour="services-save-bar">
          <div className="flex flex-wrap items-center gap-3 justify-end max-w-(--breakpoint-2xl) mx-auto">
            {hasInvalid && (
              <span className="text-xs text-destructive flex items-center gap-1.5 mr-auto">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("admin.services.invalidValues")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {t("admin.services.unsavedCount", { count: dirtyCount })}
            </span>
            <Button variant="outline" size="sm" onClick={resetDrafts} disabled={isSaving}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("admin.services.discard")}
            </Button>
            <Button size="sm" onClick={save} disabled={isSaving || hasInvalid}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {isSaving ? t("admin.services.saving") : t("common.saveChanges")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
