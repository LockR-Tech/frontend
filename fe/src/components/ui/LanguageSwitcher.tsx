import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, currentLanguage } from "~/utils/i18n";

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
          onClick={() => i18n.changeLanguage(code)}
          className={`px-2 py-1 rounded-md text-sm ${code === active ? "bg-white/10 font-semibold" : "hover:bg-white/5"}`}
          aria-pressed={code === active}
          title={label}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
