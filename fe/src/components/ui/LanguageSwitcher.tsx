import { useTranslation } from "react-i18next";

const LOCALES = ["en", "vi", "ja"] as const;

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { i18n } = useTranslation();

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => i18n.changeLanguage(l)}
          className={`px-2 py-1 rounded-md text-sm ${l === i18n.language ? "bg-white/10 font-semibold" : "hover:bg-white/5"}`}
          aria-pressed={l === i18n.language}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
