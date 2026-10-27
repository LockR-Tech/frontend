import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { OctagonPause, PlayCircle, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { formatDateTime } from "~/lib/datetime";
import {
  useGetFlightStationsQuery,
  useResumeStationMutation,
  useSuspendStationMutation,
} from "~/stores/apis/admin/droneFlightControl";
import type { DroneLockerWeather } from "~/stores/apis/admin/droneOrders";
import { WeatherSummary } from "../drone-orders/WeatherPanels";
import { getApiErrorMessage } from "../settings/setting-utils";
import { SUSPENSION_REASONS, reasonLabel, vietnamInputToUtc } from "./labels";

// Server nhớ dự báo 5 phút: làm mới mỗi 5 phút là đủ.
const REFRESH_MS = 5 * 60 * 1000;

function stationName(station: DroneLockerWeather): string {
  return station.name ?? station.code ?? `#${station.lockerId}`;
}

/** Thời tiết và lệnh dừng bay của từng trạm (tủ có bãi đáp). */
export function StationsSection({ stations }: { stations: ReturnType<typeof useGetFlightStationsQuery> }) {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, isError, refetch } = stations;
  const [resumeStation, { isLoading: resuming }] = useResumeStationMutation();
  const [target, setTarget] = useState<DroneLockerWeather | null>(null);
  const list = data?.data ?? [];

  const resume = async (station: DroneLockerWeather) => {
    try {
      await resumeStation(station.lockerId).unwrap();
      toast.success(t("admin.flightControl.stations.resumed", { name: stationName(station) }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.flightControl.stations.actionFailed")));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base">{t("admin.flightControl.stations.title")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.flightControl.stations.description")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-red-700">{t("admin.flightControl.stations.loadFailed")}</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.droneOrders.weather.noLockers")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((station) => (
              <div key={station.lockerId} className="flex flex-col gap-2 rounded-lg border p-3">
                <WeatherSummary weather={station.weather} title={stationName(station)} suspension={station.suspension} />
                {station.suspension ? (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {station.suspension.note ? <p>“{station.suspension.note}”</p> : null}
                    <p>
                      {t("admin.flightControl.stations.since", {
                        time: formatDateTime(station.suspension.suspendedAt),
                      })}
                      {station.suspension.resumeAt
                        ? ` · ${t("admin.flightControl.stations.until", {
                            time: formatDateTime(station.suspension.resumeAt),
                          })}`
                        : ` · ${t("admin.flightControl.stations.untilManual")}`}
                    </p>
                  </div>
                ) : null}
                <div className="mt-auto flex justify-end">
                  {station.suspension ? (
                    <Button size="sm" variant="outline" onClick={() => resume(station)} disabled={resuming}>
                      <PlayCircle className="h-4 w-4" />
                      {t("admin.flightControl.stations.resume")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500/40 text-amber-800 hover:bg-amber-500/10"
                      onClick={() => setTarget(station)}
                    >
                      <OctagonPause className="h-4 w-4" />
                      {t("admin.flightControl.stations.suspend")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <SuspendStationDialog station={target} onClose={() => setTarget(null)} />
    </Card>
  );
}

function SuspendStationDialog({ station, onClose }: { station: DroneLockerWeather | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [suspendStation, { isLoading }] = useSuspendStationMutation();
  const [reason, setReason] = useState<string>("WEATHER");
  const [note, setNote] = useState("");
  const [resumeAt, setResumeAt] = useState("");

  const close = () => {
    setReason("WEATHER");
    setNote("");
    setResumeAt("");
    onClose();
  };

  const submit = async () => {
    if (!station) return;
    try {
      await suspendStation({
        lockerId: station.lockerId,
        reason,
        note: note.trim() || null,
        resumeAt: vietnamInputToUtc(resumeAt),
      }).unwrap();
      toast.success(t("admin.flightControl.stations.suspended", { name: stationName(station) }));
      close();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.flightControl.stations.actionFailed")));
    }
  };

  return (
    <Dialog open={station != null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("admin.flightControl.suspendDialog.title", { name: station ? stationName(station) : "" })}
          </DialogTitle>
          <DialogDescription>{t("admin.flightControl.suspendDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("admin.flightControl.suspendDialog.reason")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUSPENSION_REASONS.map((code) => (
                  <SelectItem key={code} value={code}>
                    {reasonLabel(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suspend-note">{t("admin.flightControl.suspendDialog.note")}</Label>
            <Textarea
              id="suspend-note"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("admin.flightControl.suspendDialog.notePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("admin.flightControl.suspendDialog.noteHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suspend-resume">{t("admin.flightControl.suspendDialog.resumeAt")}</Label>
            <Input
              id="suspend-resume"
              type="datetime-local"
              value={resumeAt}
              onChange={(e) => setResumeAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("admin.flightControl.suspendDialog.resumeHint")}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button className="bg-amber-600 text-white hover:bg-amber-700" onClick={submit} disabled={isLoading}>
            <OctagonPause className="h-4 w-4" />
            {t("admin.flightControl.suspendDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { REFRESH_MS as STATIONS_REFRESH_MS };
