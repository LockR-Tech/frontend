import { useState } from "react";
import {
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plane,
  Box,
  Shirt,
  CreditCard,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useGetPublicBusinessSettingsQuery } from "~/stores/apis/admin/businessSettings";

interface ScenarioItem {
  id: string;
  title: string;
  icon: typeof Box;
  color: string;
  badge: string;
  refundRate: string;
  conditions: string[];
  evidence: string[];
  adminCheck: string[];
}

export function RefundRulesGuide() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>("locker-fault");
  const { data: paymentSettingsRes } = useGetPublicBusinessSettingsQuery("payment");
  const refundMaxDays = (paymentSettingsRes?.data?.["app.payment.refund-max-days"] as number) ?? 7;

  const scenarios: ScenarioItem[] = [
    {
      id: "locker-fault",
      title: t("admin.refunds.page.guide.scenarios.lockerFault.title"),
      icon: Box,
      color: "text-amber-600 bg-amber-500/10 border-amber-200 dark:border-amber-900/50",
      badge: t("admin.refunds.page.guide.scenarios.lockerFault.badge"),
      refundRate: t("admin.refunds.page.guide.scenarios.lockerFault.refundRate"),
      conditions: [
        t("admin.refunds.page.guide.scenarios.lockerFault.conditions.c1"),
        t("admin.refunds.page.guide.scenarios.lockerFault.conditions.c2"),
        t("admin.refunds.page.guide.scenarios.lockerFault.conditions.c3"),
      ],
      evidence: [
        t("admin.refunds.page.guide.scenarios.lockerFault.evidence.e1"),
        t("admin.refunds.page.guide.scenarios.lockerFault.evidence.e2"),
      ],
      adminCheck: [
        t("admin.refunds.page.guide.scenarios.lockerFault.adminCheck.a1"),
        t("admin.refunds.page.guide.scenarios.lockerFault.adminCheck.a2"),
      ],
    },
    {
      id: "drone-fault",
      title: t("admin.refunds.page.guide.scenarios.droneFault.title"),
      icon: Plane,
      color: "text-sky-600 bg-sky-500/10 border-sky-200 dark:border-sky-900/50",
      badge: t("admin.refunds.page.guide.scenarios.droneFault.badge"),
      refundRate: t("admin.refunds.page.guide.scenarios.droneFault.refundRate"),
      conditions: [
        t("admin.refunds.page.guide.scenarios.droneFault.conditions.c1"),
        t("admin.refunds.page.guide.scenarios.droneFault.conditions.c2"),
        t("admin.refunds.page.guide.scenarios.droneFault.conditions.c3"),
      ],
      evidence: [
        t("admin.refunds.page.guide.scenarios.droneFault.evidence.e1"),
        t("admin.refunds.page.guide.scenarios.droneFault.evidence.e2"),
      ],
      adminCheck: [
        t("admin.refunds.page.guide.scenarios.droneFault.adminCheck.a1"),
        t("admin.refunds.page.guide.scenarios.droneFault.adminCheck.a2"),
      ],
    },
    {
      id: "user-cancel",
      title: t("admin.refunds.page.guide.scenarios.userCancel.title"),
      icon: RotateCcw,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/50",
      badge: t("admin.refunds.page.guide.scenarios.userCancel.badge"),
      refundRate: t("admin.refunds.page.guide.scenarios.userCancel.refundRate"),
      conditions: [
        t("admin.refunds.page.guide.scenarios.userCancel.conditions.c1"),
        t("admin.refunds.page.guide.scenarios.userCancel.conditions.c2", { days: refundMaxDays }),
        t("admin.refunds.page.guide.scenarios.userCancel.conditions.c3"),
      ],
      evidence: [
        t("admin.refunds.page.guide.scenarios.userCancel.evidence.e1"),
        t("admin.refunds.page.guide.scenarios.userCancel.evidence.e2"),
      ],
      adminCheck: [
        t("admin.refunds.page.guide.scenarios.userCancel.adminCheck.a1"),
      ],
    },
    {
      id: "double-pay",
      title: t("admin.refunds.page.guide.scenarios.doublePay.title"),
      icon: CreditCard,
      color: "text-purple-600 bg-purple-500/10 border-purple-200 dark:border-purple-900/50",
      badge: t("admin.refunds.page.guide.scenarios.doublePay.badge"),
      refundRate: t("admin.refunds.page.guide.scenarios.doublePay.refundRate"),
      conditions: [
        t("admin.refunds.page.guide.scenarios.doublePay.conditions.c1"),
        t("admin.refunds.page.guide.scenarios.doublePay.conditions.c2"),
      ],
      evidence: [
        t("admin.refunds.page.guide.scenarios.doublePay.evidence.e1"),
        t("admin.refunds.page.guide.scenarios.doublePay.evidence.e2"),
      ],
      adminCheck: [
        t("admin.refunds.page.guide.scenarios.doublePay.adminCheck.a1"),
        t("admin.refunds.page.guide.scenarios.doublePay.adminCheck.a2"),
      ],
    },
    {
      id: "laundry-fault",
      title: t("admin.refunds.page.guide.scenarios.laundryFault.title"),
      icon: Shirt,
      color: "text-rose-600 bg-rose-500/10 border-rose-200 dark:border-rose-900/50",
      badge: t("admin.refunds.page.guide.scenarios.laundryFault.badge"),
      refundRate: t("admin.refunds.page.guide.scenarios.laundryFault.refundRate"),
      conditions: [
        t("admin.refunds.page.guide.scenarios.laundryFault.conditions.c1"),
        t("admin.refunds.page.guide.scenarios.laundryFault.conditions.c2"),
      ],
      evidence: [
        t("admin.refunds.page.guide.scenarios.laundryFault.evidence.e1"),
        t("admin.refunds.page.guide.scenarios.laundryFault.evidence.e2"),
      ],
      adminCheck: [
        t("admin.refunds.page.guide.scenarios.laundryFault.adminCheck.a1"),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Thẻ hướng dẫn nhanh */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background via-muted/20 to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <ShieldAlert className="w-5 h-5" />
            <CardTitle className="text-base font-semibold">
              {t("admin.refunds.page.guide.title")}
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            {t("admin.refunds.page.guide.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {/* Quy chuẩn 4 bước thực hiện chuyển khoản */}
          <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>{t("admin.refunds.page.guide.steps.title")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <span className="font-bold text-primary font-mono">{t("admin.refunds.page.guide.steps.step", { n: 1 })}</span>
                <p className="font-medium text-foreground">{t("admin.refunds.page.guide.steps.s1.title")}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("admin.refunds.page.guide.steps.s1.description")}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <span className="font-bold text-primary font-mono">{t("admin.refunds.page.guide.steps.step", { n: 2 })}</span>
                <p className="font-medium text-foreground">{t("admin.refunds.page.guide.steps.s2.title")}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("admin.refunds.page.guide.steps.s2.description")}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <span className="font-bold text-primary font-mono">{t("admin.refunds.page.guide.steps.step", { n: 3 })}</span>
                <p className="font-medium text-foreground">{t("admin.refunds.page.guide.steps.s3.title")}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("admin.refunds.page.guide.steps.s3.description")}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <span className="font-bold text-primary font-mono">{t("admin.refunds.page.guide.steps.step", { n: 4 })}</span>
                <p className="font-medium text-foreground">{t("admin.refunds.page.guide.steps.s4.title")}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("admin.refunds.page.guide.steps.s4.description")}
                </p>
              </div>
            </div>
          </div>

          {/* Ma trận các tình huống hoàn tiền */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("admin.refunds.page.guide.scenariosTitle")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("admin.refunds.page.guide.scenariosHint")}
              </span>
            </div>

            <div className="space-y-2.5">
              {scenarios.map((sc) => {
                const Icon = sc.icon;
                const isExpanded = expandedId === sc.id;

                return (
                  <div
                    key={sc.id}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? "bg-card border-primary/40 shadow-xs"
                        : "bg-card/60 hover:bg-card border-border/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : sc.id)}
                      className="w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border ${sc.color} shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {sc.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                              {sc.badge}
                            </Badge>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {t("admin.refunds.page.guide.refundRate", { rate: sc.refundRate })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-border/40 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-muted/10">
                        <div className="space-y-1.5 p-2.5 rounded-lg bg-card border border-border/50">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {t("admin.refunds.page.guide.conditionsTitle")}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                            {sc.conditions.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5 p-2.5 rounded-lg bg-card border border-border/50">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-blue-600" />
                            {t("admin.refunds.page.guide.evidenceTitle")}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                            {sc.evidence.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5 p-2.5 rounded-lg bg-card border border-border/50">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            {t("admin.refunds.page.guide.adminCheckTitle")}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                            {sc.adminCheck.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
