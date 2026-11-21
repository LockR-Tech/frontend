// "Bỏ qua" và "đã tự mở" của hướng dẫn lần đầu chỉ sống trong phiên: sessionStorage (tải lại trang vẫn giữ),
// xoá khi đăng xuất ⇒ đăng nhập lại thì hỏi lại. KHÔNG lưu ở máy chủ.
const PREFIX = "lockr.onboarding.";

function read(key: string): boolean {
  try {
    return sessionStorage.getItem(PREFIX + key) === "1";
  } catch {
    return false;
  }
}

function write(key: string) {
  try {
    sessionStorage.setItem(PREFIX + key, "1");
  } catch {
    /* chế độ riêng tư chặn storage: chỉ mất khả năng nhớ trong phiên */
  }
}

export const tourSession = {
  isSkipped: (userId: string) => read(`skip.${userId}`),
  markSkipped: (userId: string) => write(`skip.${userId}`),
  wasShown: (userId: string) => read(`shown.${userId}`),
  markShown: (userId: string) => write(`shown.${userId}`),
  /** Gọi khi đăng xuất. */
  clear() {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(PREFIX)) sessionStorage.removeItem(k);
      }
    } catch {
      /* bỏ qua */
    }
  },
};
