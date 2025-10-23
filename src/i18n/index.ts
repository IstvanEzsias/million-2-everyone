import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en', // Default language
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      // Detection order
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      
      // Keys for detection
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'i18nextLng',
      
      // Cache user language
      caches: ['localStorage'],
      
      // Exclude certain domains
      excludeCacheFor: ['cimode'],
    },

    // Define supported languages
    supportedLngs: ['en', 'sl', 'hu'],
    
    // Load only current language
    load: 'languageOnly',
    
    // Define namespaces
    defaultNS: 'common',
    ns: ['common', 'game', 'profile', 'documentation', 'results'],
  });

export default i18n;