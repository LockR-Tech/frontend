import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { formatDateTime } from "~/lib/datetime";
import { useGetStationSuspensionLogsQuery } from "~/stores/apis/admin/droneFlightControl";
import { reasonLabel } from "./labels";

/** Ai dừng / mở lại trạm nào, lúc nào (100 lần gần nhất). */
export function SuspensionLogTable({ stationName }: { stationName: (lockerId: number | null) => string }) {
  const { t } = useTranslation();
  const { data, isFetching, isError } = useGetStationSuspensionLogsQuery({ limit: 100 });
  const rows = data?.data ?? [];

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">{t("admin.flightControl.logs.time")}</TableHead>
            <TableHead>{t("admin.flightControl.logs.station")}</TableHead>
            <TableHead>{t("admin.flightControl.logs.action")}</TableHead>
            <TableHead>{t("admin.flightControl.logs.reason")}</TableHead>
            <TableHead>{t("admin.flightControl.logs.until")}</TableHead>
            <TableHead>{t("admin.flightControl.logs.actor")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isError ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-red-700">
                {t("admin.flightControl.logs.loadFailed")}
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                {isFetching ? t("admin.flightControl.blocks.loading") : t("admin.flightControl.logs.empty")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-sm">{formatDateTime(row.createdAt)}</TableCell>
                <TableCell className="text-sm">{stationName(row.lockerId)}</TableCell>
                <TableCell className="text-sm">
                  {row.action === "SUSPEND" ? (
                    <span className="font-medium text-amber-800">{t("admin.flightControl.logs.suspend")}</span>
                  ) : (
                    <span className="font-medium text-emerald-700">{t("admin.flightControl.logs.resume")}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {reasonLabel(row.reason)}
                  {row.note ? <span className="block text-xs text-muted-foreground">“{row.note}”</span> : null}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {row.action === "SUSPEND"
                    ? row.resumeAt
                      ? formatDateTime(row.resumeAt)
                      : t("admin.flightControl.stations.untilManual")
                    : "—"}
                </TableCell>
                <TableCell className="text-sm">{row.actorUserId != null ? `#${row.actorUserId}` : "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
