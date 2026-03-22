// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/api';

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORED_USER_KEY = 'auth_user';   // persists last known user profile

const storage = {
  getSync: (key: string): string | null => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return null;
  },
  getItemAsync: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(key));
    return SecureStore.getItemAsync(key);
  },
  setItemAsync: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return Promise.resolve(); }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: (key: string): Promise<void> => {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return Promise.resolve(); }
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── Superadmin ───────────────────────────────────────────────────────────────
const SUPERADMIN_EMAIL    = 'admin@myapp.com';
const SUPERADMIN_PASSWORD = 'superadmin123';

const SUPERADMIN_USER: AppUser = {
  id: 'superadmin-local',
  firstName: 'Super', lastName: 'Admin',
  email: SUPERADMIN_EMAIL, role: 'superadmin', isLocal: true,
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AppUser {
  id: string | number;
  firstName: string; lastName: string;
  email: string; role: string;
  avatar?: string; isLocal?: boolean;
}

export const fullName = (user: AppUser | null) =>
  user ? `${user.firstName} ${user.lastName}`.trim() : '';

interface AuthState {
  user:         AppUser | null;
  token:        string | null;
  isLoading:    boolean;
  isSuperAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Toast bridge ─────────────────────────────────────────────────────────────
type ToastBridge = {
  success: (t: string, m?: string) => void;
  error:   (t: string, m?: string) => void;
  info:    (t: string, m?: string) => void;
};
let _toast: ToastBridge | null = null;
export function registerToastBridge(bridge: ToastBridge) { _toast = bridge; }

// ─── Normalize API profile response ──────────────────────────────────────────
// Different backends may return the user under data.user or directly as data
function normalizeProfile(data: any): AppUser | null {
  if (!data) return null;
  const u = data.user ?? data;   // handle both { user: {...} } and {...}
  if (!u || !u.id) return null;
  return {
    id:        u.id,
    firstName: u.firstName ?? u.first_name  ?? '',
    lastName:  u.lastName  ?? u.last_name   ?? '',
    email:     u.email     ?? '',
    role:      u.role      ?? 'user',
    avatar:    u.avatar    ?? undefined,
  };
}

// ─── Persist / restore last known user ───────────────────────────────────────
async function saveUserToStorage(user: AppUser) {
  try {
    await storage.setItemAsync(STORED_USER_KEY, JSON.stringify(user));
  } catch {}
}

function getStoredUser(): AppUser | null {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(STORED_USER_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return null;
}

async function getStoredUserAsync(): Promise<AppUser | null> {
  try {
    const raw = await storage.getItemAsync(STORED_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

// ─── Initial state — synchronous on web ───────────────────────────────────────
function getInitialState(): AuthState {
  if (Platform.OS === 'web') {
    const token = storage.getSync('auth_token');
    if (token) {
      // Also restore last known user synchronously — no flash of "undefined undefined"
      const storedUser = getStoredUser();
      return {
        user:         storedUser,
        token,
        isLoading:    true,
        isSuperAdmin: storedUser?.role === 'superadmin',
      };
    }
  }
  return { user: null, token: null, isLoading: true, isSuperAdmin: false };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);

  useEffect(() => {
    (async () => {
      try {
        const token = state.token ?? await storage.getItemAsync('auth_token');

        if (!token) {
          setState({ user: null, token: null, isLoading: false, isSuperAdmin: false });
          return;
        }

        // ── Local superadmin ──────────────────────────────────────────────
        if (token === 'local-superadmin-token') {
          setState({ user: SUPERADMIN_USER, token, isLoading: false, isSuperAdmin: true });
          return;
        }

        // ── API session ───────────────────────────────────────────────────
        try {
          const raw     = await authService.getProfile();
          const profile = normalizeProfile(raw);

          if (!profile) throw new Error('Empty profile response');

          // Persist so next refresh can show the real name instantly
          await saveUserToStorage(profile);

          setState({
            user:         profile,
            token,
            isLoading:    false,
            isSuperAdmin: profile.role === 'superadmin' || profile.role === 'ADMIN',
          });
        } catch (error: any) {
          const status = error?.response?.status;

          if (status === 401) {
            // Token invalid — real logout
            await storage.deleteItemAsync('auth_token');
            await storage.deleteItemAsync(STORED_USER_KEY);
            setState({ user: null, token: null, isLoading: false, isSuperAdmin: false });
          } else {
            // Server error / cold start — use stored profile as fallback
            const fallback = state.user ?? await getStoredUserAsync();
            setState({
              user:         fallback,
              token,
              isLoading:    false,
              isSuperAdmin: fallback?.role === 'superadmin' || fallback?.role === 'ADMIN',
            });
          }
        }
      } catch {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    if (email.trim().toLowerCase() === SUPERADMIN_EMAIL && password === SUPERADMIN_PASSWORD) {
      await storage.setItemAsync('auth_token', 'local-superadmin-token');
      await saveUserToStorage(SUPERADMIN_USER);
      setState({ user: SUPERADMIN_USER, token: 'local-superadmin-token', isLoading: false, isSuperAdmin: true });
      return;
    }

    const response = await authService.login({ email, password });
    const appUser: AppUser = {
      id:        response.user.id,
      firstName: response.user.firstName,
      lastName:  response.user.lastName,
      email:     response.user.email,
      role:      response.user.role,
      avatar:    response.user.avatar ?? undefined,
    };

    await saveUserToStorage(appUser);

    setState({
      user:         appUser,
      token:        response.accessToken,
      isLoading:    false,
      isSuperAdmin: response.user.role === 'superadmin' || response.user.role === 'ADMIN',
    });
  };

  const logout = async () => {
    try {
      await storage.deleteItemAsync('auth_token');
      await storage.deleteItemAsync(STORED_USER_KEY);
    } catch {}
    setState({ user: null, token: null, isLoading: false, isSuperAdmin: false });
    _toast?.info('Signed out', 'Your session has been cleared.');
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
