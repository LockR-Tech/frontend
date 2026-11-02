import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createColumnHelper } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/shared/data-table";
import { MetaBadge, deliveryStageMeta } from "~/components/shared/reporting";
import { Coordinates } from "~/components/shared/Coordinates";
import { formatDateTime } from "~/lib/datetime";
import type { DroneFlightTrackPoint } from "~/stores/apis/admin/droneOrders";

const column = createColumnHelper<DroneFlightTrackPoint>();

const fixed = (value: number | null, digits: number) => (value == null ? "—" : value.toFixed(digits));

function downloadCsv(orderCode: string, points: DroneFlightTrackPoint[]) {
  const header = "recorded_at,stage,latitude,longitude,altitude_m,heading_deg,speed_mps,battery_percent,drone_code,source";
  const rows = points.map((p) =>
    [p.recordedAt, p.stage, p.latitude, p.longitude, p.altitudeM, p.headingDeg, p.speedMps, p.batteryPercent, p.droneCode, p.source]
      .map((value) => (value == null ? "" : String(value)))
      .join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${orderCode}-duong-bay.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Nhật ký vị trí bay đã lưu: mỗi dòng là vị trí drone lúc đó, mới nhất trước. */
export function DroneFlightTrackPanel({
  orderCode,
  points,
  isLoading,
}: {
  orderCode: string;
  points: DroneFlightTrackPoint[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const newestFirst = [...points].reverse();

  const columns = [
    column.accessor("recordedAt", {
      header: t("admin.droneOrders.flightTrack.time"),
      cell: ({ row }) => <span className="whitespace-nowrap font-mono text-xs">{formatDateTime(row.original.recordedAt)}</span>,
    }),
    column.accessor("stage", {
      header: t("admin.droneOrders.flightTrack.stage"),
      cell: ({ row }) => <MetaBadge meta={deliveryStageMeta(row.original.stage)} hideIcon />,
    }),
    column.display({
      id: "coordinates",
      header: t("admin.droneOrders.flightTrack.coordinates"),
      cell: ({ row }) => <Coordinates lat={row.original.latitude} lng={row.original.longitude} />,
    }),
    column.accessor("altitudeM", {
      header: t("admin.droneOrders.flightTrack.altitude"),
      cell: ({ row }) => fixed(row.original.altitudeM, 1),
    }),
    column.accessor("speedMps", {
      header: t("admin.droneOrders.flightTrack.speed"),
      cell: ({ row }) => fixed(row.original.speedMps, 1),
    }),
    column.accessor("batteryPercent", {
      header: t("admin.droneOrders.flightTrack.battery"),
      cell: ({ row }) => (row.original.batteryPercent == null ? "—" : `${row.original.batteryPercent}%`),
    }),
    column.accessor("source", {
      header: t("admin.droneOrders.flightTrack.source"),
      cell: ({ row }) =>
        row.original.source === "DRONE"
          ? t("admin.droneOrders.flightTrack.sourceDrone")
          : t("admin.droneOrders.flightTrack.sourceSimulated"),
    }),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {points.length > 0
            ? t("admin.droneOrders.flightTrack.summary", { count: points.length })
            : t("admin.droneOrders.flightTrack.empty")}
        </p>
        {points.length > 0 && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadCsv(orderCode, points)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {t("admin.droneOrders.flightTrack.downloadCsv")}
          </Button>
        )}
      </div>
      {points.length > 0 && (
        <DataTable
          columns={columns as never}
          data={newestFirst.slice(page * pageSize, (page + 1) * pageSize)}
          isLoading={isLoading}
          serverPagination={{
            pageIndex: page,
            pageSize,
            pageCount: Math.max(1, Math.ceil(points.length / pageSize)),
            totalRows: points.length,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(0);
            },
          }}
        />
      )}
    </div>
  );
}
