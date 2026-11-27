import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  History,
  RefreshCw,
  User,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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
  type MaintenanceScheduleResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { extractList } from "~/lib/extract-list";
import { formatDateTime } from "~/lib/datetime";
import { parseBackendDateTime } from "~/lib/datetime";
import {
  cleanDescription,
  INSPECTION_STATUS_META,
} from "~/pages/Admin/maintenance/maintenancePhotos";
import { RepairLogDialog } from "~/pages/Admin/maintenance/RepairLogDialog";
import { InspectionChecklistResults } from "~/pages/Admin/maintenance/InspectionChecklistResults";

interface LockerMaintenanceHistoryPanelProps {
  lockerId: number;
  lockerCode?: string;
  /** Omit outer Card wrapper when embedded inside LockerLogsPanel sub-tab. */
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
    }
  | {
      kind: "ACTIVE_SCHEDULE";
      key: string;
      sortMs: number;
      schedule: MaintenanceScheduleResponse;
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
 * Displays unified repair & maintenance history for a single Kiosk:
 * 1) Incident reports (`LockerReportResponse`) with repair logs, photos, and SLA/technician metadata
 * 2) Periodic maintenance inspections (`MaintenanceInspectionLogResponse`) with checklist results & photos
 */
export function LockerMaintenanceHistoryPanel({
  lockerId,
  lockerCode,
  embedded = false,
}: LockerMaintenanceHistoryPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lockerLabel = lockerCode || `#${lockerId}`;

  const [filter, setFilter] = useState<HistoryFilter>("ALL");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const {
    data: reportsData,
    isLoading: loadingReports,
    isFetching: fetchingReports,
    refetch: refetchReports,
  } = useGetAllAdminReportsQuery(undefined, { skip: !Number.isFinite(lockerId) });

  const {
    data: inspectionsData,
    isLoading: loadingInspections,
    isFetching: fetchingInspections,
    refetch: refetchInspections,
  } = useGetAllInspectionLogsQuery({ lockerId }, { skip: !Number.isFinite(lockerId) });

  const {
    data: schedulesData,
    isFetching: fetchingSchedules,
    refetch: refetchSchedules,
  } = useGetMaintenanceSchedulesQuery(undefined, { skip: !Number.isFinite(lockerId) });

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

  const kioskReports = useMemo(
    () =>
      (reportsData?.data ?? []).filter(
        (r) => r.lockerId === lockerId && r.droneUnitId == null && r.category !== "DRONE"
      ),
    [reportsData, lockerId]
  );

  const kioskInspections = useMemo(
    () =>
      (inspectionsData?.data ?? []).filter(
        (log) => (log.lockerId == null || log.lockerId === lockerId) && log.droneUnitId == null
      ),
    [inspectionsData, lockerId]
  );

  const kioskActiveSchedules = useMemo(
    () =>
      (schedulesData?.data ?? []).filter(
        (s) => s.lockerId === lockerId && s.droneUnitId == null && s.active !== false
      ),
    [schedulesData, lockerId]
  );

  const timelineItems = useMemo<UnifiedHistoryItem[]>(() => {
    const items: UnifiedHistoryItem[] = [];

    for (const report of kioskReports) {
      items.push({
        kind: "INCIDENT",
        key: `incident-${report.id}`,
        sortMs: toTimestamp(report.resolvedAt ?? report.updatedAt ?? report.createdAt),
        report,
      });
    }

    for (const schedule of kioskActiveSchedules) {
      items.push({
        kind: "ACTIVE_SCHEDULE",
        key: `schedule-${schedule.id}`,
        sortMs: toTimestamp(schedule.updatedAt ?? schedule.createdAt ?? schedule.nextDueAt),
        schedule,
      });
    }

    for (const log of kioskInspections) {
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
  }, [kioskReports, kioskActiveSchedules, kioskInspections, scheduleTitles, t]);

  const filteredItems = useMemo(() => {
    if (filter === "INCIDENT") return timelineItems.filter((i) => i.kind === "INCIDENT");
    if (filter === "SCHEDULE") {
      return timelineItems.filter((i) => i.kind === "SCHEDULE" || i.kind === "ACTIVE_SCHEDULE");
    }
    return timelineItems;
  }, [timelineItems, filter]);

  const openOrProgressCount = useMemo(
    () => kioskReports.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length,
    [kioskReports]
  );
  const resolvedCount = useMemo(
    () => kioskReports.filter((r) => r.status === "RESOLVED").length,
    [kioskReports]
  );

  const isLoading = loadingReports || loadingInspections;
  const isFetching = fetchingReports || fetchingInspections || fetchingSchedules;

  const handleRefresh = () => {
    void Promise.all([refetchReports(), refetchInspections(), refetchSchedules()]);
  };

  const resolveTechnicianName = (report: LockerReportResponse): string => {
    const techId = report.assignedToUserId ?? report.resolvedByUserId;
    if (techId != null) {
      return userNames[techId] ?? t("admin.lockers.table.technicianId", { id: techId });
    }
    if (report.routedToUserId != null) {
      return t("admin.lockers.maintenanceHistory.routedTo", {
        name:
          userNames[report.routedToUserId] ??
          t("admin.lockers.table.technicianId", { id: report.routedToUserId }),
      });
    }
    return t("common.unassigned");
  };

  const content = (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-tour="adm-locker-maint-kpis">
        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground">
              {t("admin.lockers.maintenanceHistory.kpi.totalReports")}
            </div>
            <div className="text-xl font-bold mt-0.5">{kioskReports.length}</div>
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
              {kioskInspections.length}
            </div>
          </div>
          <ClipboardCheck className="w-7 h-7 text-sky-500 opacity-35" />
        </div>
      </div>

      {/* Filter pills + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs" data-tour="adm-locker-maint-filters">
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
              count: kioskReports.length,
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
              count: kioskInspections.length + kioskActiveSchedules.length,
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
        <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg border-dashed" data-tour="adm-locker-maint-list">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
          {t("admin.lockers.maintenanceHistory.empty")}
        </div>
      ) : (
        <div className="space-y-2.5" data-tour="adm-locker-maint-list">
          {filteredItems.map((item) => {
            if (item.kind === "INCIDENT") {
              const report = item.report;
              const statusMeta = REPORT_STATUS_STYLE[report.status] ?? REPORT_STATUS_STYLE.OPEN;
              const techName = resolveTechnicianName(report);
              const cleanDesc = cleanDescription(report.description) || report.description;

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
                        {report.boxNumber != null && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            {t("admin.lockers.boxLabel", { number: report.boxNumber })}
                          </Badge>
                        )}
                        {report.blocksLocker && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            {t("admin.lockers.maintenanceHistory.blockingBadge")}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${statusMeta.cls}`}>
                          {t(statusMeta.labelKey)}
                        </Badge>
                        {report.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {t(`admin.lockers.maintenanceHistory.category.${report.category}`, {
                              defaultValue: report.category,
                            })}
                          </Badge>
                        )}
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

            if (item.kind === "ACTIVE_SCHEDULE") {
              const s = item.schedule;
              const techName =
                s.assignedTechnicianName ||
                (s.assignedTechnicianId
                  ? userNames[s.assignedTechnicianId] ??
                    t("admin.lockers.table.technicianId", { id: s.assignedTechnicianId })
                  : t("common.unassigned"));
              return (
                <div
                  key={item.key}
                  className="rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10 p-3.5 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                        >
                          {t("admin.lockers.maintenanceHistory.scheduledBadge")}
                        </Badge>
                        {s.due && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            {t("admin.lockers.maintenanceHistory.dueBadge")}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {(s.intervalDays ?? 0) <= 0
                            ? t("admin.lockers.maintenanceDialog.oneTimeOption")
                            : t("admin.maintenance.schedules.labels.everyDays", { days: s.intervalDays })}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground break-words">
                        {s.title}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary shrink-0"
                      onClick={() => navigate("/admin/maintenance?tab=schedules&subTab=kiosk")}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      {t("admin.lockers.maintenanceHistory.openInScheduleTab")}
                    </Button>
                  </div>
                  {s.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line break-words">
                      {s.description}
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
                      {t("admin.maintenance.schedules.list.dueAt")}{" "}
                      <span className="font-mono text-foreground">{formatDateTime(s.nextDueAt)}</span>
                    </span>
                  </div>
                </div>
              );
            }

            // Periodic maintenance inspection log
            const { log, scheduleTitle } = item;
            const statusMeta = INSPECTION_STATUS_META[log.status];
            const techName =
              log.technicianName ||
              (log.technicianId
                ? userNames[log.technicianId] ??
                  t("admin.lockers.table.technicianId", { id: log.technicianId })
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
          {t("admin.lockers.maintenanceHistory.title", { locker: lockerLabel })}
        </CardTitle>
        <CardDescription className="text-xs mt-0.5">
          {t("admin.lockers.maintenanceHistory.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">{content}</CardContent>
    </Card>
  );
}
