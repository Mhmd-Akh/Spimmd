import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fa from './translations/fa';
import en from './translations/en';

i18n.use(initReactI18next).init({
  resources: {
    fa: { translation: fa },
    en: { translation: en }
  },
  lng: localStorage.getItem('language') || 'fa',
  fallbackLng: 'fa',
  interpolation: {
    escapeValue: false
  }
});

const savedLang = localStorage.getItem('language') || 'fa';
document.documentElement.dir = savedLang === 'fa' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;

export default i18n;