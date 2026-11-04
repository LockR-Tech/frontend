import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../../messages/en.json';
import vi from '../../messages/vi.json';

// Ngôn ngữ giao diện hỗ trợ; nhãn hiển thị dùng chung cho Header và LanguageSwitcher.
// ja.json mới dịch khoảng 1/10 số khoá nên chưa đưa vào menu (nửa Nhật nửa Anh).
export const SUPPORTED_LANGUAGES = [
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const resources = {
  en: { translation: en },
  vi: { translation: vi },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    load: 'languageOnly',
    // Người mới vào luôn thấy tiếng Việt; đã chọn ngôn ngữ thì giữ theo localStorage.
    fallbackLng: 'vi',
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false
    }
  });

/** Ngôn ngữ đang thực sự hiển thị (luôn là vi hoặc en). */
export function currentLanguage(instance: typeof i18n = i18n): SupportedLanguage {
  const lng = instance.resolvedLanguage ?? instance.language ?? 'vi';
  const code = lng.split('-')[0];
  return (SUPPORTED_LANGUAGES.find((l) => l.code === code)?.code ?? 'vi') as SupportedLanguage;
}

export default i18n;
