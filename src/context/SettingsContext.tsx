// src/context/SettingsContext.tsx
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode,
} from 'react';
import { secureKV } from '../lib/secureKV';

// ─── Storage ──────────────────────────────────────────────────────────────────
const storage = {
  get: (key: string): Promise<string | null> => secureKV.getItemAsync(key),
  set: (key: string, value: string): Promise<void> => secureKV.setItemAsync(key, value),
};

// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
  maintenanceMode:    'settings_maintenance_mode',
  emailNotifications: 'settings_email_notifications',
  debugMode:          'settings_debug_mode',
  rateLimiting:       'settings_rate_limiting',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AppSettings {
  maintenanceMode:    boolean;
  emailNotifications: boolean;
  debugMode:          boolean;
  rateLimiting:       boolean;
}

interface SettingsContextValue extends AppSettings {
  ready:  boolean;
  set:    (key: keyof AppSettings, value: boolean) => Promise<void>;
}

const DEFAULTS: AppSettings = {
  maintenanceMode:    false,
  emailNotifications: true,
  debugMode:          false,
  rateLimiting:       true,
};

// ─── Side effects per toggle ──────────────────────────────────────────────────
// Called whenever a value changes (initial load excluded via `ready` flag).
function applyEffect(key: keyof AppSettings, value: boolean) {
  switch (key) {
    case 'debugMode':
      // Suppress or restore console output based on debug mode
      if (value) {
        // Restore if they were muted
        if ((console as any)._log) { console.log  = (console as any)._log; }
        if ((console as any)._warn){ console.warn = (console as any)._warn; }
      } else {
        // Mute verbose output when debug is off
        if (!(console as any)._log) {
          (console as any)._log  = console.log;
          (console as any)._warn = console.warn;
        }
      }
      break;

    case 'maintenanceMode':
      // Expose on a global so other parts of the app can gate access
      (globalThis as any).__maintenanceMode = value;
      break;

    case 'rateLimiting':
      // Could be used to add/remove rate-limit headers on requests
      (globalThis as any).__rateLimiting = value;
      break;

    case 'emailNotifications':
      // Placeholder — real implementation would call the backend
      (globalThis as any).__emailNotifications = value;
      break;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [ready,    setReady]    = useState(false);

  // Load all from storage on mount, then apply effects
  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        (Object.entries(KEYS) as [keyof AppSettings, string][]).map(async ([key, storageKey]) => {
          const raw   = await storage.get(storageKey);
          const value = raw === null ? DEFAULTS[key] : raw === 'true';
          return [key, value] as [keyof AppSettings, boolean];
        })
      );
      const loaded = Object.fromEntries(entries) as unknown as AppSettings;
      setSettings(loaded);
      // Apply all effects on startup
      (Object.entries(loaded) as [keyof AppSettings, boolean][]).forEach(
        ([k, v]) => applyEffect(k, v)
      );
      setReady(true);
    })();
  }, []);

  const set = useCallback(async (key: keyof AppSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await storage.set(KEYS[key], String(value));
    applyEffect(key, value);
  }, []);

  return (
    <SettingsContext.Provider value={{ ...settings, ready, set }}>
      {children}
    </SettingsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

// ─── Helper for other modules ─────────────────────────────────────────────────
export const isMaintenanceMode    = () => !!(globalThis as any).__maintenanceMode;
export const isRateLimitingEnabled = () => (globalThis as any).__rateLimiting !== false;
export const isEmailNotificationsEnabled = () => (globalThis as any).__emailNotifications !== false;
