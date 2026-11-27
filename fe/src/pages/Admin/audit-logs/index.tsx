import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { TableToolbar } from "~/components/shared/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useGetActionLogsQuery } from "~/stores/apis/admin/auditLogs";
import { ActionLogTable } from "./components/ActionLogTable";

const ALL = "ALL";
const TARGET_TYPES = ["LOCKER", "BOX", "DRONE", "USER"] as const;
/** Nhóm hành động hay tra: mã kết thúc bằng `_` là tiền tố. */
const ACTION_GROUPS: Record<string, string> = {
  maintenance: "LOCKER_MAINTENANCE_ON,LOCKER_MAINTENANCE_BY_TICKET,LOCKER_ACTIVATED,LOCKER_DEACTIVATED",
  technician: "LOCKER_TECHNICIAN_,DRONE_TECHNICIAN_",
  boxes: "BOX_",
  landingPad: "LANDING_PAD_",
  drones: "DRONE_STATUS_CHANGED,DRONE_CREATED,DRONE_DELETED,DRONE_MOVED,DRONE_ENABLED,DRONE_DISABLED",
  accounts: "USER_",
  deleted: "LOCKER_DELETED,BOX_DELETED,DRONE_DELETED,USER_DELETED",
};
const ACTOR_FILTERS = ["people", "system"] as const;

/** Nhật ký thao tác (F3-G16): ai, lúc nào, làm gì — bật bảo trì, kích hoạt, gán KTV, khoá tài khoản, xoá… */
export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [targetType, setTargetType] = useState<string>(ALL);
  const [group, setGroup] = useState<string>(ALL);
  const [actor, setActor] = useState<string>(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Gõ xong một nhịp mới tìm, không gọi server mỗi phím.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPage(0), [query, targetType, group, actor, from, to]);

  const { data, isFetching, refetch } = useGetActionLogsQuery(
    {
      page,
      size: pageSize,
      q: query || undefined,
      targetType: targetType === ALL ? undefined : targetType,
      actions: group === ALL ? undefined : ACTION_GROUPS[group],
      actorUserId: actor === "system" ? 0 : actor === "people" ? -1 : undefined,
      from: from || undefined,
      to: to || undefined,
    },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const result = data?.data;
  const rows = result?.content ?? [];

  const hasFilters = Boolean(search || targetType !== ALL || group !== ALL || actor !== ALL || from || to);
  const clearFilters = () => {
    setSearch("");
    setTargetType(ALL);
    setGroup(ALL);
    setActor(ALL);
    setFrom("");
    setTo("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("admin.auditLogs.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("admin.auditLogs.description")} • {t("admin.auditLogs.countLabel", { count: result?.totalElements ?? 0 })}
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div data-tour="audit-logs-filters" className="flex flex-wrap items-center gap-3">
              <Input
                placeholder={t("admin.auditLogs.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 text-sm"
              />
              <Select value={group} onValueChange={setGroup}>
                <SelectTrigger className="h-9 w-48 text-sm">
                  <SelectValue placeholder={t("admin.auditLogs.filter.group")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("admin.auditLogs.filter.allGroups")}</SelectItem>
                  {Object.keys(ACTION_GROUPS).map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`admin.auditLogs.groups.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue placeholder={t("admin.auditLogs.filter.target")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("admin.auditLogs.filter.allTargets")}</SelectItem>
                  {TARGET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`admin.auditLogs.targetTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actor} onValueChange={setActor}>
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue placeholder={t("admin.auditLogs.filter.actor")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("admin.auditLogs.filter.allActors")}</SelectItem>
                  {ACTOR_FILTERS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`admin.auditLogs.filter.actors.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-36 text-sm"
                  aria-label={t("admin.auditLogs.filter.from")}
                />
                <span>–</span>
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-36 text-sm"
                  aria-label={t("admin.auditLogs.filter.to")}
                />
              </div>
            </div>
            <TableToolbar onRefresh={() => void refetch()} onClearFilters={clearFilters} canClearFilters={hasFilters} />
          </div>

          <div data-tour="audit-logs-table">
            <ActionLogTable
              rows={rows}
              isLoading={isFetching && !result}
              page={page}
              pageSize={pageSize}
              totalPages={result?.totalPages ?? 0}
              totalElements={result?.totalElements ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(0);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
