import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import ja from '../../messages/ja.json';


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
    fallbackLng: 'en', 
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;