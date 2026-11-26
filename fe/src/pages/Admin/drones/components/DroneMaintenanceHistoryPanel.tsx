import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  History,
  Plane,
  RefreshCw,
  User,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { AppLoading } from "~/components/ui/app-loading";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  useGetAllAdminReportsQuery,
  useGetAllInspectionLogsQuery,
  useGetMaintenanceSchedulesQuery,
  type LockerReportResponse,
  type MaintenanceInspectionLogResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { extractList } from "~/lib/extract-list";
import { formatDateTime, parseBackendDateTime } from "~/lib/datetime";
import {
  cleanDescription,
  INSPECTION_STATUS_META,
} from "~/pages/Admin/maintenance/maintenancePhotos";
import { RepairLogDialog } from "~/pages/Admin/maintenance/RepairLogDialog";
import { InspectionChecklistResults } from "~/pages/Admin/maintenance/InspectionChecklistResults";

interface DroneMaintenanceHistoryPanelProps {
  droneId: number;
  droneCode?: string;
  /** Omit outer Card wrapper when embedded inside DroneDetailPage log card. */
  embedded?: boolean;
}

type HistoryFilter = "ALL" | "INCIDENT" | "SCHEDULE";

type UnifiedHistoryItem =
  | {
      kind: "INCIDENT";
      key: string;
      sortMs: number;
      report: LockerReportResponse;
    }
  | {
      kind: "SCHEDULE";
      key: string;
      sortMs: number;
      log: MaintenanceInspectionLogResponse;
      scheduleTitle: string;
    };

function toTimestamp(raw?: string | null): number {
  const parsed = parseBackendDateTime(raw);
  return parsed ? parsed.getTime() : 0;
}

const REPORT_STATUS_STYLE: Record<string, { labelKey: string; cls: string }> = {
  OPEN: {
    labelKey: "admin.lockers.logs.reports.open",
    cls: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  },
  IN_PROGRESS: {
    labelKey: "admin.lockers.logs.reports.inProgress",
    cls: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  RESOLVED: {
    labelKey: "admin.lockers.logs.reports.resolved",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  REJECTED: {
    labelKey: "admin.lockers.logs.reports.rejected",
    cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

/**
 * Displays unified repair & maintenance history for a single Drone, matching LockerMaintenanceHistoryPanel:
 * 1) Incident & maintenance tickets (`LockerReportResponse`) with repair logs, photos, and SLA/technician metadata
 * 2) Periodic maintenance inspections (`MaintenanceInspectionLogResponse`) with checklist results & photos
 */
export function DroneMaintenanceHistoryPanel({
  droneId,
  droneCode,
  embedded = false,
}: DroneMaintenanceHistoryPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const droneLabel = droneCode || `#${droneId}`;

  const [filter, setFilter] = useState<HistoryFilter>("ALL");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const {
    data: reportsData,
    isLoading: loadingReports,
    isFetching: fetchingReports,
    refetch: refetchReports,
  } = useGetAllAdminReportsQuery(undefined, { skip: !Number.isFinite(droneId) });

  const {
    data: inspectionsData,
    isLoading: loadingInspections,
    isFetching: fetchingInspections,
    refetch: refetchInspections,
  } = useGetAllInspectionLogsQuery({ droneUnitId: droneId }, { skip: !Number.isFinite(droneId) });

  const {
    data: schedulesData,
    isFetching: fetchingSchedules,
    refetch: refetchSchedules,
  } = useGetMaintenanceSchedulesQuery(undefined, { skip: !Number.isFinite(droneId) });

  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 });

  const userNames = useMemo(() => {
    const map: Record<number, string> = {};
    for (const u of extractList<any>(usersData?.data)) {
      if (u?.id != null) {
        map[u.id] = u.fullName || u.name || u.email || `#${u.id}`;
      }
    }
    return map;
  }, [usersData]);

  const scheduleTitles = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of schedulesData?.data ?? []) {
      map.set(s.id, s.title);
    }
    return map;
  }, [schedulesData]);

  const droneReports = useMemo(
    () => (reportsData?.data ?? []).filter((r) => r.droneUnitId === droneId),
    [reportsData, droneId],
  );

  const droneInspections = useMemo(
    () => (inspectionsData?.data ?? []).filter((log) => log.droneUnitId === droneId),
    [inspectionsData, droneId],
  );

  const timelineItems = useMemo<UnifiedHistoryItem[]>(() => {
    const items: UnifiedHistoryItem[] = [];

    for (const report of droneReports) {
      items.push({
        kind: "INCIDENT",
        key: `incident-${report.id}`,
        sortMs: toTimestamp(report.resolvedAt ?? report.updatedAt ?? report.createdAt),
        report,
      });
    }

    for (const log of droneInspections) {
      items.push({
        kind: "SCHEDULE",
        key: `inspection-${log.id}`,
        sortMs: toTimestamp(log.createdAt),
        log,
        scheduleTitle:
          scheduleTitles.get(log.scheduleId) ??
          t("admin.lockers.maintenanceHistory.scheduleFallback", { id: log.scheduleId }),
      });
    }

    items.sort((a, b) => b.sortMs - a.sortMs);
    return items;
  }, [droneReports, droneInspections, scheduleTitles, t]);

  const filteredItems = useMemo(() => {
    if (filter === "INCIDENT") return timelineItems.filter((i) => i.kind === "INCIDENT");
    if (filter === "SCHEDULE") return timelineItems.filter((i) => i.kind === "SCHEDULE");
    return timelineItems;
  }, [timelineItems, filter]);

  const openOrProgressCount = useMemo(
    () => droneReports.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length,
    [droneReports],
  );
  const resolvedCount = useMemo(
    () => droneReports.filter((r) => r.status === "RESOLVED").length,
    [droneReports],
  );

  const isLoading = loadingReports || loadingInspections;
  const isFetching = fetchingReports || fetchingInspections || fetchingSchedules;

  const handleRefresh = () => {
    void Promise.all([refetchReports(), refetchInspections(), refetchSchedules()]);
  };

  const resolveTechnicianName = (report: LockerReportResponse): string => {
    const techId = report.assignedToUserId ?? report.resolvedByUserId;
    if (techId != null) {
      return userNames[techId] ?? t("admin.drones.detail.tech.fallbackName", { id: techId });
    }
    if (report.routedToUserId != null) {
      return t("admin.lockers.maintenanceHistory.routedTo", {
        name:
          userNames[report.routedToUserId] ??
          t("admin.drones.detail.tech.fallbackName", { id: report.routedToUserId }),
      });
    }
    return t("common.unassigned");
  };

  const content = (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-tour="drone-maint-kpis">
        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground">
              {t("admin.lockers.maintenanceHistory.kpi.totalReports")}
            </div>
            <div className="text-xl font-bold mt-0.5">{droneReports.length}</div>
          </div>
          <Wrench className="w-7 h-7 text-amber-500 opacity-35" />
        </div>

        <div className="p-3 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
              {t("admin.lockers.maintenanceHistory.kpi.activeReports")}
            </div>
            <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-0.5">
              {openOrProgressCount}
            </div>
          </div>
          <AlertTriangle className="w-7 h-7 text-rose-500 opacity-35" />
        </div>

        <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              {t("admin.lockers.maintenanceHistory.kpi.resolvedReports")}
            </div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
              {resolvedCount}
            </div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-500 opacity-35" />
        </div>

        <div className="p-3 rounded-lg bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-sky-700 dark:text-sky-400">
              {t("admin.lockers.maintenanceHistory.kpi.inspections")}
            </div>
            <div className="text-xl font-bold text-sky-700 dark:text-sky-400 mt-0.5">
              {droneInspections.length}
            </div>
          </div>
          <ClipboardCheck className="w-7 h-7 text-sky-500 opacity-35" />
        </div>
      </div>

      {/* Filter pills + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs"
          data-tour="drone-maint-filters"
        >
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              filter === "ALL"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("admin.lockers.maintenanceHistory.filterAll", {
              count: timelineItems.length,
            })}
          </button>
          <button
            type="button"
            onClick={() => setFilter("INCIDENT")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              filter === "INCIDENT"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("admin.lockers.maintenanceHistory.filterIncidents", {
              count: droneReports.length,
            })}
          </button>
          <button
            type="button"
            onClick={() => setFilter("SCHEDULE")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              filter === "SCHEDULE"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("admin.lockers.maintenanceHistory.filterInspections", {
              count: droneInspections.length,
            })}
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          {t("button.refresh")}
        </Button>
      </div>

      {/* Timeline list */}
      {isLoading ? (
        <AppLoading className="py-10" message={t("admin.lockers.maintenanceHistory.loading")} />
      ) : filteredItems.length === 0 ? (
        <div
          className="py-12 text-center text-xs text-muted-foreground border rounded-lg border-dashed"
          data-tour="drone-maint-list"
        >
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
          {t("admin.drones.maintenanceHistory.empty")}
        </div>
      ) : (
        <div className="space-y-2.5" data-tour="drone-maint-list">
          {filteredItems.map((item) => {
            if (item.kind === "INCIDENT") {
              const report = item.report;
              const statusMeta = REPORT_STATUS_STYLE[report.status] ?? REPORT_STATUS_STYLE.OPEN;
              const techName = resolveTechnicianName(report);
              const cleanDesc = cleanDescription(report.description) || report.description;
              const isMaintenanceTicket = report.ticketType === "DRONE_MAINTENANCE";

              return (
                <div
                  key={item.key}
                  className="rounded-lg border border-border/80 bg-card p-3.5 space-y-2 hover:border-border transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                        >
                          RPT-{report.id}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            isMaintenanceTicket
                              ? "text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              : "text-[10px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          }
                        >
                          {isMaintenanceTicket
                            ? t("admin.drones.maintenanceHistory.maintenanceTicketBadge")
                            : t("admin.drones.maintenanceHistory.incidentTicketBadge")}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${statusMeta.cls}`}>
                          {t(statusMeta.labelKey)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] inline-flex items-center gap-1">
                          <Plane className="w-2.5 h-2.5" />
                          {report.droneCode || droneLabel}
                        </Badge>
                      </div>

                      <p className="text-sm font-semibold text-foreground break-words">
                        {report.title || `RPT-${report.id}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <RepairLogDialog
                        reportId={report.id}
                        title={`RPT-${report.id} · ${report.title}`}
                        technicianName={techName}
                        report={report}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary"
                        title={t("admin.lockers.logs.reports.openReport", { id: report.id })}
                        onClick={() => navigate(`/admin/maintenance?reportId=${report.id}`)}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        {t("admin.lockers.maintenanceHistory.openInMaintenance")}
                      </Button>
                    </div>
                  </div>

                  {cleanDesc && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line break-words">
                      {cleanDesc}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {t("admin.lockers.maintenanceHistory.technicianLabel")}{" "}
                      <span className="font-medium text-foreground">{techName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {t("admin.lockers.maintenanceHistory.createdAt")}{" "}
                      <span className="font-mono text-foreground">{formatDateTime(report.createdAt)}</span>
                    </span>
                    {report.resolvedAt && (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {t("admin.lockers.maintenanceHistory.resolvedAt")}{" "}
                        <span className="font-mono text-foreground">{formatDateTime(report.resolvedAt)}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            const { log, scheduleTitle } = item;
            const statusMeta = INSPECTION_STATUS_META[log.status];
            const techName =
              log.technicianName ||
              (log.technicianId
                ? userNames[log.technicianId] ??
                  t("admin.drones.detail.tech.fallbackName", { id: log.technicianId })
                : "—");
            const photos = log.photoUrls ?? [];

            return (
              <div
                key={item.key}
                className="rounded-lg border border-border/80 bg-card p-3.5 space-y-2.5 hover:border-border transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                      >
                        {t("admin.lockers.maintenanceHistory.periodicBadge")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          statusMeta?.cls ?? "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {statusMeta?.label ?? log.status}
                      </Badge>
                      {log.createdReportId && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-[11px] font-semibold text-rose-700 dark:text-rose-400"
                          onClick={() =>
                            navigate(`/admin/maintenance?reportId=${log.createdReportId}`)
                          }
                        >
                          {t("admin.lockers.maintenanceHistory.linkedReport", {
                            id: log.createdReportId,
                          })}
                        </Button>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-foreground break-words">
                      {scheduleTitle}
                    </p>
                  </div>
                </div>

                {log.note && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line break-words">
                    {log.note}
                  </p>
                )}

                {log.checklistResults && (
                  <div className="rounded-md border border-border/60 bg-muted/25 p-2.5">
                    <InspectionChecklistResults raw={log.checklistResults} />
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {photos.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setPreviewPhoto(url)}
                        className="group relative h-14 w-14 overflow-hidden rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary/50"
                      >
                        <img
                          src={url}
                          alt={t("admin.lockers.maintenanceHistory.inspectionPhotoAlt", {
                            index: idx + 1,
                          })}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {t("admin.lockers.maintenanceHistory.technicianLabel")}{" "}
                    <span className="font-medium text-foreground">{techName}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    {t("admin.lockers.maintenanceHistory.completedAt")}{" "}
                    <span className="font-mono text-foreground">{formatDateTime(log.createdAt)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(previewPhoto)} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>{t("admin.lockers.maintenanceHistory.photoPreviewTitle")}</DialogTitle>
          {previewPhoto && (
            <img
              src={previewPhoto}
              alt={t("admin.lockers.maintenanceHistory.photoPreviewTitle")}
              className="max-h-[75vh] w-full rounded-lg object-contain bg-muted/30"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) return content;

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <History className="w-4 h-4 text-amber-600" />
          {t("admin.drones.maintenanceHistory.title", { drone: droneLabel })}
        </CardTitle>
        <CardDescription className="text-xs mt-0.5">
          {t("admin.drones.maintenanceHistory.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">{content}</CardContent>
    </Card>
  );
}
