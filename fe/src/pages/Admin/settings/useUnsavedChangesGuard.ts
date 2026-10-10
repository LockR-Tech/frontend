import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  UNSAFE_NavigationContext,
  parsePath,
  useLocation,
  type To,
} from "react-router-dom";

/**
 * Chặn rời trang trong app khi còn bản nháp chưa lưu, chờ người dùng xác nhận.
 *
 * App dựng bằng <BrowserRouter> (không phải data router) nên `useBlocker` của
 * react-router không dùng được (ném lỗi ngoài data router). Thay vào đó:
 * - Link / navigate(): bọc navigator.push/replace; đổi query trên cùng trang (tab) vẫn cho qua.
 * - Back/Forward: nghe popstate ở capture phase (chạy trước listener của router), chặn
 *   lại, quay về vị trí cũ rồi hỏi; đồng ý thì đi tiếp đúng số bước.
 * Đóng tab / tải lại trang vẫn do `beforeunload` ở trang gọi đảm nhận.
 */
export function useUnsavedChangesGuard(when: boolean) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const location = useLocation();
  // Điều hướng bị hoãn — chạy khi người dùng chọn "Rời trang"
  const [pending, setPending] = useState<(() => void) | null>(null);
  const bypassPopRef = useRef(false);

  useEffect(() => {
    if (!when) return;
    const push = navigator.push;
    const replace = navigator.replace;

    const leavesPage = (to: To) => {
      const target = typeof to === "string" ? parsePath(to) : to;
      return !!target.pathname && target.pathname !== window.location.pathname;
    };

    navigator.push = (...args: Parameters<typeof push>) => {
      if (!leavesPage(args[0])) return push(...args);
      setPending(() => () => push(...args));
    };
    navigator.replace = (...args: Parameters<typeof replace>) => {
      if (!leavesPage(args[0])) return replace(...args);
      setPending(() => () => replace(...args));
    };
    return () => {
      navigator.push = push;
      navigator.replace = replace;
    };
  }, [navigator, when]);

  useEffect(() => {
    if (!when) return;
    // BrowserRouter ghi `idx` vào history.state — dùng để biết Back/Forward bao nhiêu bước
    const currentIdx = (window.history.state as { idx?: unknown } | null)?.idx;

    const onPopState = (event: PopStateEvent) => {
      if (bypassPopRef.current) {
        bypassPopRef.current = false;
        return;
      }
      const nextIdx = (event.state as { idx?: unknown } | null)?.idx;
      if (typeof currentIdx !== "number" || typeof nextIdx !== "number") return;
      const delta = nextIdx - currentIdx;
      if (delta === 0) return;
      // Router không thấy sự kiện này; trả URL về trang hiện tại rồi hỏi
      event.stopImmediatePropagation();
      window.history.go(-delta);
      setPending(() => () => {
        bypassPopRef.current = true;
        window.history.go(delta);
      });
    };

    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, [when, location.key]);

  const proceed = useCallback(() => {
    const go = pending;
    setPending(null);
    go?.();
  }, [pending]);

  const cancel = useCallback(() => setPending(null), []);

  return { blocked: pending != null, proceed, cancel };
}
