// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authService, storage, storeTokens, clearTokens, registerAuthExpiredListener } from '../services/api';
import type { ApiUser } from '../types/api.types';

// ─── Superadmin (local offline mode) ─────────────────────────────────────────
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
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
  isLocal?: boolean;
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
  login:         (email: string, password: string) => Promise<void>;
  logout:        () => Promise<void>;
  updateProfile: (updates: Partial<AppUser>) => void;
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

// ─── Stored user key ──────────────────────────────────────────────────────────
const STORED_USER_KEY = 'auth_user';

// ─── Normalize API profile ─────────────────────────────────────────────────────
function normalizeProfile(data: any): AppUser | null {
  if (!data) return null;
  const u = data.user ?? data;
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

async function saveUserToStorage(user: AppUser) {
  try { await storage.setItemAsync(STORED_USER_KEY, JSON.stringify(user)); } catch {}
}

function getStoredUserSync(): AppUser | null {
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

function isSuperAdminRole(role?: string) {
  return role === 'superadmin' || role === 'ADMIN';
}

// ─── Initial state ─────────────────────────────────────────────────────────────
function getInitialState(): AuthState {
  if (Platform.OS === 'web') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const storedUser = getStoredUserSync();
      return {
        user:         storedUser,
        token,
        isLoading:    true,
        isSuperAdmin: isSuperAdminRole(storedUser?.role),
      };
    }
  }
  return { user: null, token: null, isLoading: true, isSuperAdmin: false };
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);

  // Register listener so api.ts can trigger logout on unrecoverable 401
  useEffect(() => {
    registerAuthExpiredListener(async () => {
      await storage.deleteItemAsync(STORED_USER_KEY);
      setState({ user: null, token: null, isLoading: false, isSuperAdmin: false });
      _toast?.error('Session expired', 'Please sign in again.');
    });
  }, []);

  // Bootstrap — verify existing token on app start
  useEffect(() => {
    (async () => {
      try {
        const token = state.token ?? await storage.getItemAsync('auth_token');

        if (!token) {
          setState({ user: null, token: null, isLoading: false, isSuperAdmin: false });
          return;
        }

        if (token === 'local-superadmin-token') {
          setState({ user: SUPERADMIN_USER, token, isLoading: false, isSuperAdmin: true });
          return;
        }

        try {
          const raw     = await authService.getProfile();
          const profile = normalizeProfile(raw);
          if (!profile) throw new Error('Empty profile');

          await saveUserToStorage(profile);
          setState({
            user:         profile,
            token,
            isLoading:    false,
            isSuperAdmin: isSuperAdminRole(profile.role),
          });
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 401) {
            // Refresh already attempted by interceptor — if we're here it failed
            await storage.deleteItemAsync('auth_token');
            await storage.deleteItemAsync(STORED_USER_KEY);
            setState({ user: null, token: null, isLoading: false, isSuperAdmin: false });
          } else {
            // Network/server error — restore cached user
            const fallback = state.user ?? await getStoredUserAsync();
            setState({
              user:         fallback,
              token,
              isLoading:    false,
              isSuperAdmin: isSuperAdminRole(fallback?.role),
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
    // Local superadmin shortcut
    if (email.trim().toLowerCase() === SUPERADMIN_EMAIL && password === SUPERADMIN_PASSWORD) {
      await storage.setItemAsync('auth_token', 'local-superadmin-token');
      await saveUserToStorage(SUPERADMIN_USER);
      setState({ user: SUPERADMIN_USER, token: 'local-superadmin-token', isLoading: false, isSuperAdmin: true });
      return;
    }

    const response = await authService.login({ email: email.trim(), password });
    // authService.login already calls storeTokens internally
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
      isSuperAdmin: isSuperAdminRole(response.user.role),
    });
  };

  const logout = async () => {
    try {
      await clearTokens();
      await storage.deleteItemAsync(STORED_USER_KEY);
    } catch {}
    setState({ user: null, token: null, isLoading: false, isSuperAdmin: false });
    _toast?.info('Signed out', 'Your session has been cleared.');
  };

  // Allows updating the local user state after a profile edit
  const updateProfile = (updates: Partial<AppUser>) => {
    setState(prev => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...updates };
      saveUserToStorage(updated);
      return {
        ...prev,
        user:         updated,
        isSuperAdmin: isSuperAdminRole(updated.role),
      };
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
