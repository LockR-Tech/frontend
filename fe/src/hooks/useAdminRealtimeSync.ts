import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { baseApi } from "@/stores/baseAPi";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  ADMIN_REALTIME_TOPICS,
  tagsForRealtimeMessage,
  type RealtimeMessage,
} from "@/lib/admin-realtime-tags";

/** Gom tin dồn dập (một đơn đổi nhiều bản ghi, ô tủ đổi liên tục) rồi mới tải lại. */
const FLUSH_DELAY_MS = 800;
/** Tin đến liên tục vẫn tải lại ít nhất mỗi chừng này. */
const MAX_WAIT_MS = 3000;

/**
 * Một kết nối STOMP cho cả web quản trị: nghe mọi topic thay đổi dữ liệu và báo RTK Query tải lại đúng
 * tag. Mọi trang dùng query có tag đó tự cập nhật — không cần tự đăng ký WebSocket hay bấm làm mới.
 * Các vòng polling sẵn có vẫn giữ làm dự phòng khi mất kết nối.
 */
export function useAdminRealtimeSync() {
  const dispatch = useDispatch();
  const { subscribe } = useWebSocket({ autoConnect: true });
  const pendingRef = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPendingAtRef = useRef<number | null>(null);

  useEffect(() => {
    const flush = () => {
      timerRef.current = null;
      firstPendingAtRef.current = null;
      const tags = [...pendingRef.current];
      pendingRef.current.clear();
      if (tags.length === 0) return;
      // Tag theo loại (không id) ⇒ mọi query cung cấp loại đó đều tải lại.
      dispatch(baseApi.util.invalidateTags(tags as never));
    };

    const schedule = (tags: string[]) => {
      if (tags.length === 0) return;
      tags.forEach((tag) => pendingRef.current.add(tag));
      const now = Date.now();
      firstPendingAtRef.current ??= now;
      if (timerRef.current) clearTimeout(timerRef.current);
      const waited = now - firstPendingAtRef.current;
      timerRef.current = setTimeout(flush, Math.max(0, Math.min(FLUSH_DELAY_MS, MAX_WAIT_MS - waited)));
    };

    const subscriptions = ADMIN_REALTIME_TOPICS.map((topic) =>
      subscribe<RealtimeMessage>(topic, (message) => schedule(tagsForRealtimeMessage(topic, message))),
    );

    return () => {
      subscriptions.forEach((sub) => sub?.unsubscribe());
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingRef.current.clear();
    };
  }, [dispatch, subscribe]);
}

export default useAdminRealtimeSync;
