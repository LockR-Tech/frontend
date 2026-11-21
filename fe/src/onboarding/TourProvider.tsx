import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/context/auth-context";
import {
  useGetOnboardingStateQuery,
  useMarkOnboardingSeenMutation,
  useSetOnboardingAutoShowMutation,
} from "~/stores/apis/onboardingApi";
import {
  AUTO_OPEN_DELAY_MS,
  browseGroups,
  decideAutoOpen,
  normalizeRoles,
  ownGroups,
  type TourContent,
  type TourGroup,
} from "./engine";
import { loadTourContent, loadTourTexts } from "./content";
import { tourSession } from "./session";
import { TourOverlay } from "./TourOverlay";
import { GuidePicker, WelcomeDialog, WhatsNewDialog } from "./OnboardingDialogs";
import { TourContext, type TourApi } from "./useTour";

type Dialog = { kind: "welcome" | "whatsNew"; groups: TourGroup[] } | { kind: "picker" } | null;

/** Hướng dẫn lần đầu trên màn hình cho web admin (F3-G13). Gắn trong AdminLayout: chỉ chạy ở khu làm việc,
 *  sau khi đã đăng nhập xong (web không còn bước bắt buộc nào sau 2FA). */
export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState<TourContent | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [run, setRun] = useState<TourGroup[] | null>(null);
  const stateQ = useGetOnboardingStateQuery(undefined, { skip: !user });
  const [setAutoShowApi] = useSetOnboardingAutoShowMutation();
  const [markSeenApi] = useMarkOnboardingSeenMutation();

  useEffect(() => {
    let alive = true;
    Promise.all([loadTourContent(), loadTourTexts(i18n)])
      .then(([c]) => alive && setContent(c))
      .catch(() => {
        /* không tải được nội dung: không có hướng dẫn, trang vẫn dùng bình thường */
      });
    return () => {
      alive = false;
    };
  }, [i18n]);

  const roles = useMemo(() => normalizeRoles(user?.role), [user?.role]);
  const own = useMemo(() => (content ? ownGroups(content, roles, "web") : []), [content, roles]);
  const browse = useMemo(() => (content ? browseGroups(content, roles) : []), [content, roles]);
  const state = stateQ.data;
  const seen = state?.seenGroups ?? {};
  const userId = user?.id ? String(user.id) : "";

  // Tự mở: một lần mỗi phiên, chậm ~1 giây cho màn hình vẽ xong.
  useEffect(() => {
    if (!userId || !content || !state || dialog || run) return;
    const timer = window.setTimeout(() => {
      const decision = decideAutoOpen({
        signedIn: true,
        inWorkspace: location.pathname.startsWith("/admin"),
        mandatoryDone: true,
        autoShow: state.autoShow,
        sessionSkipped: tourSession.isSkipped(userId),
        shownThisSession: tourSession.wasShown(userId),
        groups: own,
        seen: state.seenGroups,
      });
      if (decision.kind === "none") return;
      tourSession.markShown(userId);
      setDialog({ kind: decision.kind, groups: decision.groups });
    }, AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [userId, content, state, own, dialog, run, location.pathname]);

  const skip = useCallback(() => {
    if (userId) tourSession.markSkipped(userId);
    setDialog(null);
  }, [userId]);

  const skipForever = useCallback(() => {
    setDialog(null);
    void setAutoShowApi(false);
  }, [setAutoShowApi]);

  const start = useCallback((groups: TourGroup[]) => {
    setDialog(null);
    if (groups.length) setRun(groups);
  }, []);

  const onGroupDone = useCallback(
    (g: TourGroup) => {
      void markSeenApi({ group: g.id, version: g.version });
    },
    [markSeenApi],
  );

  const api = useMemo<TourApi>(
    () => ({ openGuide: () => setDialog({ kind: "picker" }), ready: !!content }),
    [content],
  );

  const name = user?.fullName?.trim() || user?.email || "";

  return (
    <TourContext.Provider value={api}>
      {children}
      {dialog?.kind === "welcome" && (
        <WelcomeDialog
          open
          name={name}
          groups={dialog.groups}
          onSkip={skip}
          onSkipForever={skipForever}
          onStart={start}
          onChoose={() => setDialog({ kind: "picker" })}
        />
      )}
      {dialog?.kind === "whatsNew" && (
        <WhatsNewDialog
          open
          groups={dialog.groups}
          seen={seen}
          onSkip={skip}
          onSkipForever={skipForever}
          onStart={start}
        />
      )}
      {dialog?.kind === "picker" && (
        <GuidePicker
          open
          onOpenChange={(v) => !v && setDialog(null)}
          groups={browse}
          seen={seen}
          autoShow={state?.autoShow ?? true}
          onAutoShowChange={(v) => void setAutoShowApi(v)}
          onStart={start}
          onOpenManual={(g) => {
            setDialog(null);
            navigate(`/admin/huong-dan#${g.id}`);
          }}
        />
      )}
      {run && <TourOverlay groups={run} onGroupDone={onGroupDone} onClose={() => setRun(null)} />}
    </TourContext.Provider>
  );
}
