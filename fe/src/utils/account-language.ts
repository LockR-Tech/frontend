// Ngôn ngữ đi theo tài khoản (F3-G15): web admin và app dùng chung cột `language` của hồ sơ
// (`GET /api/user/profile` trả về, `PUT /api/user/language` ghi). Đổi ngôn ngữ khi đã đăng nhập ⇒ báo server;
// vừa đăng nhập ⇒ dùng ngôn ngữ đã lưu của tài khoản, trừ khi người dùng vừa tự bấm VI/EN ở trang đăng nhập.
import i18n, { currentLanguage, type SupportedLanguage } from "~/utils/i18n";
import { API_BASE_URL } from "~/constants/api-paths";

const CHOSEN_KEY = "lockr.language.chosenBeforeLogin";

function accessToken(): string | null {
  try {
    return localStorage.getItem("accessToken")?.replace(/\s/g, "") || null;
  } catch {
    return null;
  }
}

function asLanguage(value: unknown): SupportedLanguage | null {
  return value === "vi" || value === "en" ? value : null;
}

/** Trang đăng nhập: người dùng tự chọn ngôn ngữ ⇒ lần đăng nhập này giữ lựa chọn đó. */
export function markLanguageChosenBeforeLogin() {
  try {
    sessionStorage.setItem(CHOSEN_KEY, "1");
  } catch {
    /* trình duyệt chặn storage: bỏ qua */
  }
}

function takeChosenBeforeLogin(): boolean {
  try {
    const chosen = sessionStorage.getItem(CHOSEN_KEY) === "1";
    sessionStorage.removeItem(CHOSEN_KEY);
    return chosen;
  } catch {
    return false;
  }
}

/** Báo server ngôn ngữ đang chọn (thư/SMS, app trên máy khác dùng lại). Lỗi mạng bỏ qua. */
export async function syncAccountLanguage(language: SupportedLanguage = currentLanguage()) {
  const token = accessToken();
  if (!token) return;
  try {
    await fetch(`${API_BASE_URL}/api/user/language`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ language }),
    });
  } catch {
    /* lần đổi sau gửi lại */
  }
}

/** Vừa đăng nhập: tài khoản đã có ngôn ngữ khác ⇒ chuyển sang; chưa có / vừa tự chọn ⇒ báo server ngôn ngữ hiện tại. */
export async function adoptAccountLanguage(fetcher: typeof fetch = fetch) {
  const token = accessToken();
  if (!token) return;
  if (!takeChosenBeforeLogin()) {
    try {
      const res = await fetcher(`${API_BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      const account = asLanguage((json?.data ?? json)?.language);
      if (account && account !== currentLanguage()) {
        await i18n.changeLanguage(account);
        return;
      }
    } catch {
      /* không đọc được hồ sơ: giữ ngôn ngữ hiện tại */
    }
  }
  await syncAccountLanguage();
}
