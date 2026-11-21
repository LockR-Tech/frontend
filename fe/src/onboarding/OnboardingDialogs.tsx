import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Switch } from "~/components/ui/switch";
import { getRoleLabel } from "~/constants/roles";
import { groupStatus, runnable as canRun, TOUR_ROLES, type GroupStatus, type TourGroup } from "./engine";
import { TOUR_NS } from "./content";

function StatusBadge({ status }: { status: GroupStatus }) {
  const { t } = useTranslation();
  if (status === "seen") return <Badge variant="outline">{t("onboarding.status.seen")}</Badge>;
  return (
    <Badge variant={status === "new" ? "default" : "secondary"}>
      {t(status === "new" ? "onboarding.status.new" : "onboarding.status.updated")}
    </Badge>
  );
}

function GroupLine({ group, status }: { group: TourGroup; status?: GroupStatus }) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{t(`${TOUR_NS}:groups.${group.id}.title`)}</span>
        {status && <StatusBadge status={status} />}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{t(`${TOUR_NS}:groups.${group.id}.summary`)}</p>
    </div>
  );
}

interface FirstProps {
  open: boolean;
  name: string;
  groups: TourGroup[];
  onSkip: () => void;
  onSkipForever: () => void;
  onStart: (groups: TourGroup[]) => void;
  onChoose: () => void;
}

/** Lần đầu: "Chào <tên>" với Bỏ qua / Bỏ qua vĩnh viễn / Xem hướng dẫn (+ tự chọn nhóm). */
export function WelcomeDialog({ open, name, groups, onSkip, onSkipForever, onStart, onChoose }: FirstProps) {
  const { t } = useTranslation();
  const startRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onSkip()}>
      <DialogContent
        className="max-w-md"
        data-testid="tour-welcome"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          startRef.current?.focus();
        }}
      >
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles size={20} />
          </div>
          <DialogTitle>{t("onboarding.welcome.title", { name })}</DialogTitle>
          <DialogDescription>{t("onboarding.welcome.body", { count: groups.length })}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5 text-sm">
          {groups.map((g, i) => (
            <li key={g.id} className="flex gap-2">
              <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
              <span>{t(`${TOUR_NS}:groups.${g.id}.title`)}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="self-start text-xs text-primary underline-offset-2 hover:underline" onClick={onChoose}>
          {t("onboarding.welcome.choose")}
        </button>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onSkipForever}>{t("onboarding.welcome.skipForever")}</Button>
          <Button variant="outline" onClick={onSkip}>{t("onboarding.welcome.skip")}</Button>
          <Button ref={startRef} onClick={() => onStart(groups)}>{t("onboarding.welcome.start")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Đã xem trước đó: chỉ liệt kê nhóm mới hoặc vừa tăng phiên bản. */
export function WhatsNewDialog({
  open, groups, seen, onSkip, onSkipForever, onStart,
}: Omit<FirstProps, "name" | "onChoose"> & { seen: Record<string, number> }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onSkip()}>
      <DialogContent className="max-w-md" data-testid="tour-whats-new">
        <DialogHeader>
          <DialogTitle>{t("onboarding.whatsNew.title")}</DialogTitle>
          <DialogDescription>{t("onboarding.whatsNew.body", { count: groups.length })}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.id} className="flex items-start gap-3">
              <GroupLine group={g} status={groupStatus(g, seen)} />
            </li>
          ))}
        </ul>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onSkipForever}>{t("onboarding.welcome.skipForever")}</Button>
          <Button variant="outline" onClick={onSkip}>{t("onboarding.whatsNew.later")}</Button>
          <Button onClick={() => onStart(groups)}>{t("onboarding.whatsNew.start")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: TourGroup[];
  seen: Record<string, number>;
  autoShow: boolean;
  onAutoShowChange: (value: boolean) => void;
  onStart: (groups: TourGroup[]) => void;
  /** Mở trang HDSD (nhóm cụ thể hoặc cả trang). Nhóm chỉ có trên app không khoanh được trên web. */
  onOpenManual: (group?: TourGroup) => void;
}

/** Danh sách hướng dẫn: mở từ nút "Hướng dẫn" trên thanh trên cùng và từ Tuỳ chọn, kể cả khi đã bỏ qua vĩnh viễn. */
export function GuidePicker({ open, onOpenChange, groups, seen, autoShow, onAutoShowChange, onStart, onOpenManual }: PickerProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const runnable = (g: TourGroup) => canRun(g, "web");
  const sections = useMemo(
    () => TOUR_ROLES.map((role) => ({ role, groups: groups.filter((g) => g.roles[0] === role) })).filter((s) => s.groups.length),
    [groups],
  );
  const pending = groups.filter((g) => runnable(g) && groupStatus(g, seen) !== "seen");
  const start = (list: TourGroup[]) => {
    setSelected([]);
    onStart(list);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto" data-testid="tour-picker">
        <DialogHeader>
          <DialogTitle>{t("onboarding.picker.title")}</DialogTitle>
          <DialogDescription>{t("onboarding.picker.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {sections.map((s) => (
            <section key={s.role} className="space-y-2">
              {sections.length > 1 && (
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{getRoleLabel(s.role)}</h4>
              )}
              {s.groups.map((g) => (
                <div key={g.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                  {runnable(g) ? (
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.includes(g.id)}
                      onCheckedChange={(v) =>
                        setSelected((cur) => (v ? [...cur, g.id] : cur.filter((x) => x !== g.id)))}
                      aria-label={t(`${TOUR_NS}:groups.${g.id}.title`)}
                    />
                  ) : (
                    <span className="mt-0.5 h-4 w-4" />
                  )}
                  <GroupLine group={g} status={groupStatus(g, seen)} />
                  {runnable(g) ? (
                    <Button size="sm" variant="outline" onClick={() => start([g])}>{t("onboarding.picker.view")}</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => onOpenManual(g)} title={t("onboarding.picker.onlyOnApp")}>
                      {t("onboarding.picker.manual")}
                    </Button>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
          <label htmlFor="tour-auto-show" className="text-sm">{t("onboarding.picker.autoShow")}</label>
          <Switch id="tour-auto-show" checked={autoShow} onCheckedChange={onAutoShowChange} />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" className="sm:mr-auto" onClick={() => onOpenManual()}>
            {t("onboarding.picker.openManual")}
          </Button>
          {pending.length > 0 && (
            <Button variant="outline" onClick={() => start(pending)}>{t("onboarding.picker.viewNew", { count: pending.length })}</Button>
          )}
          <Button
            disabled={selected.length === 0}
            onClick={() => start(groups.filter((g) => selected.includes(g.id)))}
          >
            {t("onboarding.picker.viewSelected", { count: selected.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
