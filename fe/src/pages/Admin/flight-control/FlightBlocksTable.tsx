import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { StandalonePagination } from "~/components/shared/data-table/DataTablePagination";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { formatDateTime } from "~/lib/datetime";
import { useGetFlightBlocksQuery, type DroneFlightBlock } from "~/stores/apis/admin/droneFlightControl";
import { BLOCK_ACTIONS, BLOCK_CAUSES, actionLabel, causeLabel, causeTone } from "./labels";

const ALL = "ALL";

/** Lịch sử chặn bay: đơn nào bị chặn vì thời tiết hoặc lệnh dừng, lúc nào, ở bước nào. */
export function FlightBlocksTable({ stationName }: { stationName: (lockerId: number | null) => string }) {
  const { t } = useTranslation();
  const [cause, setCause] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [orderCode, setOrderCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const { data, isFetching, isError, refetch } = useGetFlightBlocksQuery({
    cause: cause === ALL ? undefined : cause,
    action: action === ALL ? undefined : action,
    orderCode: orderCode.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    size,
  });
  const result = data?.data;
  const rows = result?.content ?? [];
  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <Select value={cause} onValueChange={resetPage(setCause)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("admin.flightControl.blocks.allCauses")}</SelectItem>
            {BLOCK_CAUSES.map((code) => (
              <SelectItem key={code} value={code}>
                {causeLabel(code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={resetPage(setAction)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("admin.flightControl.blocks.allActions")}</SelectItem>
            {BLOCK_ACTIONS.map((code) => (
              <SelectItem key={code} value={code}>
                {actionLabel(code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="h-9"
          value={orderCode}
          onChange={(e) => resetPage(setOrderCode)(e.target.value)}
          placeholder={t("admin.flightControl.blocks.orderCode")}
          aria-label={t("admin.flightControl.blocks.orderCode")}
        />
        <Input
          className="h-9"
          type="date"
          value={from}
          onChange={(e) => resetPage(setFrom)(e.target.value)}
          aria-label={t("admin.flightControl.blocks.from")}
        />
        <Input
          className="h-9"
          type="date"
          value={to}
          onChange={(e) => resetPage(setTo)(e.target.value)}
          aria-label={t("admin.flightControl.blocks.to")}
        />
        <Button variant="ghost" size="sm" className="h-9" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">{t("admin.flightControl.blocks.time")}</TableHead>
              <TableHead>{t("admin.flightControl.blocks.cause")}</TableHead>
              <TableHead>{t("admin.flightControl.blocks.step")}</TableHead>
              <TableHead>{t("admin.flightControl.blocks.order")}</TableHead>
              <TableHead>{t("admin.flightControl.blocks.route")}</TableHead>
              <TableHead className="min-w-64">{t("admin.flightControl.blocks.detail")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-red-700">
                  {t("admin.flightControl.blocks.loadFailed")}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  {isFetching ? t("admin.flightControl.blocks.loading") : t("admin.flightControl.blocks.empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => <BlockRow key={row.id} row={row} stationName={stationName} />)
            )}
          </TableBody>
        </Table>
      </div>

      {result && result.totalElements > 0 ? (
        <StandalonePagination
          pageIndex={result.page}
          pageSize={result.size}
          pageCount={result.totalPages}
          totalRows={result.totalElements}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setSize(next);
            setPage(0);
          }}
        />
      ) : null}
    </div>
  );
}

function BlockRow({ row, stationName }: { row: DroneFlightBlock; stationName: (lockerId: number | null) => string }) {
  const { t } = useTranslation();
  const weather = [
    row.maxWindSpeedKmh != null ? t("admin.droneOrders.weather.wind", { value: Math.round(row.maxWindSpeedKmh) }) : null,
    row.maxWindGustKmh != null ? t("admin.droneOrders.weather.gust", { value: Math.round(row.maxWindGustKmh) }) : null,
    row.maxPrecipitationMm != null
      ? t("admin.droneOrders.weather.rain", { value: row.maxPrecipitationMm.toFixed(1) })
      : null,
  ].filter(Boolean);
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(row.createdAt)}</TableCell>
      <TableCell>
        <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${causeTone(row.cause)}`}>
          {causeLabel(row.cause)}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">{actionLabel(row.action)}</TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {row.orderId ? (
          <Link className="font-medium text-primary hover:underline" to={`/admin/drone-orders/${row.orderId}`}>
            {row.orderCode ?? `#${row.orderId}`}
          </Link>
        ) : (
          <span className="text-muted-foreground">{t("admin.flightControl.blocks.notCreated")}</span>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {stationName(row.sourceLockerId)} → {stationName(row.destinationLockerId)}
        {row.blockedLockerId ? (
          <span className="block text-xs text-amber-800">
            {t("admin.flightControl.blocks.blockedStation", { name: stationName(row.blockedLockerId) })}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-sm">
        <p>{row.message ?? "—"}</p>
        {weather.length > 0 ? <p className="text-xs text-muted-foreground">{weather.join(" · ")}</p> : null}
      </TableCell>
    </TableRow>
  );
}
