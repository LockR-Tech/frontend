import { useNavigate } from "react-router-dom";
import { ArrowRight, Pencil } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { SettingInput } from "../../settings/SettingInput";
import {
  formatSettingValue,
  rangeHint,
  settingLabel,
} from "../../settings/setting-utils";
import type { SettingView } from "~/stores/apis/admin/businessSettings";
import { formatCurrency, formatNumber, formatPercent } from "~/lib/report-format";
import type { RevenueByServiceItem } from "~/types/admin/reporting";
import type { ServiceDefinition, ServiceRuleGroup } from "../service-catalog";

interface ServiceCardProps {
  service: ServiceDefinition;
  settingByKey: Map<string, SettingView>;
  valueOf: (key: string) => string;
  errorOf: (key: string) => string | null;
  onChange: (key: string, raw: string) => void;
  revenue: RevenueByServiceItem | undefined;
  isSettingsLoading: boolean;
  isRevenueFetching: boolean;
  disabled: boolean;
}

export function ServiceCard({
  service,
  settingByKey,
  valueOf,
  errorOf,
  onChange,
  revenue,
  isSettingsLoading,
  isRevenueFetching,
  disabled,
}: ServiceCardProps) {
  const navigate = useNavigate();
  const Icon = service.icon;
  const headline = settingByKey.get(service.headlineKey);

  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-5 space-y-5">
        {/* Tiêu đề + giá chính */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-secondary border border-border/60 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground leading-tight">
              {service.name}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {service.tagline} · mã loại đơn{" "}
              <span className="font-mono">{service.type}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            {isSettingsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <p className="text-xl font-bold text-foreground leading-tight">
                  {headline
                    ? formatSettingValue(headline, valueOf(service.headlineKey))
                    : "—"}
                </p>
                {service.headlineSuffix && (
                  <p className="text-[11px] text-muted-foreground">
                    {service.headlineSuffix}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {service.description}
        </p>

        {/* Hiệu quả trong kỳ */}
        <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Hiệu quả trong kỳ
          </p>
          {isRevenueFetching && !revenue ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Doanh thu" value={formatCurrency(revenue?.revenue)} />
              <Metric label="Tỉ trọng" value={formatPercent(revenue?.sharePct)} />
              <Metric label="Đơn tạo mới" value={formatNumber(revenue?.orderCount)} />
              <Metric
                label="Đơn thu được tiền"
                value={formatNumber(revenue?.paidOrderCount)}
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 mt-2 text-xs px-2"
            onClick={() => navigate(`/admin/orders?type=${service.type}`)}
          >
            Xem đơn của dịch vụ này
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {/* Quy tắc sửa được */}
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Pencil className="h-3 w-3" />
            Quy tắc áp dụng
          </p>
          {isSettingsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            service.ruleGroups.map((group) => (
              <RuleGroup
                key={group.title}
                group={group}
                settingByKey={settingByKey}
                valueOf={valueOf}
                errorOf={errorOf}
                onChange={onChange}
                disabled={disabled}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

interface RuleGroupProps {
  group: ServiceRuleGroup;
  settingByKey: Map<string, SettingView>;
  valueOf: (key: string) => string;
  errorOf: (key: string) => string | null;
  onChange: (key: string, raw: string) => void;
  disabled: boolean;
}

export function RuleGroup({
  group,
  settingByKey,
  valueOf,
  errorOf,
  onChange,
  disabled,
}: RuleGroupProps) {
  // Key backend chưa khai báo thì bỏ qua — trang không vỡ khi catalog hai bên lệch nhau.
  const settings = group.keys
    .map((key) => settingByKey.get(key))
    .filter((s): s is SettingView => s !== undefined);

  if (settings.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-foreground">{group.title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        {settings.map((setting) => {
          const id = `svc-${setting.key}`;
          const error = errorOf(setting.key);
          const hint = rangeHint(setting);
          return (
            <div key={setting.key} className="space-y-1">
              <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
                {settingLabel(setting)}
              </Label>
              <SettingInput
                id={id}
                setting={setting}
                value={valueOf(setting.key)}
                invalid={error !== null}
                disabled={disabled}
                onChange={(raw) => onChange(setting.key, raw)}
              />
              {error ? (
                <p className="text-[11px] text-destructive">{error}</p>
              ) : (
                hint && <p className="text-[11px] text-muted-foreground">{hint}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
