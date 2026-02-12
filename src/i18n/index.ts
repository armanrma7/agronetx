import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'

import en from './locales/en.json'
import hy from './locales/hy.json'
import ru from './locales/ru.json'

const LANGUAGE_KEY = '@agronetx_language'

// Initialize i18n synchronously
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      hy: { translation: hy },
      ru: { translation: ru },
    },
    lng: 'hy', // Default to Armenian
    fallbackLng: ['hy', 'en'], // Fallback chain
    supportedLngs: ['hy', 'en', 'ru'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
    debug: __DEV__, // Enable debug in development
  })

// Load saved language after initialization (non-blocking)
AsyncStorage.getItem(LANGUAGE_KEY)
  .then((savedLanguage) => {
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hy' || savedLanguage === 'ru')) {
      i18n.changeLanguage(savedLanguage)
    }
  })
  .catch(() => {
    // Ignore errors, use default language
  })

// Function to change language
export const changeLanguage = async (lang: 'en' | 'hy' | 'ru') => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang)
    await i18n.changeLanguage(lang)
  } catch (error) {
    console.error('Failed to save language preference:', error)
    i18n.changeLanguage(lang)
  }
}

export default i18n

