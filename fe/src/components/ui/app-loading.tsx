import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import animationUrl from "~/assets/animations/delivery-loading.json?url";

type LottiePlayer = typeof import("lottie-web/build/player/lottie_light").default;
type AnimationItem = ReturnType<LottiePlayer["loadAnimation"]>;

/// Player (bản light, chỉ SVG — file không dùng expression) và dữ liệu animation chỉ tải một lần,
/// lúc có loading đầu tiên: không làm nặng bundle chính, các lần sau dựng ngay.
let assets: Promise<[LottiePlayer, unknown]> | null = null;
function loadAssets() {
  assets ??= Promise.all([
    import("lottie-web/build/player/lottie_light").then((m) => m.default),
    fetch(animationUrl).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<unknown>;
    }),
  ]).catch((error) => {
    assets = null; // lần sau thử lại
    throw error;
  });
  return assets;
}

interface AppLoadingProps {
  /** Cạnh của animation (px). */
  size?: number;
  /** Chữ dưới animation; không truyền thì chỉ đọc cho trình đọc màn hình. */
  message?: string;
  /** Phủ cả màn hình (mờ nền) — dùng khi chờ route / kiểm tra đăng nhập. */
  fullScreen?: boolean;
  className?: string;
}

/**
 * Loading dùng chung cho web admin: animation giao kiện "Delivery-05" — cùng file Lottie với
 * `AppLoadingIndicator` của app mobile (`mobile/assets/animations/delivery_animation.json`).
 * Người dùng bật giảm chuyển động thì đứng yên ở khung đầu. Tải animation lỗi thì quay về spinner.
 */
export function AppLoading({ size = 96, message, fullScreen = false, className }: AppLoadingProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let animation: AnimationItem | null = null;
    loadAssets()
      .then(([lottie, data]) => {
        if (cancelled || !containerRef.current) return;
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        animation = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: !reduceMotion,
          autoplay: !reduceMotion,
          // lottie ghi đè vào dữ liệu nó nhận — mỗi chỗ loading một bản riêng.
          animationData: structuredClone(data),
          rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
        });
        if (reduceMotion) animation.goToAndStop(0, true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, []);

  const label = message ?? t("common.loading");

  const content = (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-2", !fullScreen && className)}
    >
      {failed ? (
        <Loader2 className="animate-spin text-primary" style={{ width: size / 2.5, height: size / 2.5 }} />
      ) : (
        <div ref={containerRef} aria-hidden style={{ width: size, height: size }} />
      )}
      {message ? (
        <p className={cn("text-center font-medium text-muted-foreground", size >= 96 ? "text-sm" : "text-xs")}>
          {message}
        </p>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );

  if (!fullScreen) return content;
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      {content}
    </div>
  );
}
