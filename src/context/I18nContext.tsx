// src/context/I18nContext.tsx
// Loads translations from /api/translations at runtime.
// Falls back to English keys if a translation is missing.
// Cross-platform: web, iOS, Android.
import React, {
  createContext, useContext, useState, useEffect,
  useCallback, ReactNode,
} from 'react';
import { translationService } from '../services/api';
import type { Language, TranslationMap } from '../types/api.types';

interface I18nContextValue {
  language:    Language;
  setLanguage: (lang: Language) => void;
  t:           (key: string, params?: Record<string, string>) => string;
  loading:     boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'app_language';

function getStoredLanguage(): Language {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') return stored;
    }
  } catch {}
  return 'es'; // Default to Spanish per the backend's supported languages
}

function storeLanguage(lang: Language) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

// Minimal built-in fallbacks so the UI works even without backend
const FALLBACKS: TranslationMap = {
  'nav.dashboard':    'Dashboard',
  'nav.users':        'Users',
  'nav.recipes':      'Recipes',
  'nav.settings':     'Settings',
  'nav.permissions':  'Permissions',
  'nav.profile':      'Profile',
  'common.save':      'Save',
  'common.cancel':    'Cancel',
  'common.delete':    'Delete',
  'common.edit':      'Edit',
  'common.create':    'Create',
  'common.search':    'Search',
  'common.loading':   'Loading…',
  'common.error':     'An error occurred',
  'common.retry':     'Retry',
  'common.noResults': 'No results found',
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language,     setLangState] = useState<Language>(getStoredLanguage);
  const [translations, setTranslations] = useState<TranslationMap>(FALLBACKS);
  const [loading,      setLoading]   = useState(false);

  const loadTranslations = useCallback(async (lang: Language) => {
    setLoading(true);
    try {
      const map = await translationService.getMap(lang);
      // Merge with fallbacks so built-in keys are always available
      setTranslations({ ...FALLBACKS, ...map });
    } catch {
      // Keep current translations — don't break the app on network error
    } finally {
      setLoading(false);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLangState(lang);
    storeLanguage(lang);
    loadTranslations(lang);
  }, [loadTranslations]);

  useEffect(() => { loadTranslations(language); }, []);

  // Translation function with optional param interpolation
  const t = useCallback((key: string, params?: Record<string, string>): string => {
    let value = translations[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`{{${k}}}`, 'g'), v);
      });
    }
    return value;
  }, [translations]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, loading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
