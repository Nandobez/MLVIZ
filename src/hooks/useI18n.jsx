import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../config/translations';

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState('en');

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'en' ? 'pt' : 'en');
  }, []);

  const t = useCallback((key, fallbackOrReplacements = {}, replacementsMaybe) => {
    const hasFallbackString = typeof fallbackOrReplacements === 'string';
    const fallback = hasFallbackString ? fallbackOrReplacements : undefined;
    const replacements = hasFallbackString
      ? replacementsMaybe || {}
      : fallbackOrReplacements || {};

    let text = translations[language]?.[key] ?? fallback ?? key;

    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(`{${placeholder}}`, value);
    });

    return text;
  }, [language]);

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
