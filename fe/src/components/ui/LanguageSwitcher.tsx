import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, currentLanguage, type SupportedLanguage } from "~/utils/i18n";
import { markLanguageChosenBeforeLogin, syncAccountLanguage } from "~/utils/account-language";

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { i18n } = useTranslation();
  // So sánh với ngôn ngữ đã resolve ("en-US" → "en"), không phải i18n.language thô
  const active = currentLanguage(i18n);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {SUPPORTED_LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => {
            void i18n.changeLanguage(code);
            // Đã đăng nhập ⇒ lưu theo tài khoản; trang đăng nhập ⇒ lần đăng nhập này giữ lựa chọn (F3-G15).
            if (localStorage.getItem("accessToken")) void syncAccountLanguage(code as SupportedLanguage);
            else markLanguageChosenBeforeLogin();
          }}
          className={`px-2 py-1 rounded-md text-sm ${code === active ? "bg-white/10 font-semibold ring-1 ring-current" : "opacity-70 hover:opacity-100"}`}
          aria-pressed={code === active}
          title={label}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
