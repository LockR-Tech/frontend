import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { autoUpdate, computePosition, flip, offset, shift, type Placement } from "@floating-ui/dom";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { OPEN_NAV_EVENT, resolveStep, stepsFor, type TourGroup, type TourPlacement } from "./engine";
import { TOUR_NS } from "./content";

const FIND_TIMEOUT_MS = 1800;
const PAD = 6;
const NARROW = 1024;

type Phase =
  | { kind: "searching" }
  | { kind: "show"; el: Element }
  | { kind: "center"; missing: boolean };

interface Props {
  groups: TourGroup[];
  /** Xem tới bước cuối của một nhóm ⇒ ghi "đã xem" lên máy chủ. */
  onGroupDone: (group: TourGroup) => void;
  /** completed = đi hết mọi nhóm; false = người dùng đóng giữa chừng. */
  onClose: (completed: boolean) => void;
}

function isRendered(el: Element) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function toPlacement(p: TourPlacement | undefined): Placement {
  return !p || p === "auto" ? "bottom" : p;
}

export function TourOverlay({ groups, onGroupDone, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const plan = useMemo(
    () => groups.map((group) => ({ group, steps: stepsFor(group, "web") })).filter((p) => p.steps.length > 0),
    [groups],
  );
  const [pos, setPos] = useState({ gi: 0, si: 0, dir: 1 as 1 | -1 });
  const [phase, setPhase] = useState<Phase>({ kind: "searching" });
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [popXY, setPopXY] = useState<{ x: number; y: number } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  const current = plan[pos.gi];
  const step = current?.steps[pos.si];

  const next = useCallback(() => {
    const g = plan[pos.gi];
    if (!g) return;
    if (pos.si + 1 < g.steps.length) {
      setPos({ gi: pos.gi, si: pos.si + 1, dir: 1 });
      return;
    }
    onGroupDone(g.group);
    if (pos.gi + 1 < plan.length) setPos({ gi: pos.gi + 1, si: 0, dir: 1 });
    else onClose(true);
  }, [plan, pos, onGroupDone, onClose]);

  const prev = useCallback(() => {
    if (pos.si > 0) setPos({ gi: pos.gi, si: pos.si - 1, dir: -1 });
    else if (pos.gi > 0) setPos({ gi: pos.gi - 1, si: plan[pos.gi - 1].steps.length - 1, dir: -1 });
  }, [plan, pos]);

  const isFirst = pos.gi === 0 && pos.si === 0;

  // Mỗi bước: mở đúng trang, mở menu nếu cần, chờ phần tử xuất hiện rồi cuộn tới.
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    let timer = 0;
    setPhase({ kind: "searching" });
    setRect(null);
    setPopXY(null);
    const needsRoute = !!step.webRoute && pathRef.current !== step.webRoute;
    if (needsRoute) navigate(step.webRoute!);
    const started = performance.now();
    let navOpened = false;
    const tick = () => {
      if (cancelled) return;
      if (step.openNav && !navOpened && window.innerWidth < NARROW) {
        window.dispatchEvent(new Event(OPEN_NAV_EVENT));
        navOpened = true;
      }
      if (!step.anchor) {
        setPhase({ kind: "center", missing: false });
        return;
      }
      const el = document.querySelector(`[data-tour="${step.anchor}"]`);
      if (el && isRendered(el)) {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
        setPhase({ kind: "show", el });
        return;
      }
      if (performance.now() - started > FIND_TIMEOUT_MS) {
        const r = resolveStep(step, false);
        if (r === "skip") {
          // Bước "có thể không xuất hiện": bỏ qua lặng lẽ theo hướng đang đi.
          if (pos.dir === -1 && !isFirst) prev();
          else next();
        } else {
          setPhase({ kind: "center", missing: true });
        }
        return;
      }
      timer = window.setTimeout(tick, 100);
    };
    timer = window.setTimeout(tick, needsRoute || step.openNav ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Chỉ chạy lại khi đổi bước; next/prev đọc vị trí hiện tại.
  }, [pos.gi, pos.si]);

  // Bám phần tử khi cuộn / đổi kích thước; ô chú thích tự đổi phía khi thiếu chỗ (flip) và không tràn mép (shift).
  useLayoutEffect(() => {
    if (phase.kind !== "show" || !popRef.current) return;
    const el = phase.el;
    const pop = popRef.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
      void computePosition(el, pop, {
        strategy: "fixed",
        placement: toPlacement(step?.placement),
        middleware: [offset(PAD + 10), flip({ padding: 12 }), shift({ padding: 12 })],
      }).then(({ x, y }) => setPopXY({ x, y }));
    };
    return autoUpdate(el, pop, update);
  }, [phase, step?.placement]);

  useEffect(() => {
    if (phase.kind !== "searching") popRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose(false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [next, prev, onClose]);

  if (!current || !step) return null;
  const centered = phase.kind === "center";
  const lastOfAll = pos.gi === plan.length - 1 && pos.si === current.steps.length - 1;
  const lastOfGroup = pos.si === current.steps.length - 1;
  const titleId = `tour-title-${step.id}`;

  return createPortal(
    <div className="fixed inset-0 z-100" data-testid="tour-overlay">
      {/* Chặn bấm vào trang phía sau; nền tối khi không có phần tử để khoanh. */}
      <div
        className={cn("fixed inset-0", phase.kind !== "show" && "bg-black/55")}
        onClick={(e) => e.stopPropagation()}
        aria-hidden
      />
      {phase.kind === "show" && rect && (
        <div
          className={cn("pointer-events-none fixed rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent",
            !prefersReducedMotion() && "transition-all duration-200")}
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
          aria-hidden
        />
      )}
      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "fixed w-[min(360px,calc(100vw-24px))] rounded-xl border border-border bg-card p-4 text-card-foreground shadow-2xl outline-none",
          phase.kind === "searching" && "invisible",
          centered && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={phase.kind === "show" ? { left: popXY?.x ?? -9999, top: popXY?.y ?? -9999 } : undefined}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
              {t(`${TOUR_NS}:groups.${current.group.id}.title`)}
            </p>
            <h3 id={titleId} className="mt-0.5 text-base font-semibold leading-snug">
              {t(`${TOUR_NS}:steps.${step.id}.title`)}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("onboarding.overlay.close")}
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t(`${TOUR_NS}:steps.${step.id}.body`)}</p>
        {phase.kind === "center" && phase.missing && (
          <p className="mt-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400" data-testid="tour-missing">
            {t("onboarding.overlay.missing")}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {t("onboarding.overlay.progress", {
              step: pos.si + 1,
              steps: current.steps.length,
              group: pos.gi + 1,
              groups: plan.length,
            })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prev} disabled={isFirst}>
              {t("onboarding.overlay.prev")}
            </Button>
            <Button size="sm" onClick={next}>
              {lastOfAll
                ? t("onboarding.overlay.done")
                : lastOfGroup
                  ? t("onboarding.overlay.nextGroup")
                  : t("onboarding.overlay.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
