import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PlayCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { getRoleLabel } from "~/constants/roles";
import { useAuth } from "~/context/auth-context";
import { useGetOnboardingStateQuery } from "~/stores/apis/onboardingApi";
import {
  browseGroups,
  groupStatus,
  normalizeRoles,
  runnable,
  stepsFor,
  TOUR_ROLES,
  type TourContent,
  type TourGroup,
} from "~/onboarding/engine";
import { loadTourContent, loadTourTexts, TOUR_NS } from "~/onboarding/content";
import { useTour } from "~/onboarding/useTour";

/** Toạ độ ô khoanh trong ảnh HDSD (scripts/hdsd/capture.mjs ghi cùng ảnh). */
interface HdsdMark {
  n: number;
  stepId: string;
}
interface HdsdMeta {
  image: string;
  width: number;
  height: number;
  marks: HdsdMark[];
}

/** Trang Hướng dẫn sử dụng (HDSD) — dựng từ CÙNG nguồn với hướng dẫn trên màn hình (F3-G13): mỗi nhóm một câu
 *  tóm tắt, ảnh chụp thật có khoanh đỏ + số thứ tự, mỗi số một dòng giải thích. */
export default function GuideManualPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { startGroups } = useTour();
  const location = useLocation();
  const [content, setContent] = useState<TourContent | null>(null);
  const [meta, setMeta] = useState<Record<string, HdsdMeta | null>>({});
  const seen = useGetOnboardingStateQuery(undefined, { skip: !user }).data?.seenGroups ?? {};

  useEffect(() => {
    void Promise.all([loadTourContent(), loadTourTexts(i18n)]).then(([c]) => setContent(c));
  }, [i18n]);

  const groups = useMemo(() => (content ? browseGroups(content, normalizeRoles(user?.role)) : []), [content, user?.role]);

  useEffect(() => {
    // Nhóm noImage không có ảnh (màn hình cần đơn thật ở đúng trạng thái) — không tải.
    groups.filter((g) => !g.noImage).forEach((g) => {
      fetch(`/onboarding/hdsd/${g.id}.json`, { cache: "no-cache" })
        .then((r) => (r.ok ? (r.json() as Promise<HdsdMeta>) : null))
        .catch(() => null)
        .then((m) => setMeta((cur) => ({ ...cur, [g.id]: m })));
    });
  }, [groups]);

  // Mở thẳng một nhóm qua /admin/huong-dan#<nhóm> (từ danh sách hướng dẫn).
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id || !groups.length) return;
    const el = document.getElementById(`hdsd-${id}`);
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [location.hash, groups]);

  const sections = TOUR_ROLES.map((role) => ({ role, groups: groups.filter((g) => g.roles[0] === role) })).filter(
    (s) => s.groups.length > 0,
  );
  // Neo hướng dẫn trên màn hình (F3-G13): nút "Xem trên màn hình" của nhóm đầu tiên chạy được trên web.
  const firstRunnable = sections.flatMap((s) => s.groups).find((g) => runnable(g, "web"))?.id;

  return (
    <div className="space-y-8">
      <div data-tour="guide-header" className="border-b border-border/60 pb-5">
        <h1 className="text-2xl font-bold tracking-tight">{t("onboarding.manual.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("onboarding.manual.subtitle")}</p>
      </div>
      {sections.map((s) => (
        <section key={s.role} className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{getRoleLabel(s.role)}</h2>
          {s.groups.map((g, index) => (
            <GroupManual
              key={g.id}
              first={sections[0] === s && index === 0}
              firstRunnable={g.id === firstRunnable}
              group={g}
              meta={meta[g.id]}
              status={groupStatus(g, seen)}
              onRun={runnable(g, "web") ? () => startGroups([g.id]) : undefined}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function GroupManual({
  group,
  first,
  firstRunnable,
  meta,
  status,
  onRun,
}: {
  group: TourGroup;
  /** Nhóm đầu trang / nhóm đầu tiên có nút "Xem trên màn hình": gắn neo hướng dẫn trên màn hình (F3-G13). */
  first?: boolean;
  firstRunnable?: boolean;
  meta: HdsdMeta | null | undefined;
  status: ReturnType<typeof groupStatus>;
  onRun?: () => void;
}) {
  const { t } = useTranslation();
  const platform = group.steps.some((s) => s.platforms.includes("web"))
    ? "web"
    : group.steps.some((s) => s.platforms.includes("mobile"))
      ? "mobile"
      : "kiosk";
  const own = stepsFor(group, platform);
  // Chưa có file toạ độ: đánh số theo thứ tự các bước có neo (ảnh cũng được vẽ theo thứ tự đó).
  const numberOf = new Map(
    meta ? meta.marks.map((m) => [m.stepId, m.n]) : own.filter((s) => s.anchor).map((s, i) => [s.id, i + 1]),
  );
  const intro = own.filter((s) => !numberOf.has(s.id) && !s.anchor);
  const numbered = own.filter((s) => numberOf.has(s.id)).sort((a, b) => numberOf.get(a.id)! - numberOf.get(b.id)!);
  return (
    <article id={`hdsd-${group.id}`} className="scroll-mt-24 rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div data-tour={first ? "guide-group-head" : undefined} className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{t(`${TOUR_NS}:groups.${group.id}.title`)}</h3>
            <Badge variant="outline">{t(platform === "web" ? "onboarding.manual.onWeb" : platform === "mobile" ? "onboarding.manual.onApp" : "onboarding.manual.onKiosk")}</Badge>
            {status !== "seen" && (
              <Badge>{t(status === "new" ? "onboarding.status.new" : "onboarding.status.updated")}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t(`${TOUR_NS}:groups.${group.id}.summary`)}</p>
        </div>
        {onRun && (
          <Button data-tour={firstRunnable ? "guide-run" : undefined} size="sm" variant="outline" onClick={onRun}>
            <PlayCircle className="mr-1.5 h-4 w-4" />
            {t("onboarding.manual.runOnScreen")}
          </Button>
        )}
      </div>
      {intro.map((s) => (
        <p key={s.id} className="mt-3 text-sm leading-relaxed">
          {t(`${TOUR_NS}:steps.${s.id}.body`)}
        </p>
      ))}
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div data-tour={first ? "guide-image" : undefined} className="min-w-0">
          {meta ? (
            <img
              src={`/onboarding/${meta.image}`}
              alt={t(`${TOUR_NS}:groups.${group.id}.title`)}
              width={meta.width}
              height={meta.height}
              loading="lazy"
              className={platform === "mobile" ? "mx-auto max-h-[640px] w-auto rounded-lg border" : "w-full rounded-lg border"}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(group.noImage ? "onboarding.manual.noImageState" : "onboarding.manual.noImage")}
            </p>
          )}
        </div>
        <ol data-tour={first ? "guide-steps" : undefined} className="space-y-3">
          {numbered.map((s) => (
            <li key={s.id} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                {numberOf.get(s.id)}
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium">{t(`${TOUR_NS}:steps.${s.id}.title`)}</p>
                <p className="text-muted-foreground">{t(`${TOUR_NS}:steps.${s.id}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
