import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import ja from '../../messages/ja.json';

// Ngôn ngữ giao diện hỗ trợ; nhãn hiển thị dùng chung cho Header và LanguageSwitcher.
// ja.json thiếu một số khoá (chủ yếu cổng đối tác) — khoá thiếu rơi về tiếng Anh.
export const SUPPORTED_LANGUAGES = [
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const resources = {
  en: { translation: en },
  vi: { translation: vi },
  ja: { translation: ja },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Trình duyệt trả "en-US"/"vi-VN": chỉ lấy phần ngôn ngữ để khớp vi/en/ja
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    load: 'languageOnly',
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false
    }
  });

/** Ngôn ngữ đang thực sự hiển thị (luôn là một trong vi/en/ja). */
export function currentLanguage(instance: typeof i18n = i18n): SupportedLanguage {
  const lng = instance.resolvedLanguage ?? instance.language ?? 'en';
  const code = lng.split('-')[0];
  return (SUPPORTED_LANGUAGES.find((l) => l.code === code)?.code ?? 'en') as SupportedLanguage;
}

export default i18n;
